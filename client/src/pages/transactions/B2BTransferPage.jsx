import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { transactionApi } from "../../api/transactionApi";
import { recipientApi } from "../../api/recipientApi";
import { walletApi } from "../../api/walletApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { GlobalError } from "../../components/common/FormError";
import TransactionReceipt from "../../components/transaction/TransactionReceipt";
import TransactionFlowLayout from "../../components/transaction/TransactionFlowLayout";
import { formatBDT } from "../../utils/formatCurrency";
import { useAuth } from "../../context/AuthContext";
import { buildRecentCounterpartyFromMiniStatement } from "../../utils/recentCounterpartyFromMiniStatement";
import { mergeRecentWithSavedNicknames } from "../../utils/mergeRecentWithSavedNicknames";

const ACCENT = "#2563EB";

const flowSteps = [
  { key: "recipient", label: "Agent", hint: "Verify receiver" },
  { key: "amount", label: "Amount", hint: "Transfer amount" },
  { key: "review", label: "Confirm", hint: "Verify & enter PIN" },
];

export default function B2BTransferPage() {
  const { user } = useAuth();
  const [step, setStep] = useState("recipient");
  const [form, setForm] = useState({ receiverPhone: "", amount: "", note: "", pin: "" });
  const [recipient, setRecipient] = useState(null);
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const pinInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await walletApi.getBalance();
        setWalletBalance(data.data.balance || 0);
      } catch (e) {
        console.error("Failed to load balance", e);
      }
    })();
  }, []);

  const fetchRecipients = async () => {
    setLoadingContacts(true);
    try {
      const { data } = await recipientApi.getAll();
      const agents = data.data.filter(
        (r) => r.target_type?.toLowerCase() === "agent",
      );
      setSavedRecipients(agents);
    } catch (e) {
      console.error("Failed to load saved agents", e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchRecentRecipients = async () => {
    if (user?.profileId == null) return;
    setLoadingRecent(true);
    try {
      const { data } = await transactionApi.getMiniStatement({ limit: 50 });
      setRecentRecipients(
        buildRecentCounterpartyFromMiniStatement(
          data.data,
          user.profileId,
          "B2B",
        ),
      );
    } catch (e) {
      console.error("Failed to load recent B2B contacts", e);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  useEffect(() => {
    if (user?.profileId == null) return;
    fetchRecentRecipients();
  }, [user?.profileId]);

  const handleLookup = async () => {
    const phoneToLookup = searchQuery.replace(/\D/g, "");
    setLookupError("");
    if (!/^01[3-9][0-9]{8}$/.test(phoneToLookup)) {
      setLookupError("Enter a valid 11-digit mobile number to look up");
      return;
    }
    setLoading(true);
    try {
      const { data } = await transactionApi.lookupRecipient(phoneToLookup);
      const profile = data.data;
      if (profile.typeName !== "AGENT") {
        setLookupError("B2B transfer is only allowed to Agent accounts.");
        setRecipient(null);
        return;
      }
      setRecipient(profile);
      setForm((p) => ({ ...p, receiverPhone: phoneToLookup }));
      setSearchQuery("");
      setStep("amount");
    } catch (error) {
      setLookupError(
        error.response?.data?.message || "No agent found with this phone number.",
      );
      setRecipient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact) => {
    setRecipient({
      fullName: contact.nickname?.trim() || contact.target_name,
      profilePictureUrl: contact.target_profile_picture_url ?? null,
      typeName: "AGENT",
    });
    setForm((p) => ({ ...p, receiverPhone: contact.target_phone }));
    setSearchQuery("");
    setLookupError("");
    setStep("amount");
  };

  const handleSelectRecent = (r) => {
    setRecipient({
      fullName: r.name,
      profilePictureUrl: r.pictureUrl ?? null,
      typeName: "AGENT",
    });
    setForm((p) => ({ ...p, receiverPhone: r.phone }));
    setSearchQuery("");
    setLookupError("");
    setStep("amount");
  };

  const searchTrimmed = searchQuery.trim();
  const searchDigits = searchQuery.replace(/\D/g, "");
  const filteredRecipients = savedRecipients.filter((contact) => {
    if (!searchTrimmed && !searchDigits) return true;
    const q = searchTrimmed.toLowerCase();
    const nameMatch =
      q.length > 0 &&
      (contact.target_name?.toLowerCase().includes(q) ||
        contact.nickname?.toLowerCase().includes(q));
    const phoneNorm = String(contact.target_phone || "").replace(/\D/g, "");
    const phoneMatch = searchDigits.length > 0 && phoneNorm.includes(searchDigits);
    return Boolean(nameMatch || phoneMatch);
  });

  const recentWithNicknames = useMemo(
    () => mergeRecentWithSavedNicknames(recentRecipients, savedRecipients),
    [recentRecipients, savedRecipients],
  );

  const filteredRecent = recentWithNicknames.filter((contact) => {
    if (!searchTrimmed && !searchDigits) return true;
    const q = searchTrimmed.toLowerCase();
    const nameMatch = q.length > 0 && contact.name?.toLowerCase().includes(q);
    const phoneNorm = String(contact.phone || "").replace(/\D/g, "");
    const phoneMatch = searchDigits.length > 0 && phoneNorm.includes(searchDigits);
    return Boolean(nameMatch || phoneMatch);
  });

  const lookupDigits = searchQuery.replace(/\D/g, "");
  const isExactPhoneMatch = /^01[3-9]\d{8}$/.test(lookupDigits);
  const showLookupArrow = isExactPhoneMatch;

  const handleReview = async () => {
    const amountNum = parseFloat(form.amount);
    if (!amountNum || amountNum <= 0) return toast.error("Enter a valid amount");
    if (!recipient) return toast.error("Look up an agent first");

    setLoading(true);
    try {
      const { data } = await transactionApi.preview("B2B", {
        receiverPhone: form.receiverPhone,
        amount: amountNum,
      });
      setPreview(data.data);
      setStep("review");
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } catch (error) {
      toast.error(error.response?.data?.message || "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPin = async () => {
    if (form.pin.length !== 5) return toast.error("PIN must be 5 digits");

    setLoading(true);
    try {
      const { data } = await transactionApi.b2b({
        receiverPhone: form.receiverPhone,
        amount: parseFloat(form.amount),
        pin: form.pin,
        note: form.note || null,
      });
      setReceipt(data.data);
      setStep("receipt");
    } catch (error) {
      toast.error(error.response?.data?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const amountNum = parseFloat(form.amount);
  const hasValidAmount = Number.isFinite(amountNum) && amountNum > 0;
  const amountExceedsBalance = Number.isFinite(amountNum) && amountNum > walletBalance;
  const canProceedAmountStep = !loading && hasValidAmount && !amountExceedsBalance;

  if (step === "receipt" && receipt) {
    return <TransactionReceipt receipt={receipt} />;
  }

  return (
    <TransactionFlowLayout
      icon={ArrowPathIcon}
      title="B2B Float Transfer"
      subtitle="Transfer business float to another verified TekaPakhi Agent."
      steps={flowSteps}
      currentStepKey={step}
    >
      <div className="mb-8 flex items-center gap-4">
        {step !== "recipient" && (
          <button
            type="button"
            onClick={() => {
              if (step === "amount") setStep("recipient");
              if (step === "review") setStep("amount");
              setForm((p) => ({ ...p, pin: "" }));
            }}
            className="-ml-2 rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
        <h2 className="flex-1 text-xl font-bold tracking-tight text-gray-900">
          B2B Transfer
        </h2>
        <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <ArrowPathIcon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      {step === "recipient" && (
        <div className="flex-1 animate-in space-y-6 duration-300 slide-in-from-right-4">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-600" />
            </div>
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => {
                const v = e.target.value
                  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                  .slice(0, 80);
                setSearchQuery(v);
                setLookupError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showLookupArrow) handleLookup();
              }}
              placeholder="Enter name or number"
              className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/30 py-4 pl-12 pr-14 text-[15px] font-bold transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-50"
            />
            {showLookupArrow && (
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={loading}
                className="absolute inset-y-2 right-2 flex w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ArrowRightIcon className="h-5 w-5" strokeWidth={2.5} />
                )}
              </button>
            )}
          </div>

          {lookupError && (
            <GlobalError message={lookupError} onClose={() => setLookupError("")} />
          )}

          <div className="flex-1 space-y-4">
            {(searchTrimmed || searchDigits) && (
              <h3 className="px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Matching contacts
              </h3>
            )}

            {loadingContacts || loadingRecent ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" className="text-gray-300" />
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                <div className="min-w-0 flex-1 sm:pr-3">
                  {!(searchTrimmed || searchDigits) && (
                    <h3 className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
                      Recent
                    </h3>
                  )}
                  <div className="custom-scrollbar max-h-[400px] space-y-2 overflow-y-auto pr-2">
                    {filteredRecent.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => handleSelectRecent(r)}
                        className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-gray-50"
                      >
                        <ProfileAvatar
                          pictureUrl={r.pictureUrl}
                          name={r.name}
                          className="h-12 w-12 text-lg"
                          accentColor={ACCENT}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold text-gray-900">{r.name}</p>
                          <p className="mt-0.5 text-[14px] font-medium text-emerald-600">{r.phone}</p>
                        </div>
                      </button>
                    ))}
                    {filteredRecent.length === 0 && (
                      <p className="px-2 py-6 text-center text-sm font-medium text-gray-400">
                        {recentRecipients.length === 0
                          ? "No recent B2B contacts."
                          : "No recent matches."}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className="h-px w-full shrink-0 bg-slate-100 sm:hidden"
                  aria-hidden
                />
                <div
                  className="hidden w-px shrink-0 self-stretch bg-slate-100 sm:block"
                  aria-hidden
                />

                <div className="min-w-0 flex-1 sm:pl-3">
                  {!(searchTrimmed || searchDigits) && (
                    <h3 className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
                      Saved
                    </h3>
                  )}
                  <div className="custom-scrollbar max-h-[400px] space-y-2 overflow-y-auto pr-2">
                    {filteredRecipients.map((contact) => (
                      <button
                        key={contact.saved_recipient_id || contact.target_phone}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-gray-50"
                      >
                        <ProfileAvatar
                          pictureUrl={contact.target_profile_picture_url}
                          name={contact.nickname || contact.target_name}
                          className="h-12 w-12 text-lg"
                          accentColor={ACCENT}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold text-gray-900">
                            {contact.nickname || contact.target_name}
                          </p>
                          <p className="mt-0.5 text-[14px] font-medium text-emerald-600">
                            {contact.target_phone}
                          </p>
                        </div>
                      </button>
                    ))}
                    {filteredRecipients.length === 0 && (
                      <p className="px-2 py-6 text-center text-sm font-medium text-gray-400">
                        {savedRecipients.length === 0
                          ? "No saved agents yet."
                          : "No saved matches."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "amount" && recipient && (
        <div className="flex flex-1 flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="mb-10 space-y-3 text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Receiver agent
            </p>
            <div className="flex flex-col items-center justify-center gap-2">
              <ProfileAvatar
                pictureUrl={recipient.profilePictureUrl}
                name={recipient.fullName}
                className="h-16 w-16 text-2xl"
                accentColor={ACCENT}
              />
              <div>
                <p className="text-lg font-black text-gray-900">
                  {recipient.fullName} (Agent)
                </p>
                <p className="text-[15px] font-medium text-gray-500">{form.receiverPhone}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4">
            <div className="flex flex-col items-center text-center">
              <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400">
                Amount
              </p>
              <div className="group relative flex items-center justify-center text-primary-600">
                <span className="mr-2 mt-2 text-5xl font-semibold text-gray-500">৳</span>
                <div className="relative inline-flex min-w-[40px]">
                  <span className="invisible whitespace-pre text-6xl font-black">
                    {form.amount || "0"}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setForm((p) => ({ ...p, amount: val }));
                      }
                    }}
                    placeholder="0"
                    className="absolute inset-0 w-full bg-transparent text-left text-6xl font-black text-primary-600 placeholder:text-gray-300 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <p className="mt-6 text-[14px] font-medium text-gray-500">
                Available Balance:
                <span className="ml-1 font-semibold text-gray-900">
                  ৳{walletBalance.toFixed(2)}
                </span>
              </p>
              {amountExceedsBalance && (
                <p className="mt-2 text-sm font-medium text-red-500">Insufficient balance</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleReview}
              disabled={!canProceedAmountStep}
              className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${loading || canProceedAmountStep
                  ? "bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600"
                  : "bg-gray-200 text-gray-400 shadow-none"
                }`}
            >
              {loading ? <LoadingSpinner size="sm" /> : <ArrowRightIcon className="h-6 w-6" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      )}

      {step === "review" && preview && recipient && (
        <div className="flex flex-1 flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="mb-6 flex flex-col items-center gap-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Receiver agent
            </p>
            <div className="flex items-center gap-3">
              <ProfileAvatar
                pictureUrl={recipient.profilePictureUrl}
                name={preview.receiver.name}
                className="h-10 w-10 text-lg"
                accentColor={ACCENT}
              />
              <div className="text-left">
                <p className="text-[15px] font-bold text-gray-900">{preview.receiver.name}</p>
                <p className="text-[13px] font-medium text-gray-500">{form.receiverPhone}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-2">
            <div className="flex items-center justify-between text-[15px]">
              <span className="font-bold text-gray-500">Amount</span>
              <span className="font-black text-gray-900">{formatBDT(preview.amount)}</span>
            </div>
            <div className="flex items-center justify-between text-[15px]">
              <span className="font-bold text-gray-500">Transaction Fee</span>
              <span className="font-black text-gray-900">{formatBDT(preview.fee)}</span>
            </div>
            <div className="my-2 h-px bg-gray-100" />
            <div className="flex items-center justify-between text-lg">
              <span className="font-bold text-gray-500">Total Debit</span>
              <span className="font-black text-primary-600">{formatBDT(preview.totalDebit)}</span>
            </div>
          </div>

          <div className="relative mb-8 mt-8">
            <div className="mb-1 flex items-end justify-between">
              <label className="px-1 text-[12px] font-bold text-gray-500">Note</label>
              <span className="text-[11px] font-bold text-gray-400">{form.note.length}/255</span>
            </div>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value.slice(0, 255) }))}
              placeholder="e.g., Weekly Float"
              className="w-full border-b-2 border-gray-100 bg-transparent py-2 text-[15px] font-medium text-gray-900 placeholder:text-gray-300 transition-colors focus:border-primary-500 focus:outline-none"
              maxLength={255}
            />
          </div>

          <div className="mt-auto flex flex-col items-center">
            <div className="relative flex w-full items-center justify-center">
              <LockClosedIcon
                className="absolute left-4 h-5 w-5 text-primary-600 sm:left-12"
                strokeWidth={2.5}
              />
              <input
                type="password"
                ref={pinInputRef}
                value={form.pin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "").slice(0, 5) }))
                }
                placeholder="Enter PIN"
                className="w-[200px] border-b-2 border-primary-100 bg-transparent py-2 text-center text-lg font-black tracking-[0.5em] text-gray-900 placeholder:text-[15px] placeholder:font-medium placeholder:tracking-normal placeholder:text-gray-300 transition-colors focus:border-primary-600 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && form.pin.length === 5) handleConfirmPin();
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmPin}
            disabled={loading || form.pin.length !== 5}
            className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${loading || form.pin.length === 5
                ? "bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600"
                : "bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200"
              }`}
          >
            {loading ? <LoadingSpinner size="sm" /> : "Confirm Transfer"}
          </button>
        </div>
      )}
    </TransactionFlowLayout>
  );
}

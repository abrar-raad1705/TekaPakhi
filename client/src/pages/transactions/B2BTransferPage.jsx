import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { transactionApi } from "../../api/transactionApi";
import { walletApi } from "../../api/walletApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import { GlobalError } from "../../components/common/FormError";
import TransactionReceipt from "../../components/transaction/TransactionReceipt";
import TransactionFlowLayout from "../../components/transaction/TransactionFlowLayout";
import { formatBDT } from "../../utils/formatCurrency";

const ACCENT = "#2563EB";
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const getAgentDisplayName = (agent) => agent.nickname?.trim() || agent.target_name || "";

const DISTRIBUTOR_FLOW_STEPS = [
  { key: "recipient", label: "Agent", hint: "Verify receiver" },
  { key: "amount", label: "Amount", hint: "Transfer amount" },
  { key: "review", label: "Confirm", hint: "Verify & enter PIN" },
];

const AGENT_FLOW_STEPS = [
  { key: "amount", label: "Amount", hint: "Transfer amount" },
  { key: "review", label: "Confirm", hint: "Verify & enter PIN" },
];

export default function B2BTransferPage() {
  const { user } = useAuth();
  const isAgent = user?.typeName === "AGENT";
  const flowSteps = isAgent ? AGENT_FLOW_STEPS : DISTRIBUTOR_FLOW_STEPS;

  const [step, setStep] = useState(isAgent ? "amount" : "recipient");
  const [form, setForm] = useState({ receiverPhone: "", amount: "", note: "", pin: "" });
  const [recipient, setRecipient] = useState(null);
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const pinInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [connectedAgents, setConnectedAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [loadingDistributor, setLoadingDistributor] = useState(isAgent);

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

  useEffect(() => {
    if (!isAgent) return;
    (async () => {
      try {
        const { data } = await transactionApi.getB2BDistributor();
        const d = data.data;
        setRecipient({
          fullName: d.target_name,
          profilePictureUrl: d.target_profile_picture_url ?? null,
          typeName: "DISTRIBUTOR",
          balance: d.target_balance != null ? parseFloat(d.target_balance) : null,
          maxBalance: d.target_max_balance != null ? parseFloat(d.target_max_balance) : null,
        });
        setForm((p) => ({ ...p, receiverPhone: d.target_phone }));
      } catch (e) {
        console.error("Failed to load connected distributor", e);
        toast.error("Failed to load connected distributor");
      } finally {
        setLoadingDistributor(false);
      }
    })();
  }, [isAgent]);

  const fetchConnectedAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data } = await transactionApi.getB2BAgents();
      setConnectedAgents(data.data || []);
    } catch (e) {
      console.error("Failed to load connected agents", e);
      toast.error("Failed to load connected agents");
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (!isAgent) fetchConnectedAgents();
  }, [isAgent]);

  const handleLookup = async () => {
    const phoneToLookup = searchQuery.replace(/\D/g, "");
    setLookupError("");
    if (!/^01[3-9][0-9]{8}$/.test(phoneToLookup)) {
      setLookupError("Enter a valid 11-digit mobile number to look up");
      return;
    }
    const matchedAgent = connectedAgents.find(
      (agent) => normalizePhone(agent.target_phone) === phoneToLookup,
    );
    if (!matchedAgent) {
      setLookupError("This number is not connected to your distributor account.");
      setRecipient(null);
      return;
    }
    handleSelectAgent(matchedAgent);
  };

  const handleSelectAgent = (contact) => {
    setRecipient({
      fullName: getAgentDisplayName(contact),
      profilePictureUrl: contact.target_profile_picture_url ?? null,
      typeName: "AGENT",
      balance:
        contact.target_balance != null ? parseFloat(contact.target_balance) : null,
      maxBalance:
        contact.target_max_balance != null
          ? parseFloat(contact.target_max_balance)
          : null,
    });
    setForm((p) => ({ ...p, receiverPhone: contact.target_phone }));
    setSearchQuery("");
    setLookupError("");
    setStep("amount");
  };

  const searchTrimmed = searchQuery.trim();
  const searchDigits = searchQuery.replace(/\D/g, "");
  const filteredAgents = useMemo(
    () =>
      connectedAgents.filter((agent) => {
        if (!searchTrimmed && !searchDigits) return true;
        const q = searchTrimmed.toLowerCase();
        const nameMatch =
          q.length > 0 &&
          [getAgentDisplayName(agent), agent.target_name]
            .filter(Boolean)
            .some((name) => name.toLowerCase().includes(q));
        const phoneMatch =
          searchDigits.length > 0 && normalizePhone(agent.target_phone).includes(searchDigits);
        return Boolean(nameMatch || phoneMatch);
      }),
    [connectedAgents, searchDigits, searchTrimmed],
  );

  const lookupDigits = searchQuery.replace(/\D/g, "");
  const exactPhoneAgent = useMemo(() => {
    if (!/^01[3-9]\d{8}$/.test(lookupDigits)) return null;
    return (
      connectedAgents.find((agent) => normalizePhone(agent.target_phone) === lookupDigits) || null
    );
  }, [connectedAgents, lookupDigits]);
  const showLookupArrow = Boolean(exactPhoneAgent);
  const liveLookupError =
    !loadingAgents && /^01[3-9]\d{8}$/.test(lookupDigits) && !exactPhoneAgent
      ? "This number is not connected to your distributor account."
      : "";
  const activeLookupError = lookupError || liveLookupError;

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
      setRecipient((prev) =>
        prev
          ? {
              ...prev,
              balance:
                data.data?.receiver?.balance != null
                  ? parseFloat(data.data.receiver.balance)
                  : prev.balance,
              maxBalance:
                data.data?.receiver?.maxBalance != null
                  ? parseFloat(data.data.receiver.maxBalance)
                  : prev.maxBalance,
            }
          : prev,
      );
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

  if (isAgent && loadingDistributor) {
    return (
      <TransactionFlowLayout
        icon={ArrowPathIcon}
        title="B2B Float Transfer"
        subtitle="Loading your connected distributor..."
        steps={flowSteps}
        currentStepKey={step}
      >
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </TransactionFlowLayout>
    );
  }

  return (
    <TransactionFlowLayout
      icon={ArrowPathIcon}
      title="B2B Float Transfer"
      subtitle={
        isAgent
          ? "Transfer float to your connected distributor."
          : "Transfer business float to one of your connected TekaPakhi agents."
      }
      steps={flowSteps}
      currentStepKey={step}
    >
      <div className="mb-8 flex items-center gap-4">
        {step !== "recipient" && !(isAgent && step === "amount") && (
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

          {activeLookupError && (
            <GlobalError
              message={activeLookupError}
              onClose={() => {
                setLookupError("");
                if (liveLookupError) setSearchQuery("");
              }}
            />
          )}

          <div className="flex-1 space-y-4">
            {(searchTrimmed || searchDigits) && (
              <h3 className="px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Matching agents
              </h3>
            )}

            {loadingAgents ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" className="text-gray-300" />
              </div>
            ) : (
              <div>
                {!(searchTrimmed || searchDigits) && (
                  <h3 className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
                    Agent list
                  </h3>
                )}
                <div className="custom-scrollbar max-h-[420px] space-y-2 overflow-y-auto pr-2">
                  {filteredAgents.map((agent) => (
                    <button
                      key={agent.saved_recipient_id || agent.profile_id || agent.target_phone}
                      type="button"
                      onClick={() => handleSelectAgent(agent)}
                      className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <ProfileAvatar
                        pictureUrl={agent.target_profile_picture_url}
                        name={getAgentDisplayName(agent)}
                        className="h-12 w-12 text-lg"
                        accentColor={ACCENT}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-gray-900">
                          {getAgentDisplayName(agent)}
                        </p>
                        <p className="mt-0.5 text-[14px] font-medium text-emerald-600">
                          {agent.target_phone}
                        </p>
                      </div>
                    </button>
                  ))}
                  {filteredAgents.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm font-medium text-gray-400">
                      {connectedAgents.length === 0
                        ? "No connected agents found."
                        : "No matching agents."}
                    </p>
                  )}
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
              {isAgent ? "Receiver distributor" : "Receiver agent"}
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
                  {recipient.fullName} ({isAgent ? "Distributor" : "Agent"})
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
                <span className="ml-1 font-semibold tabular-nums text-gray-900">
                  {formatBDT(walletBalance)}
                </span>
              </p>
              {!isAgent && (
                <p className="mt-2 text-[14px] font-medium text-gray-500">
                  Agent Balance:
                  <span className="ml-1 font-semibold tabular-nums text-gray-900">
                    {recipient.balance != null ? formatBDT(recipient.balance) : "—"}
                  </span>
                </p>
              )}
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
              {isAgent ? "Receiver distributor" : "Receiver agent"}
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
            {!isAgent && (
              <div className="flex items-center justify-between text-[15px]">
                <span className="font-bold text-gray-500">Agent Balance</span>
                <span className="font-black text-gray-900">
                  {preview.receiver.balance != null ? formatBDT(preview.receiver.balance) : "—"}
                </span>
              </div>
            )}
            <div className="my-2 h-px bg-gray-100" />
            <div className="flex items-center justify-between text-lg">
              <span className="font-bold text-gray-500">Total Debit</span>
              <span className="font-black text-primary-600">{formatBDT(preview.totalDebit)}</span>
            </div>
            {!isAgent && preview.receiver.balanceAfterCredit != null && (
              <div className="flex items-center justify-between text-[15px]">
                <span className="font-bold text-gray-500">Agent Balance After Transfer</span>
                <span className="font-black text-primary-600">
                  {formatBDT(preview.receiver.balanceAfterCredit)}
                </span>
              </div>
            )}
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

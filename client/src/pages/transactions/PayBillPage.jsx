import { useState, useEffect, useMemo, useRef } from "react";
import {
  ReceiptPercentIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  BoltIcon,
  FireIcon,
  BeakerIcon,
  GlobeAltIcon,
  PhoneIcon,
  TvIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  ShieldCheckIcon,
  MapPinIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { profileApi } from "../../api/profileApi";
import { transactionApi } from "../../api/transactionApi";
import { recipientApi } from "../../api/recipientApi";
import { walletApi } from "../../api/walletApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import TransactionReceipt from "../../components/transaction/TransactionReceipt";
import TransactionFlowLayout from "../../components/transaction/TransactionFlowLayout";
import { formatBDT } from "../../utils/formatCurrency";

const ACCENT = "#2563EB";

const BILLER_TYPES = [
  { id: "Electricity", label: "Electricity", icon: BoltIcon, baseBg: "bg-[#eef2ff]", baseIcon: "text-[#4f46e5]", activeBg: "bg-[#4f46e5]", activeIcon: "text-white", activeText: "text-[#4f46e5]" },
  { id: "Gas", label: "Gas", icon: FireIcon, baseBg: "bg-[#fff1f2]", baseIcon: "text-[#e11d48]", activeBg: "bg-[#e11d48]", activeIcon: "text-white", activeText: "text-[#e11d48]" },
  { id: "Water", label: "Water", icon: BeakerIcon, baseBg: "bg-[#eff6ff]", baseIcon: "text-[#2563eb]", activeBg: "bg-[#2563eb]", activeIcon: "text-white", activeText: "text-[#2563eb]" },
  { id: "Internet", label: "Internet", icon: GlobeAltIcon, baseBg: "bg-[#f0fdfa]", baseIcon: "text-[#0d9488]", activeBg: "bg-[#0d9488]", activeIcon: "text-white", activeText: "text-[#0d9488]" },
  { id: "Telephone", label: "Telephone", icon: PhoneIcon, baseBg: "bg-[#ecfdf5]", baseIcon: "text-[#059669]", activeBg: "bg-[#059669]", activeIcon: "text-white", activeText: "text-[#059669]" },
  { id: "TV", label: "TV", icon: TvIcon, baseBg: "bg-[#f5f3ff]", baseIcon: "text-[#7c3aed]", activeBg: "bg-[#7c3aed]", activeIcon: "text-white", activeText: "text-[#7c3aed]" },
  { id: "Credit Card", label: "Credit Card", icon: CreditCardIcon, baseBg: "bg-[#f8fafc]", baseIcon: "text-[#475569]", activeBg: "bg-[#475569]", activeIcon: "text-white", activeText: "text-[#475569]" },
  { id: "Govt. Fees", label: "Govt. Fees", icon: BuildingLibraryIcon, baseBg: "bg-[#faf5ff]", baseIcon: "text-[#9333ea]", activeBg: "bg-[#9333ea]", activeIcon: "text-white", activeText: "text-[#9333ea]" },
  { id: "Insurance", label: "Insurance", icon: ShieldCheckIcon, baseBg: "bg-[#ecfccb]", baseIcon: "text-[#65a30d]", activeBg: "bg-[#65a30d]", activeIcon: "text-white", activeText: "text-[#65a30d]" },
  { id: "Tracker", label: "Tracker", icon: MapPinIcon, baseBg: "bg-[#fff7ed]", baseIcon: "text-[#ea580c]", activeBg: "bg-[#ea580c]", activeIcon: "text-white", activeText: "text-[#ea580c]" },
  { id: "Others", label: "Others", icon: EllipsisHorizontalIcon, baseBg: "bg-[#f1f5f9]", baseIcon: "text-[#64748b]", activeBg: "bg-[#64748b]", activeIcon: "text-white", activeText: "text-[#64748b]" },
];

const flowSteps = [
  { key: "select", label: "Biller", hint: "Choose a service" },
  { key: "bill_info", label: "Bill Details", hint: "Account & contact" },
  { key: "amount", label: "Amount", hint: "Payment amount" },
  { key: "review", label: "Confirm", hint: "Verify & enter PIN" },
];

export default function PayBillPage() {
  const [step, setStep] = useState("select");
  const [billers, setBillers] = useState([]);
  const [savedBillers, setSavedBillers] = useState([]);
  const [selectedBiller, setSelectedBiller] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    accountNo: "",
    contactNo: "",
    pin: "",
  });
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const pinInputRef = useRef(null);
  const [stepError, setStepError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    Promise.all([
      profileApi.getBillers(),
      recipientApi.getAll(),
      walletApi.getBalance().then((r) => r.data.data.balance || 0).catch(() => 0),
    ])
      .then(([billRes, recRes, balance]) => {
        setBillers(billRes.data.data);
        const saved = recRes.data.data.filter(
          (r) => String(r.target_type || "").toUpperCase() === "BILLER",
        );
        setSavedBillers(saved);
        setWalletBalance(typeof balance === "number" ? balance : 0);
      })
      .catch(() => toast.error("Failed to load billers"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBiller = (biller) => {
    if (biller.target_profile_id) {
      const fullBiller = billers.find((b) => b.profile_id === biller.target_profile_id);
      if (fullBiller) {
        setSelectedBiller(fullBiller);
        setStep("bill_info");
        return;
      }
    }
    setSelectedBiller(biller);
    setStep("bill_info");
  };

  const handleBillInfoContinue = () => {
    if (!form.accountNo.trim()) return toast.error("Account number is required");
    if (!/^01[3-9]\d{8}$/.test(form.contactNo)) return toast.error("Valid contact number is required");
    setStep("amount");
  };

  const handleReview = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");

    setSubmitting(true);
    setStepError("");
    try {
      const { data } = await transactionApi.preview("PAY_BILL", {
        receiverPhone: selectedBiller.phone_number,
        amount,
      });
      setPreview(data.data);
      setStep("review");
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } catch (error) {
      const msg = error.response?.data?.message || "Preview failed";
      const code = error.response?.data?.data?.code;
      if (code === "RECEIVER_SUSPENDED" || code === "RECEIVER_BLOCKED") {
        setStepError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPin = async () => {
    if (form.pin.length !== 5) return toast.error("PIN must be 5 digits");

    setSubmitting(true);
    setStepError("");
    try {
      const response = await transactionApi.payBill({
        receiverPhone: selectedBiller.phone_number,
        amount: parseFloat(form.amount),
        pin: form.pin,
        note: null,
        billAccountNumber: form.accountNo,
        billContactNumber: form.contactNo,
      });

      setReceipt(response.data.data);

      const alreadySaved = savedBillers.some((s) => s.target_profile_id === selectedBiller.profile_id);
      if (!alreadySaved) {
        try {
          await recipientApi.create({
            phoneNumber: selectedBiller.phone_number,
            nickname: selectedBiller.service_name,
          });
          const { data: listRes } = await recipientApi.getAll();
          const saved = (listRes.data || []).filter(
            (r) => String(r.target_type || "").toUpperCase() === "BILLER",
          );
          setSavedBillers(saved);
        } catch (e) {
          console.error("Failed to auto-save biller", e);
        }
      }

      setStep("receipt");
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBillers = useMemo(() => {
    let list = billers;
    if (selectedType) {
      list = list.filter((b) => b.biller_type === selectedType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.service_name.toLowerCase().includes(q));
    }
    return list;
  }, [billers, selectedType, search]);

  const filteredMyBillers = useMemo(() => {
    let list = savedBillers;
    if (selectedType) {
      list = list.filter((b) => {
        const fullBiller = billers.find((all) => all.profile_id === b.target_profile_id);
        return fullBiller?.biller_type === selectedType;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => (b.nickname || b.target_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [savedBillers, billers, selectedType, search]);

  const amountNum = parseFloat(form.amount);
  const hasValidAmount = Number.isFinite(amountNum) && amountNum > 0;
  const amountExceedsBalance = Number.isFinite(amountNum) && amountNum > walletBalance;
  const canProceedAmountStep = !submitting && hasValidAmount && !amountExceedsBalance;

  if (step === "receipt" && receipt) {
    return <TransactionReceipt receipt={receipt} />;
  }

  const goBack = () => {
    if (step === "review") {
      setStep("amount");
      setForm((p) => ({ ...p, pin: "" }));
    } else if (step === "amount") setStep("bill_info");
    else if (step === "bill_info") {
      setStep("select");
      setSelectedBiller(null);
    }
  };

  const renderOrganizationGrid = () => (
    <div className="h-full rounded-[2rem] border border-slate-100 bg-white p-7 sm:p-9">
      <h3 className="mb-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
        Organization types
      </h3>
      <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => setSelectedType(null)}
          className="group flex flex-col items-center gap-3"
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] transition-all duration-200 ${
              !selectedType
                ? "scale-[1.05] bg-[#3b82f6] text-white"
                : "bg-slate-50 text-slate-500 group-hover:scale-105 group-hover:bg-slate-100"
            }`}
          >
            <GlobeAltIcon className="h-7 w-7" strokeWidth={2} />
          </div>
          <span
            className={`text-[12px] font-bold tracking-tight transition-colors ${
              !selectedType ? "text-[#3b82f6]" : "text-slate-500"
            }`}
          >
            All
          </span>
        </button>
        {BILLER_TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = selectedType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(isActive ? null : type.id)}
              className="group flex flex-col items-center gap-3"
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] transition-all duration-200 ${
                  isActive
                    ? `scale-[1.05] ${type.activeBg} ${type.activeIcon}`
                    : `${type.baseBg} ${type.baseIcon} group-hover:scale-105 filter group-hover:brightness-95`
                }`}
              >
                <Icon className="h-7 w-7" strokeWidth={2.25} />
              </div>
              <span
                className={`text-[12px] font-bold tracking-tight transition-colors line-clamp-1 break-all ${
                  isActive ? type.activeText : "text-slate-500"
                }`}
              >
                {type.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSelectStep = () => (
    <div className="flex-1 animate-in space-y-6 duration-300 slide-in-from-right-4">
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-primary-600" />
        </div>
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations..."
          className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/30 py-4 pl-12 pr-6 text-[15px] font-bold transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-50"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1 sm:pr-3">
          <h3 className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
            My organizations
          </h3>
          <div className="custom-scrollbar max-h-[400px] space-y-1 overflow-y-auto pr-1">
            {filteredMyBillers.map((b) => (
              <button
                key={b.saved_recipient_id || b.recipient_id || b.target_phone}
                type="button"
                onClick={() => handleSelectBiller(b)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-gray-50"
              >
                <ProfileAvatar
                  pictureUrl={b.target_profile_picture_url}
                  name={b.nickname || b.target_name}
                  className="h-8 w-8 text-sm"
                  accentColor={ACCENT}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-gray-900">
                    {b.nickname || b.target_name}
                  </p>
                </div>
              </button>
            ))}
            {filteredMyBillers.length === 0 && (
              <p className="px-2 py-6 text-center text-sm font-medium text-gray-400">
                No saved organizations match your search.
              </p>
            )}
          </div>
        </div>

        <div className="h-px w-full shrink-0 bg-slate-100 sm:hidden" aria-hidden />
        <div className="hidden w-px shrink-0 self-stretch bg-slate-100 sm:block" aria-hidden />

        <div className="min-w-0 flex-1 sm:pl-3">
          <h3 className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">
            All organizations
          </h3>
          <div className="custom-scrollbar max-h-[400px] space-y-1 overflow-y-auto pr-1">
            {filteredBillers.map((b) => (
              <button
                key={b.profile_id}
                type="button"
                onClick={() => handleSelectBiller(b)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-gray-50"
              >
                <ProfileAvatar
                  pictureUrl={b.profile_picture_url}
                  name={b.service_name}
                  className="h-8 w-8 text-sm"
                  accentColor={ACCENT}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-gray-900">{b.service_name}</p>
                </div>
              </button>
            ))}
            {filteredBillers.length === 0 && (
              <p className="px-2 py-6 text-center text-sm font-medium text-gray-400">
                No organizations found. Try another type or search.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TransactionFlowLayout
      icon={ReceiptPercentIcon}
      title="Pay Bill"
      subtitle="Pay utilities, insurance, and more. Pick a biller, enter the amount, then confirm with your PIN."
      steps={flowSteps}
      currentStepKey={step}
      renderAside={step === "select" ? renderOrganizationGrid : null}
    >
      <div className="mb-8 flex items-center gap-4">
        {step !== "select" && (
          <button
            type="button"
            onClick={goBack}
            className="-ml-2 rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-6 w-6" strokeWidth={2.5} />
          </button>
        )}
        <h2 className="flex-1 text-xl font-bold tracking-tight text-gray-900">Pay Bill</h2>
        <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <ReceiptPercentIcon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[13px] font-bold uppercase tracking-widest text-gray-400">
            Loading billers…
          </p>
        </div>
      ) : (
        <>
          {step === "select" && renderSelectStep()}

          {step === "bill_info" && selectedBiller && (
            <div className="flex flex-1 flex-col animate-in duration-300 slide-in-from-right-4">
              <div className="mb-10 space-y-3 text-center">
                <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">Biller</p>
                <div className="flex flex-col items-center justify-center gap-2">
                  <ProfileAvatar
                    pictureUrl={selectedBiller.profile_picture_url}
                    name={selectedBiller.service_name}
                    className="h-16 w-16 text-2xl"
                    accentColor={ACCENT}
                  />
                  <div>
                    <p className="text-lg font-black text-gray-900">{selectedBiller.service_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col space-y-6 px-1 sm:px-4">
                <div className="space-y-2">
                  <label className="block px-1 text-[12px] font-bold text-gray-500">Account number</label>
                  <input
                    type="text"
                    value={form.accountNo}
                    onChange={(e) => setForm((p) => ({ ...p, accountNo: e.target.value }))}
                    placeholder="Enter account number"
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-5 py-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block px-1 text-[12px] font-bold text-gray-500">Contact number</label>
                  <input
                    type="tel"
                    value={form.contactNo}
                    maxLength={11}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contactNo: e.target.value.replace(/\D/g, "").slice(0, 11) }))
                    }
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/30 px-5 py-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-50"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleBillInfoContinue}
                className="mt-8 flex w-full items-center justify-center rounded-2xl bg-primary-600 py-4 text-[15px] font-black text-white shadow-xl shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.99]"
              >
                <ArrowRightIcon className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {step === "amount" && selectedBiller && (
            <div className="flex flex-1 flex-col animate-in duration-300 slide-in-from-right-4">
              <div className="mb-10 space-y-3 text-center">
                <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">Paying to</p>
                <div className="flex flex-col items-center justify-center gap-2">
                  <ProfileAvatar
                    pictureUrl={selectedBiller.profile_picture_url}
                    name={selectedBiller.service_name}
                    className="h-16 w-16 text-2xl"
                    accentColor={ACCENT}
                  />
                  <div>
                    <p className="text-lg font-black text-gray-900">{selectedBiller.service_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col px-4">
                <div className="flex flex-col items-center text-center">
                  <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400">Amount</p>
                  <div className="group relative flex items-center justify-center text-primary-600">
                    <span className="mr-2 mt-2 text-5xl font-semibold text-gray-500">৳</span>
                    <div className="relative inline-flex min-w-[40px]">
                      <span className="invisible whitespace-pre text-6xl font-black">{form.amount || "0"}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) {
                            setForm((p) => ({ ...p, amount: val }));
                            setStepError("");
                          }
                        }}
                        placeholder="0"
                        className="absolute inset-0 w-full bg-transparent text-left text-6xl font-black text-primary-600 placeholder:text-gray-300 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                  <p className="mt-6 text-[14px] font-medium text-gray-500">
                    Available balance:
                    <span className="ml-1 font-semibold tabular-nums text-gray-900">{formatBDT(walletBalance)}</span>
                  </p>
                  {amountExceedsBalance && (
                    <p className="mt-2 text-sm font-medium text-red-500">Insufficient balance</p>
                  )}
                  {stepError && (
                    <p className="mt-2 text-sm font-medium text-red-500">{stepError}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReview}
                  disabled={!canProceedAmountStep}
                  className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${submitting || canProceedAmountStep
                      ? "bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600"
                      : "bg-gray-200 text-gray-400 shadow-none"
                    }`}
                >
                  {submitting ? <LoadingSpinner size="sm" /> : <ArrowRightIcon className="h-6 w-6" strokeWidth={2.5} />}
                </button>
              </div>
            </div>
          )}

          {step === "review" && preview && selectedBiller && (
            <div className="flex flex-1 flex-col animate-in duration-300 slide-in-from-right-4">
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">Biller</p>
                <ProfileAvatar
                  pictureUrl={selectedBiller.profile_picture_url}
                  name={selectedBiller.service_name}
                  className="h-12 w-12 text-xl"
                  accentColor={ACCENT}
                />
                <p className="text-[15px] font-bold text-gray-900">{selectedBiller.service_name}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/90 px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Bill reference
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Account number</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-900">{form.accountNo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Contact number</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-900">{form.contactNo}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Payment summary
                </p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="font-bold text-gray-500">Bill amount</span>
                    <span className="font-black tabular-nums text-gray-900">{formatBDT(preview.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="font-bold text-gray-500">Fee</span>
                    <span className="font-black tabular-nums text-gray-900">{formatBDT(preview.fee)}</span>
                  </div>
                  <div className="h-px bg-slate-200" />
                  <div className="flex items-center justify-between text-[16px]">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="font-black tabular-nums text-primary-600">{formatBDT(preview.totalDebit)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col items-center pt-6">
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
                disabled={submitting || form.pin.length !== 5}
                className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${submitting || form.pin.length === 5
                    ? "bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600"
                    : "bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200"
                  }`}
              >
                {submitting ? <LoadingSpinner size="sm" /> : "Confirm payment"}
              </button>
            </div>
          )}
        </>
      )}
    </TransactionFlowLayout>
  );
}

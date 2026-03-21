import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  ChevronRightIcon,
  ReceiptPercentIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { profileApi } from "../../api/profileApi";
import { transactionApi } from "../../api/transactionApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ProfileAvatar from "../../components/common/ProfileAvatar";
import PinConfirmModal from "../../components/transaction/PinConfirmModal";
import TransactionReceipt from "../../components/transaction/TransactionReceipt";
import TransactionFlowLayout from "../../components/transaction/TransactionFlowLayout";
import { formatBDT } from "../../utils/formatCurrency";

const ACCENT = "#2563EB";

const flowSteps = [
  { key: "select", label: "Biller", hint: "Choose a service" },
  { key: "form", label: "Amount", hint: "Bill details" },
  { key: "review", label: "Confirm", hint: "Verify & pay" },
];

export default function PayBillPage() {
  const [step, setStep] = useState("select");
  const [billers, setBillers] = useState([]);
  const [selectedBiller, setSelectedBiller] = useState(null);
  const [form, setForm] = useState({ amount: "", note: "" });
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    profileApi
      .getBillers()
      .then((res) => setBillers(res.data.data))
      .catch(() => toast.error("Failed to load billers"))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBiller = (biller) => {
    setSelectedBiller(biller);
    setStep("form");
  };

  const handleReview = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");

    setSubmitting(true);
    try {
      const { data } = await transactionApi.preview("PAY_BILL", {
        receiverPhone: selectedBiller.phone_number,
        amount,
      });
      setPreview(data.data);
      setStep("review");
    } catch (error) {
      toast.error(error.response?.data?.message || "Preview failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPin = async (pin) => {
    setSubmitting(true);
    try {
      const { data } = await transactionApi.payBill({
        receiverPhone: selectedBiller.phone_number,
        amount: parseFloat(form.amount),
        pin,
        note: form.note || null,
      });
      setReceipt(data.data);
      setStep("receipt");
      setPinOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "receipt" && receipt) {
    return <TransactionReceipt receipt={receipt} />;
  }

  const grouped = billers.reduce((acc, b) => {
    const cat = b.category || "Other Services";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  const goBack = () => {
    if (step === "review") setStep("form");
    else if (step === "form") {
      setStep("select");
      setSelectedBiller(null);
      setForm({ amount: "", note: "" });
    }
  };

  return (
    <>
      <TransactionFlowLayout
        icon={ReceiptPercentIcon}
        title="Pay Bill"
        subtitle="Pay utilities, insurance, and more. Pick a biller, enter the amount, then confirm with your PIN. Encrypted and posted immediately."
        steps={flowSteps}
        currentStepKey={step}
      >
        <div className="mb-6 flex items-center gap-4 sm:mb-8">
          {step !== "select" && (
            <button
              type="button"
              onClick={goBack}
              className="-ml-2 rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-6 w-6" strokeWidth={2.5} />
            </button>
          )}
          <h2 className="flex-1 text-xl font-bold tracking-tight text-gray-900">
            Pay Bill
          </h2>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <ReceiptPercentIcon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>

        {step === "select" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-[15px] font-bold text-gray-400">
                  Loading billers...
                </p>
              </div>
            ) : billers.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-100 p-10 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                  <DocumentTextIcon
                    className="h-8 w-8 text-gray-200"
                    strokeWidth={1}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No billers found
                </h3>
                <p className="mt-2 text-[15px] font-medium text-gray-400">
                  Billers will appear here once they are added to the platform.
                </p>
              </div>
            ) : (
              <div className="max-h-[min(520px,58vh)] space-y-8 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="px-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {items.map((biller) => (
                        <button
                          key={biller.profile_id}
                          type="button"
                          onClick={() => handleSelectBiller(biller)}
                          className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/30 p-4 text-left transition-all duration-200 hover:border-primary-200 hover:bg-primary-50/30 active:scale-[0.99]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ProfileAvatar
                              pictureUrl={biller.profile_picture_url}
                              name={biller.service_name}
                              className="h-12 w-12 shrink-0 rounded-xl text-lg ring-0"
                              accentColor={ACCENT}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[15px] font-bold text-gray-900">
                                {biller.service_name}
                              </p>
                              <p className="mt-0.5 text-[13px] font-medium text-gray-400">
                                {biller.biller_code}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 rounded-full bg-gray-50 p-2 text-gray-300 transition-all group-hover:bg-primary-100 group-hover:text-primary-600">
                            <ChevronRightIcon className="h-4 w-4" strokeWidth={3} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "form" && selectedBiller && (
          <div className="animate-in space-y-8 duration-300 slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary-100/50 bg-primary-50/50 p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar
                  pictureUrl={selectedBiller.profile_picture_url}
                  name={selectedBiller.service_name}
                  className="h-12 w-12 shrink-0 text-lg"
                  accentColor={ACCENT}
                />
                <div className="min-w-0">
                  <p className="text-[15px] font-black text-gray-900">
                    {selectedBiller.service_name}
                  </p>
                  <p className="text-[13px] font-bold text-primary-600">
                    {selectedBiller.biller_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setSelectedBiller(null);
                }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-bold text-gray-400 underline decoration-gray-200 underline-offset-4 transition-all hover:bg-white hover:text-primary-600"
              >
                Change
              </button>
            </div>

            <div className="space-y-3">
              <label className="block px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Bill Amount
              </label>
              <div className="group relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400 transition-colors group-focus-within:text-primary-600">
                  ৳
                </span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-2xl border-2 border-gray-100 py-5 pl-12 pr-4 text-2xl font-black transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Reference / Account Number (Optional)
              </label>
              <input
                type="text"
                value={form.note}
                onChange={(e) =>
                  setForm((p) => ({ ...p, note: e.target.value }))
                }
                placeholder="e.g., DSL12345678"
                className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                maxLength={255}
              />
            </div>

            <button
              type="button"
              onClick={handleReview}
              disabled={submitting || !form.amount}
              className="flex w-full items-center justify-center rounded-2xl bg-primary-600 py-5 text-base font-black text-white shadow-xl shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Review Bill Payment"
              )}
            </button>
          </div>
        )}

        {step === "review" && preview && selectedBiller && (
          <div className="animate-in space-y-10 duration-300 zoom-in-95">
            <div className="text-center">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                Total Bill Payment
              </p>
              <p className="text-5xl font-black tracking-tight text-gray-900">
                {formatBDT(preview.amount)}
              </p>
            </div>

            <div className="space-y-4 rounded-3xl bg-gray-50/50 p-8">
              <div className="flex items-center justify-between gap-3 text-[15px]">
                <span className="font-bold text-gray-400">Biller</span>
                <span className="flex min-w-0 items-center gap-2">
                  <ProfileAvatar
                    pictureUrl={selectedBiller.profile_picture_url}
                    name={selectedBiller.service_name}
                    className="h-9 w-9 text-sm"
                    accentColor={ACCENT}
                  />
                  <span className="truncate font-black text-gray-900">
                    {selectedBiller.service_name}
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[15px]">
                <span className="font-bold text-gray-400">Transaction Fee</span>
                <span className="font-black text-gray-900">
                  {formatBDT(preview.fee)}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-lg">
                <span className="font-black text-gray-400">Total Debit</span>
                <span className="font-black text-primary-600">
                  {formatBDT(preview.totalDebit)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 py-4 text-[15px] font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
                Edit Details
              </button>
              <button
                type="button"
                onClick={() => setPinOpen(true)}
                className="flex-1 rounded-2xl bg-primary-600 py-4 text-[15px] font-black text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </TransactionFlowLayout>

      <PinConfirmModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={handleConfirmPin}
        loading={submitting}
      />
    </>
  );
}

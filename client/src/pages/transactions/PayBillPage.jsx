import { useState, useEffect } from 'react';
import { profileApi } from '../../api/profileApi';
import { transactionApi } from '../../api/transactionApi';
import Header from '../../components/layout/Header';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinConfirmModal from '../../components/transaction/PinConfirmModal';
import TransactionReceipt from '../../components/transaction/TransactionReceipt';
import { formatBDT } from '../../utils/formatCurrency';

export default function PayBillPage() {
  const [step, setStep] = useState('select'); // select → form → review → pin → receipt
  const [billers, setBillers] = useState([]);
  const [selectedBiller, setSelectedBiller] = useState(null);
  const [form, setForm] = useState({ amount: '', note: '' });
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    profileApi.getBillers()
      .then((res) => setBillers(res.data.data))
      .catch(() => toast.error('Failed to load billers'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBiller = (biller) => {
    setSelectedBiller(biller);
    setStep('form');
  };

  const handleReview = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');

    setSubmitting(true);
    try {
      const { data } = await transactionApi.preview('PAY_BILL', {
        receiverPhone: selectedBiller.phone_number,
        amount,
      });
      setPreview(data.data);
      setStep('review');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview failed');
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
      setStep('receipt');
      setPinOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'receipt' && receipt) {
    return <TransactionReceipt receipt={receipt} />;
  }

  // Group billers by category
  const grouped = billers.reduce((acc, b) => {
    const cat = b.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header title="Pay Bill" showBack />
      <PinConfirmModal isOpen={pinOpen} onClose={() => setPinOpen(false)} onConfirm={handleConfirmPin} loading={submitting} />

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Step 1: Select Biller */}
        {step === 'select' && (
          <div>
            {loading ? (
              <LoadingSpinner size="lg" className="py-24" />
            ) : billers.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-gray-600">No billers available</p>
                <p className="mt-1 text-xs text-gray-400">Billers will appear here when added by the platform admin.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{category}</h2>
                    <div className="space-y-2">
                      {items.map((biller) => (
                        <button
                          key={biller.profile_id}
                          onClick={() => handleSelectBiller(biller)}
                          className="flex w-full items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-600">
                            {biller.service_name[0]}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-900">{biller.service_name}</p>
                            <p className="text-xs text-gray-500">{biller.full_name} &middot; {biller.biller_code}</p>
                          </div>
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter Amount */}
        {step === 'form' && selectedBiller && (
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            {/* Selected biller info */}
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-base font-bold text-green-600">
                {selectedBiller.service_name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedBiller.service_name}</p>
                <p className="text-xs text-gray-500">{selectedBiller.biller_code}</p>
              </div>
              <button onClick={() => { setStep('select'); setSelectedBiller(null); }}
                className="ml-auto text-xs font-medium text-green-600 hover:text-green-700">
                Change
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bill Amount (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">৳</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-lg font-semibold focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reference / Account No. (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Bill account number or reference"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                maxLength={255}
              />
            </div>

            <button onClick={handleReview} disabled={submitting}
              className="flex w-full items-center justify-center rounded-lg bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
              {submitting ? <LoadingSpinner size="sm" /> : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && preview && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4 text-center">
                <p className="text-sm text-gray-500">Pay Bill — {selectedBiller.service_name}</p>
                <p className="text-3xl font-bold text-gray-900">{formatBDT(preview.amount)}</p>
              </div>
              <div className="divide-y divide-gray-100 px-5">
                <div className="flex justify-between py-3">
                  <span className="text-sm text-gray-500">Fee</span>
                  <span className="text-sm font-medium text-gray-800">{formatBDT(preview.fee)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-sm text-gray-500">Total Debit</span>
                  <span className="text-sm font-bold text-gray-900">{formatBDT(preview.totalDebit)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Back
              </button>
              <button onClick={() => setPinOpen(true)} className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700">
                Confirm & Pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

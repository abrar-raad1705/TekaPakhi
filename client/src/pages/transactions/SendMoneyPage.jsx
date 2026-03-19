import { useState } from 'react';
import { transactionApi } from '../../api/transactionApi';
import Header from '../../components/layout/Header';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinConfirmModal from '../../components/transaction/PinConfirmModal';
import TransactionReceipt from '../../components/transaction/TransactionReceipt';
import { formatBDT } from '../../utils/formatCurrency';

export default function SendMoneyPage() {
  const [step, setStep] = useState('form'); // form → review → pin → receipt
  const [form, setForm] = useState({ receiverPhone: '', amount: '', note: '' });
  const [recipient, setRecipient] = useState(null);
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const handleLookup = async () => {
    if (!/^01[3-9][0-9]{8}$/.test(form.receiverPhone)) {
      return toast.error('Enter a valid phone number');
    }
    setLoading(true);
    try {
      const { data } = await transactionApi.lookupRecipient(form.receiverPhone);
      setRecipient(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Recipient not found');
      setRecipient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (!recipient) return toast.error('Look up a recipient first');

    setLoading(true);
    try {
      const { data } = await transactionApi.preview('SEND_MONEY', {
        receiverPhone: form.receiverPhone, amount,
      });
      setPreview(data.data);
      setStep('review');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPin = async (pin) => {
    setLoading(true);
    try {
      const { data } = await transactionApi.sendMoney({
        receiverPhone: form.receiverPhone,
        amount: parseFloat(form.amount),
        pin,
        note: form.note || null,
      });
      setReceipt(data.data);
      setStep('receipt');
      setPinOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'receipt' && receipt) {
    return <TransactionReceipt receipt={receipt} />;
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header title="Send Money" showBack />
      <PinConfirmModal isOpen={pinOpen} onClose={() => setPinOpen(false)} onConfirm={handleConfirmPin} loading={loading} />

      <div className="mx-auto max-w-md px-4 py-4">
        {step === 'form' && (
          <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
            {/* Recipient */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Recipient Phone</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">+88</span>
                  <input
                    type="tel"
                    value={form.receiverPhone}
                    onChange={(e) => { setForm(p => ({ ...p, receiverPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })); setRecipient(null); }}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <button onClick={handleLookup} disabled={loading} className="shrink-0 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                  {loading ? '...' : 'Find'}
                </button>
              </div>
              {recipient && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">{recipient.fullName}</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Amount (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">৳</span>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-lg font-semibold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="What's this for?"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                maxLength={255}
              />
            </div>

            <button onClick={handleReview} disabled={!recipient || loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50">
              {loading ? <LoadingSpinner size="sm" /> : 'Continue'}
            </button>
          </div>
        )}

        {step === 'review' && preview && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4 text-center">
                <p className="text-sm text-gray-500">Sending</p>
                <p className="text-3xl font-bold text-gray-900">{formatBDT(preview.amount)}</p>
                <p className="mt-1 text-sm text-gray-500">to <span className="font-medium text-gray-700">{preview.receiver.name}</span></p>
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
              <button onClick={() => setPinOpen(true)} className="flex-1 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700">
                Confirm & Pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

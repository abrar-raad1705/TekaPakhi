import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, PlusCircleIcon, ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { transactionApi } from '../../api/transactionApi';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinConfirmModal from '../../components/transaction/PinConfirmModal';
import TransactionReceipt from '../../components/transaction/TransactionReceipt';
import { formatBDT } from '../../utils/formatCurrency';

export default function CashInPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form');
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
      const profile = data.data;
      if (profile.typeName !== 'CUSTOMER') {
        toast.error('Cash In is only for Customer accounts');
        setRecipient(null);
        return;
      }
      setRecipient(profile);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Customer not found');
      setRecipient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');
    if (!recipient) return toast.error('Look up a customer first');

    setLoading(true);
    try {
      const { data } = await transactionApi.preview('CASH_IN', {
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
      const { data } = await transactionApi.cashIn({
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
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          
          {/* Left Column: Info & Context */}
          <div className="lg:col-span-5 space-y-8 animate-in slide-in-from-left-4 duration-700">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm">
                <PlusCircleIcon className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Cash In</h1>
              <p className="mt-4 text-lg font-medium text-gray-500 leading-relaxed">
                Add funds to a customer's wallet instantly. Verify the customer phone number and confirm the cash amount received.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-primary-50 bg-primary-50/30 p-5">
                <InformationCircleIcon className="h-6 w-6 shrink-0 text-primary-500" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-primary-900 uppercase tracking-wider mb-1">Agent Service</p>
                  <p className="text-[15px] font-medium text-primary-800 opacity-80">This service is exclusively for Agents to provide cash-in facilities to TekaPakhi customers.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Transaction Form */}
          <div className="lg:col-span-7 animate-in slide-in-from-right-4 duration-700">
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
              
              {step === 'form' && (
                <div className="space-y-8">
                  {/* Recipient Input */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 px-1">Customer Phone Number</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1 group">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-gray-400 transition-colors group-focus-within:text-primary-600">
                          +88
                        </span>
                        <input
                          type="tel"
                          value={form.receiverPhone}
                          onChange={(e) => { 
                            setForm(p => ({ ...p, receiverPhone: e.target.value.replace(/\D/g, '').slice(0, 11) })); 
                            setRecipient(null); 
                          }}
                          placeholder="01XXXXXXXXX"
                          className="w-full rounded-2xl border-2 border-gray-100 py-4 pl-14 pr-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                        />
                      </div>
                      <button 
                        onClick={handleLookup} 
                        disabled={loading || form.receiverPhone.length < 11} 
                        className="sm:px-8 py-4 rounded-2xl bg-gray-900 text-[15px] font-bold text-white transition-all hover:bg-black active:scale-[0.98] disabled:opacity-30"
                      >
                        {loading ? '...' : 'Verify'}
                      </button>
                    </div>
                    {recipient && (
                      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 border border-emerald-100 animate-in zoom-in-95 duration-300">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                          <CheckIcon className="h-4 w-4 text-white" strokeWidth={3} />
                        </div>
                        <span className="text-[15px] font-bold text-emerald-700">{recipient.fullName}</span>
                      </div>
                    )}
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 px-1">Amount to Cash In</label>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400 transition-colors group-focus-within:text-primary-600">
                        ৳
                      </span>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-2xl border-2 border-gray-100 py-5 pl-12 pr-4 text-2xl font-black transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Note Input */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 px-1">Short Description (Optional)</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="e.g., Cash deposit"
                      className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                      maxLength={255}
                    />
                  </div>

                  <button 
                    onClick={handleReview} 
                    disabled={!recipient || loading || !form.amount}
                    className="flex w-full items-center justify-center rounded-2xl bg-primary-600 py-5 text-base font-black text-white shadow-xl shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Review Cash In'}
                  </button>
                </div>
              )}

              {step === 'review' && preview && (
                <div className="space-y-10 animate-in zoom-in-95 duration-300">
                  <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Total Amount to Cash In</p>
                    <p className="text-5xl font-black tracking-tight text-gray-900">{formatBDT(preview.amount)}</p>
                  </div>

                  <div className="space-y-4 rounded-3xl bg-gray-50/50 p-8">
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="font-bold text-gray-400">Customer</span>
                      <span className="font-black text-gray-900">{preview.receiver.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="font-bold text-gray-400">Transaction Fee</span>
                      <span className="font-black text-gray-900">{formatBDT(preview.fee)}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-black text-gray-400">Total Debit</span>
                      <span className="font-black text-primary-600">{formatBDT(preview.totalDebit)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => setStep('form')} 
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 py-4 text-[15px] font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
                    >
                      <ArrowLeftIcon className="h-5 w-5" strokeWidth={2} />
                      Edit Details
                    </button>
                    <button 
                      onClick={() => setPinOpen(true)} 
                      className="flex-1 rounded-2xl bg-primary-600 py-4 text-[15px] font-black text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]"
                    >
                      Confirm Cash In
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PinConfirmModal 
        isOpen={pinOpen} 
        onClose={() => setPinOpen(false)} 
        onConfirm={handleConfirmPin} 
        loading={loading} 
      />
    </div>
  );
}

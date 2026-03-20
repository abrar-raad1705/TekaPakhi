import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DocumentTextIcon, 
  ChevronRightIcon, 
  WalletIcon, 
  ArrowLeftIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { profileApi } from '../../api/profileApi';
import { transactionApi } from '../../api/transactionApi';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinConfirmModal from '../../components/transaction/PinConfirmModal';
import TransactionReceipt from '../../components/transaction/TransactionReceipt';
import { formatBDT } from '../../utils/formatCurrency';

export default function PayBillPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select'); // select → form → review → receipt
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
    const cat = b.category || 'Other Services';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          
          {/* Left Column: Info & Context */}
          <div className="lg:col-span-4 space-y-8 animate-in slide-in-from-left-4 duration-700 lg:sticky lg:top-24 h-fit">
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm">
                <WalletIcon className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Pay Bill</h1>
              <p className="mt-4 text-lg font-medium text-gray-500 leading-relaxed">
                Pay your utility bills, insurance, and other services instantly. Select a biller and enter your details to proceed.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl border border-primary-50 bg-primary-50/30 p-5">
                <InformationCircleIcon className="h-6 w-6 shrink-0 text-primary-500" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-primary-900 uppercase tracking-wider mb-1">Secure Payments</p>
                  <p className="text-[15px] font-medium text-primary-800 opacity-80">All payments are encrypted and processed immediately with the service provider.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Biller Selection or Form */}
          <div className="lg:col-span-8 animate-in slide-in-from-right-4 duration-700">
            {step === 'select' && (
              <div className="space-y-8">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-[15px] font-bold text-gray-400">Loading billers...</p>
                  </div>
                ) : billers.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-gray-100 p-12 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
                      <DocumentTextIcon className="h-10 w-10 text-gray-200" strokeWidth={1} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No billers found</h3>
                    <p className="mt-2 text-[15px] font-medium text-gray-400">Billers will appear here once they are added to the platform.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {Object.entries(grouped).map(([category, items]) => (
                      <div key={category} className="space-y-4">
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">{category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map((biller) => (
                            <button
                              key={biller.profile_id}
                              onClick={() => handleSelectBiller(biller)}
                              className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 text-left transition-all duration-200 hover:border-primary-200 hover:bg-primary-50/30 active:scale-[0.99] hover:shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-xl font-black text-gray-400 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                  {biller.service_name[0]}
                                </div>
                                <div>
                                  <p className="text-[15px] font-bold text-gray-900">{biller.service_name}</p>
                                  <p className="text-[13px] font-medium text-gray-400 mt-0.5">{biller.biller_code}</p>
                                </div>
                              </div>
                              <div className="rounded-full bg-gray-50 p-2 text-gray-300 group-hover:bg-primary-100 group-hover:text-primary-600 transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
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

            {(step === 'form' || step === 'review') && (
              <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/50">
                {step === 'form' && selectedBiller && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
                    {/* Selected Biller Summary Card */}
                    <div className="flex items-center justify-between rounded-2xl bg-primary-50/50 p-5 border border-primary-100/50">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-xl font-black text-white">
                          {selectedBiller.service_name[0]}
                        </div>
                        <div>
                          <p className="text-[15px] font-black text-gray-900">{selectedBiller.service_name}</p>
                          <p className="text-[13px] font-bold text-primary-600">{selectedBiller.biller_code}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setStep('select'); setSelectedBiller(null); }}
                        className="text-[13px] font-bold text-gray-400 hover:text-primary-600 px-3 py-1.5 rounded-lg hover:bg-white transition-all underline decoration-gray-200 underline-offset-4"
                      >
                        Change
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 px-1">Bill Amount</label>
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

                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 px-1">Reference / Account Number (Optional)</label>
                      <input
                        type="text"
                        value={form.note}
                        onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                        placeholder="e.g., DSL12345678"
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-[15px] font-bold transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-50"
                        maxLength={255}
                      />
                    </div>

                    <button 
                      onClick={handleReview} 
                      disabled={submitting || !form.amount}
                      className="flex w-full items-center justify-center rounded-2xl bg-primary-600 py-5 text-base font-black text-white shadow-xl shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.99] disabled:opacity-50"
                    >
                      {submitting ? <LoadingSpinner size="sm" /> : 'Review Bill Payment'}
                    </button>
                  </div>
                )}

                {step === 'review' && preview && (
                  <div className="space-y-10 animate-in zoom-in-95 duration-300">
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Total Bill Payment</p>
                      <p className="text-5xl font-black tracking-tight text-gray-900">{formatBDT(preview.amount)}</p>
                    </div>

                    <div className="space-y-4 rounded-3xl bg-gray-50/50 p-8">
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="font-bold text-gray-400">Biller</span>
                        <span className="font-black text-gray-900">{selectedBiller.service_name}</span>
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
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <PinConfirmModal 
        isOpen={pinOpen} 
        onClose={() => setPinOpen(false)} 
        onConfirm={handleConfirmPin} 
        loading={submitting} 
      />
    </div>
  );
}

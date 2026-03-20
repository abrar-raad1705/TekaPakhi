import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { transactionApi } from '../../api/transactionApi';
import { recipientApi } from '../../api/recipientApi';
import { walletApi } from '../../api/walletApi';
import { toast } from 'sonner';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TransactionReceipt from '../../components/transaction/TransactionReceipt';
import { GlobalError } from '../../components/common/FormError';
import { formatBDT } from '../../utils/formatCurrency';

export default function SendMoneyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('recipient'); // recipient → amount → review → receipt
  const [form, setForm] = useState({ receiverPhone: '', amount: '', note: '', pin: '' });
  const [recipient, setRecipient] = useState(null);

  // Step 1: Recipient Search
  const [searchQuery, setSearchQuery] = useState('');
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Step 2: Amount
  const [walletBalance, setWalletBalance] = useState(0);
  const [isCashOutChargeAdded, setIsCashOutChargeAdded] = useState(false);

  // Step 3: Review
  const [preview, setPreview] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef(null);

  useEffect(() => {
    fetchRecipients();
    fetchBalance();
  }, []);

  /** Deep link: /send-money?phone=01...&step=amount&name=... → amount step with recipient */
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const phoneParam = searchParams.get('phone');
    const nameParam = searchParams.get('name');
    if (stepParam !== 'amount' || !phoneParam) return;
    const digits = phoneParam.replace(/\D/g, '');
    if (!/^01[3-9]\d{8}$/.test(digits)) {
      toast.error('Invalid phone in link');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await transactionApi.lookupRecipient(digits);
        if (cancelled) return;
        setRecipient({
          name: data.data.fullName,
          phone: digits,
        });
        setForm((p) => ({ ...p, receiverPhone: digits }));
        setStep('amount');
      } catch {
        if (cancelled) return;
        const fallback = nameParam
          ? decodeURIComponent(nameParam)
          : 'Recipient';
        setRecipient({ name: fallback, phone: digits });
        setForm((p) => ({ ...p, receiverPhone: digits }));
        setStep('amount');
        if (!nameParam) {
          toast.error('Could not verify number — check recipient before sending');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams.toString()]);

  const fetchRecipients = async () => {
    setLoadingContacts(true);
    try {
      const { data } = await recipientApi.getAll();
      const customers = data.data.filter(r => r.target_type?.toLowerCase() === 'customer');
      setSavedRecipients(customers);
    } catch (error) {
      console.error('Failed to load contacts', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const { data } = await walletApi.getBalance();
      setWalletBalance(data.data.balance || 0);
    } catch (error) {
      console.error('Failed to load balance', error);
    }
  };

  const handleLookup = async () => {
    const phoneToLookup = searchQuery.replace(/\D/g, '');
    setLookupError('');
    if (!/^01[3-9][0-9]{8}$/.test(phoneToLookup)) {
      setLookupError('Enter a valid 11-digit mobile number to look up');
      return;
    }
    setLoading(true);
    try {
      const { data } = await transactionApi.lookupRecipient(phoneToLookup);
      setRecipient({
        name: data.data.fullName,
        phone: phoneToLookup,
      });
      setForm(p => ({ ...p, receiverPhone: phoneToLookup }));
      setSearchQuery('');
      setStep('amount');
    } catch (error) {
      setLookupError(error.response?.data?.message || 'Recipient not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact) => {
    setRecipient({
      name: contact.target_name || contact.nickname,
      phone: contact.target_phone,
    });
    setForm(p => ({ ...p, receiverPhone: contact.target_phone }));
    setSearchQuery('');
    setStep('amount');
  };

  const handleReview = async () => {
    const baseAmount = parseFloat(form.amount);
    if (!baseAmount || baseAmount <= 0) return toast.error('Enter a valid amount');

    setLoading(true);
    try {
      const { data } = await transactionApi.preview('SEND_MONEY', {
        receiverPhone: form.receiverPhone,
        amount: baseAmount,
      });
      setPreview(data.data);
      setStep('review');
      // Auto focus pin input when moving to review step
      setTimeout(() => {
        if (pinInputRef.current) pinInputRef.current.focus();
      }, 100);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPin = async () => {
    if (form.pin.length !== 5) return toast.error('PIN must be 5 digits');

    setLoading(true);
    try {
      const { data } = await transactionApi.sendMoney({
        receiverPhone: form.receiverPhone,
        amount: parseFloat(form.amount),
        pin: form.pin,
        note: form.note || null,
      });
      setReceipt(data.data);
      setStep('receipt');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const searchTrimmed = searchQuery.trim();
  const searchDigits = searchQuery.replace(/\D/g, '');
  const filteredRecipients = savedRecipients.filter((contact) => {
    if (!searchTrimmed && !searchDigits) return true;
    const q = searchTrimmed.toLowerCase();
    const nameMatch =
      q.length > 0 &&
      (contact.target_name?.toLowerCase().includes(q) || contact.nickname?.toLowerCase().includes(q));
    const phoneNorm = String(contact.target_phone || '').replace(/\D/g, '');
    const phoneMatch = searchDigits.length > 0 && phoneNorm.includes(searchDigits);
    return Boolean(nameMatch || phoneMatch);
  });

  const amountNum = parseFloat(form.amount);
  const hasValidAmount = Number.isFinite(amountNum) && amountNum > 0;
  const amountExceedsBalance = Number.isFinite(amountNum) && amountNum > walletBalance;
  const canProceedAmountStep = !loading && hasValidAmount && !amountExceedsBalance;

  useEffect(() => {
    if (!hasValidAmount && isCashOutChargeAdded) {
      setIsCashOutChargeAdded(false);
    }
  }, [hasValidAmount, isCashOutChargeAdded]);

  const lookupDigits = searchQuery.replace(/\D/g, '');
  const isExactPhoneMatch = /^01[3-9]\d{8}$/.test(lookupDigits);
  const phoneAlreadyListed = savedRecipients.some(
    (c) => String(c.target_phone || '').replace(/\D/g, '') === lookupDigits
  );
  const showLookupArrow = isExactPhoneMatch && !phoneAlreadyListed;

  const wizardSteps = [
    { key: 'recipient', label: 'Recipient', hint: 'Find or enter recipient' },
    { key: 'amount', label: 'Amount', hint: 'How much to send' },
    { key: 'review', label: 'Confirm', hint: 'Verify & enter PIN' },
  ];

  if (step === 'receipt' && receipt) {
    return <TransactionReceipt receipt={receipt} onDone={() => navigate('/dashboard', { replace: true })} />;
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 pt-2 sm:px-8 sm:pb-10 sm:pt-4 lg:pb-12 lg:pt-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14">
          <aside className="animate-in slide-in-from-left-4 duration-700 lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100">
                <PaperAirplaneIcon className="h-6 w-6 -rotate-45" strokeWidth={2} />
              </div>
              <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl xl:text-4xl">
                Send money
              </h1>
              <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-slate-500">
                Send money instantly to any TekaPakhi user — simple, fast, secure.
              </p>

              <nav className="mt-10 hidden lg:block" aria-label="Progress">
                <ol>
                  {wizardSteps.map((s, i) => {
                    const active = step === s.key;
                    const done =
                      (s.key === 'recipient' && (step === 'amount' || step === 'review')) ||
                      (s.key === 'amount' && step === 'review');
                    return (
                      <li key={s.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors ${active
                                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                                : done
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                          >
                            {done && !active ? '✓' : i + 1}
                          </span>
                          {i < wizardSteps.length - 1 ? (
                            <span className="my-1.5 block min-h-[2rem] w-px grow bg-slate-200" aria-hidden />
                          ) : null}
                        </div>
                        <div className={`min-w-0 pb-8 ${active ? '' : 'opacity-55'}`}>
                          <p className="text-sm font-bold text-slate-900">{s.label}</p>
                          <p className="text-xs font-medium text-slate-400">{s.hint}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </aside>

          <div className="animate-in slide-in-from-right-4 duration-700 lg:col-span-8">
            <div className="mx-auto flex w-full max-w-xl xl:max-w-2xl min-h-[min(640px,72vh)] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 sm:rounded-[2.5rem] sm:p-8 md:p-10">

              {/* Header inside the wizard */}
              <div className="flex items-center gap-4 mb-8">
                {step !== 'recipient' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'amount') setStep('recipient');
                      if (step === 'review') setStep('amount');
                      setForm(p => ({ ...p, pin: '' }));
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-900 transition-colors"
                  >
                    <ArrowLeftIcon className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                )}
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Send Money</h2>
                <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <PaperAirplaneIcon className="h-4 w-4 -rotate-45" strokeWidth={2} />
                </div>
              </div>

              {step === 'recipient' && (
                <div className="flex-1 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 group-focus-within:text-primary-600 transition-colors" />
                    </div>
                    <input
                      type="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      value={searchQuery}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 80);
                        setSearchQuery(v);
                        setLookupError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && showLookupArrow) handleLookup();
                      }}
                      placeholder="Search by name or 11-digit mobile"
                      className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/30 py-4 pl-12 pr-14 text-[15px] font-bold transition-all focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-50"
                    />
                    {showLookupArrow && (
                      <button
                        type="button"
                        onClick={() => handleLookup()}
                        disabled={loading}
                        className="absolute inset-y-2 right-2 flex w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md hover:bg-primary-700 transition-all disabled:opacity-50"
                      >
                        {loading ? <LoadingSpinner size="sm" /> : <ArrowRightIcon className="h-5 w-5" strokeWidth={2.5} />}
                      </button>
                    )}
                  </div>

                  {lookupError && (
                    <GlobalError message={lookupError} onClose={() => setLookupError('')} />
                  )}

                  <div className="flex-1">
                    <h3 className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-4 px-1">
                      {searchTrimmed || searchDigits ? 'Matching contacts' : 'Saved recipients'}
                    </h3>

                    {loadingContacts ? (
                      <div className="flex justify-center py-8"><LoadingSpinner size="md" className="text-gray-300" /></div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {filteredRecipients.map(contact => (
                          <button
                            key={contact.saved_recipient_id || contact.target_phone}
                            onClick={() => handleSelectContact(contact)}
                            className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg uppercase">
                              {(contact.target_name || contact.nickname || '?')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate text-[15px]">
                                {contact.nickname || contact.target_name}
                              </p>
                              <p className="text-[14px] font-medium text-emerald-600 mt-0.5">
                                {contact.target_phone}
                              </p>
                            </div>
                          </button>
                        ))}
                        {filteredRecipients.length === 0 && (
                          <p className="text-sm font-medium text-gray-400 text-center py-8 px-2">
                            {savedRecipients.length === 0
                              ? 'No saved contacts yet.'
                              : 'No contacts match your search. Try another name or enter a full mobile number to look up.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 'amount' && recipient && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
                  {/* Recipient Header Content */}
                  <div className="mb-10 text-center space-y-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">Recipient</p>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-2xl uppercase shadow-inner">
                        {recipient.name[0]}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-lg">{recipient.name}</p>
                        <p className="text-[15px] font-medium text-gray-500">{recipient.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1 px-4">
                    <div className="text-center flex flex-col items-center">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-6">
                        Amount
                      </p>

                      {/* Amount Input */}
                      <div className="group flex items-center justify-center text-primary-600 relative">

                        {/* Focus glow */}
                        {/* <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 
                    transition duration-300 bg-primary-100 blur-xl"></div> */}

                        <span className="text-5xl font-semibold mr-2 mt-2 text-gray-500">৳</span>

                        <div className="relative inline-flex min-w-[40px]">
                          {/* Width tracker */}
                          <span className="invisible whitespace-pre text-6xl font-black">
                            {form.amount || '0'}
                          </span>

                          <input
                            type="text"
                            inputMode="decimal"
                            value={form.amount}
                            onChange={(e) => {
                              const val = e.target.value;

                              // allow only numbers + decimal
                              if (/^\d*\.?\d*$/.test(val)) {
                                setForm(p => ({ ...p, amount: val }));
                              }
                            }}
                            placeholder="0"
                            className="absolute inset-0 w-full bg-transparent text-6xl font-black 
                   text-primary-600 placeholder:text-gray-300 text-left
                   focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Balance + validation */}
                      <p className="mt-6 text-[14px] font-medium text-gray-500">
                        Available Balance:
                        <span className="text-gray-900 ml-1 font-semibold">
                          ৳{walletBalance.toFixed(2)}
                        </span>
                      </p>

                      {/* Optional warning */}
                      {amountExceedsBalance && (
                        <p className="mt-2 text-sm text-red-500 font-medium">
                          Insufficient balance
                        </p>
                      )}
                    </div>

                    <div className="h-px bg-gray-100 my-8" />

                    <label
                      className={`flex items-center justify-between ${hasValidAmount ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          Add Cash Out Charge
                        </p>
                        <p className="text-sm text-gray-500">
                          To send with charge for recipient
                        </p>
                      </div>

                      <div className="relative shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          disabled={!hasValidAmount}
                          checked={isCashOutChargeAdded}
                          onChange={(e) => {
                            if (!hasValidAmount) return;
                            const checked = e.target.checked;
                            setIsCashOutChargeAdded(checked);

                            setForm(p => {
                              const currentVal = parseFloat(p.amount);
                              if (!Number.isFinite(currentVal) || currentVal <= 0) return p;

                              const newVal = checked
                                ? (currentVal * 1.0185).toFixed(2)
                                : (currentVal / 1.0185).toFixed(2);

                              return { ...p, amount: newVal };
                            });
                          }}
                        />

                        {/* Track */}
                        <div
                          className="w-12 h-7 bg-gray-300 rounded-full transition-colors duration-300
                    peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:peer-checked:bg-gray-400"
                        />

                        {/* Thumb */}
                        <div
                          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300
                    peer-checked:translate-x-5 peer-disabled:opacity-80"
                        />
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleReview}
                    disabled={!canProceedAmountStep}
                    className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${loading || canProceedAmountStep
                        ? 'bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600'
                        : 'bg-gray-200 text-gray-400 shadow-none'
                      }`}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : <ArrowRightIcon className="h-6 w-6" strokeWidth={2.5} />}
                  </button>
                </div>
              )}

              {step === 'review' && preview && recipient && (
                <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
                  {/* Review Header Content */}
                  <div className="mb-6 flex flex-col items-center gap-2">
                    <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-gray-400">Recipient</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg uppercase shadow-inner">
                        {recipient.name[0]}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-[15px]">{recipient.name}</p>
                        <p className="text-[13px] font-medium text-gray-500">{recipient.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 px-2">
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="font-bold text-gray-500">Amount</span>
                      <span className="font-black text-gray-900">{formatBDT(preview.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="font-bold text-gray-500">Charge</span>
                      <span className="font-black text-gray-900">+ {formatBDT(preview.fee)}</span>
                    </div>
                    <div className="h-px bg-gray-100 my-2" />
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold text-gray-500">Total</span>
                      <span className="font-black text-primary-600">{formatBDT(preview.totalDebit)}</span>
                    </div>
                  </div>

                  <div className="mt-8 relative mb-8">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[12px] font-bold text-gray-500 px-1">Reference</label>
                      <span className="text-[11px] font-bold text-gray-400">{form.note.length}/50</span>
                    </div>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="Tap to add a note"
                      className="w-full text-[15px] font-medium text-gray-900 placeholder:text-gray-300 border-b-2 border-gray-100 py-2 focus:outline-none focus:border-primary-500 transition-colors bg-transparent"
                      maxLength={50}
                    />
                  </div>

                  <div className="mt-auto flex flex-col items-center">
                    <div className="flex items-center gap-3 w-full justify-center relative">
                      <LockClosedIcon className="h-5 w-5 text-primary-600 absolute left-4 sm:left-12" strokeWidth={2.5} />
                      <input
                        type="password"
                        ref={pinInputRef}
                        value={form.pin}
                        onChange={(e) => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                        placeholder="Enter PIN"
                        className="w-[200px] text-center text-lg tracking-[0.5em] font-black text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-medium placeholder:text-[15px] border-b-2 border-primary-100 py-2 focus:outline-none focus:border-primary-600 transition-colors bg-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && form.pin.length === 5) {
                            handleConfirmPin();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmPin}
                    disabled={loading || form.pin.length !== 5}
                    className={`mt-8 flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-black shadow-xl transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:active:scale-100 ${loading || form.pin.length === 5
                        ? 'bg-primary-600 text-white shadow-primary-200 hover:bg-primary-700 disabled:hover:bg-primary-600'
                        : 'bg-gray-200 text-gray-400 shadow-none hover:bg-gray-200'
                      }`}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : <ArrowRightIcon className="h-6 w-6" strokeWidth={2.5} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ArrowDownTrayIcon,
  UserPlusIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { formatBDT, formatPhone } from '../../utils/formatCurrency';
import { recipientApi } from '../../api/recipientApi';
import { transactionApi } from '../../api/transactionApi';
import { toast } from 'sonner';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSiteHeader } from '../../context/SiteHeaderContext';

const typeLabels = {
  SEND_MONEY: 'Send Money',
  CASH_IN: 'Cash In',
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment',
  PAY_BILL: 'Pay Bill',
  B2B: 'B2B Transfer',
};

export default function TransactionReceipt({ receipt, onDone }) {
  const navigate = useNavigate();
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [nickname, setNickname] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  const copyTransactionRef = async () => {
    const ref = receipt?.transactionRef;
    if (ref == null || ref === '') return;
    const text = String(ref);
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        /* fallback below */
      }
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (ok) {
      setRefCopied(true);
      toast.success('Reference copied to clipboard');
      window.setTimeout(() => setRefCopied(false), 2000);
    } else {
      toast.error('Could not copy — try selecting the text manually');
    }
  };

  const handleDone = useCallback(() => {
    if (onDone) onDone();
    else navigate('/dashboard', { replace: true });
  }, [onDone, navigate]);

  const { setSiteHeaderOverrides, resetSiteHeaderOverrides } = useSiteHeader();
  const label = typeLabels[receipt.type] || receipt.type;

  useEffect(() => {
    setSiteHeaderOverrides({
      back: handleDone,
      subtitle: 'Success',
      title: label,
    });
    return () => resetSiteHeaderOverrides();
  }, [label, handleDone, setSiteHeaderOverrides, resetSiteHeaderOverrides]);

  const handleSaveContact = async () => {
    if (!nickname.trim()) return toast.error('Please enter a nickname');
    setSavingContact(true);
    try {
      await recipientApi.create({
        phoneNumber: receipt.receiver?.phone,
        nickname: nickname.trim(),
      });
      toast.success('Contact saved successfully!');
      setContactSaved(true);
      setShowSaveContact(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDownloadPdf = async () => {
    const id = receipt?.transactionId;
    if (id == null) {
      toast.error('Receipt is missing transaction id');
      return;
    }
    setPdfLoading(true);
    try {
      const { data } = await transactionApi.receiptPdf(Number(id));
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `TekaPakhi-Receipt-${receipt.transactionRef || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (error) {
      let msg = 'Could not generate PDF';
      const data = error.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const j = JSON.parse(text);
          if (j.message) msg = j.message;
        } catch {
          /* keep default */
        }
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      toast.error(msg);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          {/* Left: confirmation */}
          <section className="flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner shadow-emerald-100/50 ring-1 ring-emerald-100 sm:h-24 sm:w-24">
              <CheckCircleIcon className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.25} />
            </div>
            <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Transaction successful
            </h1>
            <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-slate-500">
              {label} ·{' '}
              {new Date(receipt.timestamp).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row lg:max-w-none lg:flex-col xl:flex-row">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading || receipt.transactionId == null}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-4 text-[15px] font-bold text-white shadow-lg shadow-primary-600/25 transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pdfLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" strokeWidth={2} />
                )}
                Download PDF receipt
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-[15px] font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Return to home
              </button>
            </div>
          </section>

          {/* Right: receipt card */}
          <section className="lg:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-100">
              <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 text-white sm:p-10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">Amount sent</p>
                  <p className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{formatBDT(receipt.amount)}</p>
                  <p className="mt-6 text-sm font-medium text-white/85">
                    <span className="text-white/75">Ref</span>{' '}
                    <button
                      type="button"
                      onClick={copyTransactionRef}
                      title="Copy reference"
                      className="group inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-left font-mono text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      <span className="break-all">{receipt.transactionRef}</span>
                      <ClipboardDocumentIcon
                        className={`h-4 w-4 shrink-0 opacity-80 transition group-hover:opacity-100 ${refCopied ? 'text-emerald-200' : ''}`}
                        strokeWidth={2}
                      />
                    </button>
                  </p>
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-10">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Recipient</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{receipt.receiver?.name}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{formatPhone(receipt.receiver?.phone)}</p>
                  <div className="mt-6 space-y-2 border-t border-slate-100 pt-6 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-slate-500">Fee</span>
                      <span className="font-bold text-slate-900">{formatBDT(receipt.fee)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="font-medium text-slate-500">Total debit</span>
                      <span className="font-black text-primary-600">{formatBDT(receipt.totalDebit)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-8 py-6 sm:px-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                  <div className="min-w-0 sm:max-w-[48%]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sent from</p>
                    <p className="mt-1 font-bold text-slate-900">{receipt.sender?.name}</p>
                    <p className="text-sm text-slate-500">{formatPhone(receipt.sender?.phone)}</p>
                  </div>
                  {receipt.note && (
                    <div className="min-w-0 w-full sm:ml-auto sm:w-1/2 sm:max-w-[50%]">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">
                        Note
                      </p>
                      <p
                        className="mt-1 text-right text-sm font-medium leading-relaxed text-slate-600 [overflow-wrap:anywhere] break-words"
                        style={{ wordBreak: 'break-word' }}
                      >
                        <span className="text-slate-400">&ldquo;</span>
                        {receipt.note}
                        <span className="text-slate-400">&rdquo;</span>
                      </p>
                    </div>
                  )}
                </div>

                {receipt.receiver?.phone && !contactSaved && receipt.type !== 'CASH_IN' && (
                  <div className="mt-8 border-t border-slate-100 pt-8">
                    {!showSaveContact ? (
                      <button
                        type="button"
                        onClick={() => setShowSaveContact(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-4 text-sm font-bold text-primary-600 transition-colors hover:bg-slate-100"
                      >
                        <UserPlusIcon className="h-5 w-5" strokeWidth={2} />
                        Save contact for next time
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500">Save {receipt.receiver.name}</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Nickname (e.g. Rent, Mom)"
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveContact}
                            disabled={savingContact || !nickname.trim()}
                            className="shrink-0 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                          >
                            {savingContact ? <LoadingSpinner size="sm" /> : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-8 py-4 sm:px-10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block align-middle" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                    Secure transaction
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400">TekaPakhi</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

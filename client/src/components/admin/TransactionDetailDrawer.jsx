import { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import LoadingSpinner from '../common/LoadingSpinner';
import ProfileAvatar from '../common/ProfileAvatar';
import { getProfileTypeAdmin, ADMIN_TYPE_PILL_BOX } from '../../utils/roleTheme';
import {
  XMarkIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  BookOpenIcon,
  CalculatorIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

/* Helpers */

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-BD', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function CopyChip({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied', { duration: 1200 });
  };
  return (
    <div
      onClick={copy}
      className="group inline-flex cursor-pointer items-center gap-1.5 font-mono text-[13px] font-semibold text-gray-900 hover:text-primary-700 transition-colors"
      title="Click to copy"
    >
      <span className="truncate max-w-[130px] sm:max-w-[180px]">{value}</span>
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4 text-gray-400 opacity-70 group-hover:opacity-100 group-hover:text-primary-600 transition-opacity shrink-0" />
      )}
    </div>
  );
}

/* Styles */

const TX_STATUS_STYLE = {
  COMPLETED: 'bg-green-50 text-green-700 border-green-100',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-100',
  FAILED: 'bg-red-50 text-red-600 border-red-100',
  REVERSED: 'border border-[#E2136E]/15 bg-[#E2136E]/10 text-[#E2136E]',
};

const TX_STATUS_BADGE =
  'inline-flex min-w-[4.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide';

const ENTRY_STYLES = {
  DEBIT: {
    bg: 'bg-white',
    border: 'border-y-gray-200/80 border-r-gray-200/80 border-l-[3px] border-l-red-500',
    icon: 'text-red-600 bg-red-50',
    text: 'text-red-600',
  },
  CREDIT: {
    bg: 'bg-white',
    border: 'border-y-gray-200/80 border-r-gray-200/80 border-l-[3px] border-l-emerald-500',
    icon: 'text-emerald-600 bg-emerald-50',
    text: 'text-emerald-600',
  },
};

const fieldLabelClass = "text-[10px] font-bold uppercase tracking-wider text-gray-600";
const fieldValueClass = "text-sm font-bold text-gray-900";

/* Section Components */

function PartyCard({ label, name, phone, typeName }) {
  const accent = getProfileTypeAdmin(typeName);

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-gray-100 bg-white p-2.5 sm:p-3 shadow-sm transition-all hover:shadow-md">
      <p className={`${fieldLabelClass} mb-1.5`}>{label}</p>
      <div className="flex items-center gap-2.5">
        <ProfileAvatar
          name={name}
          className={`h-9 w-9 text-xs shrink-0 shadow-sm ${accent.avatar}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-gray-900 tracking-tight">{name || '—'}</p>
          <div className="mt-0.5 space-y-1">
            <p className="text-[11px] text-gray-600 font-bold tabular-nums leading-none">
              {phone || '—'}
            </p>
            {typeName && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border leading-none shadow-sm ${accent.badge}`}>
                {typeName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Main Drawer */

export default function TransactionDetailDrawer({ transactionId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('story'); // 'story' | 'math'

  useEffect(() => {
    if (!transactionId || !isOpen) return;
    setLoading(true);
    setError(null);
    setActiveTab('story');
    adminApi.getTransactionDetail(transactionId)
      .then((res) => setData(res.data.data))
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to load transaction details.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [transactionId, isOpen]);

  const tx = data?.transaction;
  const auditLogs = data?.auditLogs || [];
  const ledgerEntries = data?.ledgerEntries || [];

  const isReversal = !!tx?.original_transaction_id;
  const displayType = tx ? (isReversal ? 'Reversal' : tx.type_name?.replace(/_/g, ' ')) : '';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[90]" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[4px]" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto flex w-screen max-w-[480px] flex-col bg-gray-50/95 shadow-2xl shadow-black/10 ring-1 ring-gray-200/50">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200/80 bg-white px-5 py-4">
                    <h2 className="text-base font-bold tracking-tight text-gray-900">Transaction Details</h2>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    {loading && <LoadingSpinner size="lg" className="py-24" />}
                    {error && (
                      <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center">
                        <p className="text-sm font-bold text-red-600">{error}</p>
                      </div>
                    )}

                    {!loading && !error && tx && (
                      <>
                        {/* Summary Card */}
                        <div className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/30 pointer-events-none" />
                          <div className="flex flex-col items-center text-center relative z-10">
                            <span className={`${TX_STATUS_BADGE} ${TX_STATUS_STYLE[tx.status]} mb-2.5 py-1 px-3 shadow-sm text-[10px]`}>
                              {tx.status}
                            </span>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-gray-500 mb-1">
                              {displayType}
                            </p>
                            <p className="text-3xl font-extrabold tabular-nums text-gray-900 tracking-tighter">
                              {formatBDT(tx.amount)}
                            </p>
                            {(isReversal || parseFloat(tx.fee_amount) > 0) && (
                              <p className="mt-1 text-sm font-bold text-gray-500">
                                Fee: {formatBDT(isReversal ? 0 : tx.fee_amount)}
                              </p>
                            )}
                          </div>

                          <div className="mt-3.5 grid grid-cols-2 gap-y-3.5 gap-x-4 border-t border-gray-100 pt-3.5">
                            <div>
                              <p className={fieldLabelClass}>Trx ID</p>
                              <div className="mt-0.5">
                                <CopyChip value={tx.transaction_ref} />
                              </div>
                            </div>
                            <div>
                              <p className={fieldLabelClass}>Time</p>
                              <p className={`${fieldValueClass} tabular-nums mt-0.5`}>{fmtDate(tx.transaction_time)}</p>
                            </div>
                            {isReversal && tx.original_transaction_ref && (
                              <div className="col-span-2">
                                <p className={fieldLabelClass}>Original Transaction</p>
                                <div className="mt-0.5">
                                  <CopyChip value={tx.original_transaction_ref} />
                                </div>
                              </div>
                            )}
                            {tx.user_note && (
                              <div className="col-span-2">
                                <p className={fieldLabelClass}>Note</p>
                                <p className={`${fieldValueClass} mt-0.5`}>{tx.user_note}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Parties */}
                        <div className="flex gap-2.5 items-center">
                          <PartyCard label="Sender" name={tx.sender_name} phone={tx.sender_phone} typeName={tx.sender_type} />
                          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200/80 shadow-md transform transition-transform group-hover:scale-110">
                            <ArrowRightIcon className="h-4 w-4 text-emerald-500" strokeWidth={3} />
                          </div>
                          <PartyCard label="Receiver" name={tx.receiver_name} phone={tx.receiver_phone} typeName={tx.receiver_type} />
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex rounded-xl bg-gray-200/50 p-1">
                          <button
                            onClick={() => setActiveTab('story')}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                              activeTab === 'story'
                                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                          >
                            <BookOpenIcon className="h-4 w-4" />
                            Audit Log
                          </button>
                          <button
                            onClick={() => setActiveTab('math')}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                              activeTab === 'math'
                                ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                          >
                            <CalculatorIcon className="h-4 w-4" />
                            Ledger
                          </button>
                        </div>

                        {/* Tabs Sliding Container */}
                        <div className="relative overflow-hidden pt-4">
                          <div 
                            className="flex w-[200%] transition-transform duration-300 ease-out"
                            style={{ transform: activeTab === 'story' ? 'translateX(0)' : 'translateX(-50%)' }}
                          >
                            {/* Narrative Tab Section */}
                            <div className="w-1/2 shrink-0 pr-2">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">Events Timeline</h3>
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100/80 px-2 py-0.5 rounded-full ring-1 ring-gray-200/50">
                                    {auditLogs.length} entries
                                  </span>
                                </div>
                                {auditLogs.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-12 text-center">
                                    <BookOpenIcon className="mx-auto h-8 w-8 text-gray-200 mb-3" />
                                    <p className="text-[13px] font-bold text-gray-400">No narrative data recorded</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3.5">
                                    {auditLogs.map((log) => (
                                      <div key={log.audit_id} className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary-100 group">
                                        <p className="text-[13.5px] font-medium leading-relaxed text-gray-700">
                                          {log.summary.split(/(\d{11}|[A-Z0-9]{10,})/).map((part, i) => (
                                            <span key={i} className={/(\d{11}|[A-Z0-9]{10,})/.test(part) ? "font-bold text-gray-900 font-mono tracking-tight" : ""}>
                                              {part}
                                            </span>
                                          ))}
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary-600 bg-primary-50/80 px-2 py-0.5 rounded-md border border-primary-100/50">
                                            {log.event_type?.replace(/_/g, ' ')}
                                          </span>
                                          {log.actor_name && (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <div className="h-1 w-1 rounded-full bg-gray-300 shrink-0" />
                                              <span className="text-[11px] font-bold text-gray-500 truncate">{log.actor_name}</span>
                                            </div>
                                          )}
                                          <span className="text-[10px] tabular-nums text-gray-400 font-bold ml-auto">{fmtDate(log.created_at)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ledger Tab Section */}
                            <div className="w-1/2 shrink-0 pl-2">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-gray-400">Financial Proof</h3>
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100/80 px-2 py-0.5 rounded-full ring-1 ring-gray-200/50">
                                    {ledgerEntries.length} legs
                                  </span>
                                </div>
                                {ledgerEntries.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-12 text-center">
                                    <CalculatorIcon className="mx-auto h-8 w-8 text-gray-200 mb-3" />
                                    <p className="text-[13px] font-bold text-gray-400">No ledger records found</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2.5">
                                    {ledgerEntries.map((entry) => {
                                      const style = ENTRY_STYLES[entry.entry_type] || ENTRY_STYLES.DEBIT;
                                      const isDebit = entry.entry_type === 'DEBIT';
                                      const Icon = isDebit ? ArrowUpRightIcon : ArrowDownLeftIcon;
                                      return (
                                        <div key={entry.id} className={`rounded-2xl border ${style.border} ${style.bg} p-4 shadow-sm hover:shadow-md transition-all group`}>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex gap-3.5 min-w-0">
                                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon} shadow-inner transition-transform group-hover:scale-110`}>
                                                <Icon className="h-4.5 w-4.5" strokeWidth={2.5} />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-[10px] font-extrabold uppercase tracking-widest ${style.text}`}>{entry.entry_type}</span>
                                                  <span className="h-1 w-1 rounded-full bg-gray-300" />
                                                  <span className="text-[10px] font-bold text-gray-400 tabular-nums">ID #{entry.id}</span>
                                                </div>
                                                <p className="mt-0.5 text-[14px] font-extrabold text-gray-900 truncate tracking-tight">
                                                  {entry.wallet_role ? `${entry.wallet_role.replace(/_/g, ' ')} Wallet` : (entry.wallet_owner_name || 'System Account')}
                                                </p>
                                                {!entry.wallet_role && entry.wallet_owner_phone && (
                                                  <p className="mt-0.5 text-[11px] text-gray-500 font-bold tabular-nums tracking-wide">{entry.wallet_owner_phone}</p>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className={`text-[17px] font-extrabold tabular-nums tracking-tighter ${style.text}`}>
                                                {isDebit ? '−' : '+'}{formatBDT(entry.amount)}
                                              </p>
                                            </div>
                                          </div>
                                          {(entry.before_balance != null || entry.after_balance != null) && (
                                            <div className="mt-4 flex items-center justify-between gap-2.5 rounded-xl bg-gray-50/80 border border-gray-100 px-3.5 py-2.5 ring-1 ring-white/50">
                                              <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-gray-400">Balance Snap</span>
                                              <div className="flex items-center gap-2.5 text-[12px] tabular-nums font-extrabold">
                                                <span className="text-gray-400">{formatBDT(entry.before_balance)}</span>
                                                <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400" strokeWidth={2.5} />
                                                <span className="text-gray-900">{formatBDT(entry.after_balance)}</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Integrity Check */}
                                    {ledgerEntries.length > 0 && (() => {
                                      const sums = ledgerEntries.reduce((acc, e) => {
                                        const val = parseFloat(e.amount);
                                        if (e.entry_type === 'DEBIT') acc.debits += val;
                                        else acc.credits += val;
                                        return acc;
                                      }, { debits: 0, credits: 0 });
                                      const balanced = Math.abs(sums.debits - sums.credits) < 0.01;
                                      return (
                                        <div className={`mt-5 rounded-2xl border p-4.5 shadow-sm transition-all bg-white relative overflow-hidden ${balanced ? 'border-emerald-100 bg-emerald-50/5' : 'border-red-200 bg-red-50/5'}`}>
                                          <div className="flex items-center justify-between relative z-10">
                                            <div className="space-y-2">
                                              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gray-400 mb-2">Integrity Audit</p>
                                              <div className="flex flex-col gap-1.5 text-[14px] font-extrabold tabular-nums tracking-tight">
                                                <div className="flex items-center gap-4">
                                                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-extrabold min-w-[85px]">Total Debit</span>
                                                  <span className="text-red-500">{formatBDT(sums.debits)}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-extrabold min-w-[85px]">Total Credit</span>
                                                  <span className="text-emerald-600">{formatBDT(sums.credits)}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${balanced ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'}`}>
                                                <div className={`h-1.5 w-1.5 rounded-full ${balanced ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {balanced ? 'Balanced' : 'Imbalance'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DocumentTextIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TransactionCard from '../../components/transaction/TransactionCard';
import TransactionDetailPanel from '../../components/transaction/TransactionDetailPanel';
import { formatBDT, formatPhone } from '../../utils/formatCurrency';

const TYPES = ['ALL', 'SEND_MONEY', 'CASH_IN', 'CASH_OUT', 'PAYMENT', 'PAY_BILL', 'B2B'];

function filterLabel(t) {
  if (t === 'ALL') return 'All transactions';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const txParam = searchParams.get('tx');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('ALL');
  const [detailTx, setDetailTx] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchHistory = useCallback(
    async (pageNum = 1, type = filter) => {
      setLoading(true);
      try {
        const params = { page: pageNum, limit: 10 };
        if (type !== 'ALL') params.type = type;
        const { data } = await transactionApi.getHistory(params);
        setTransactions(data.data.transactions);
        setTotalPages(data.data.totalPages);
        setPage(data.data.page);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchHistory(1, filter);
  }, [filter, fetchHistory]);

  useEffect(() => {
    if (!txParam) {
      setDetailTx(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailTx(null);
    transactionApi
      .getDetail(txParam)
      .then(({ data }) => {
        if (!cancelled) setDetailTx(data.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Could not load transaction');
          setSearchParams({});
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [txParam, setSearchParams]);

  useEffect(() => {
    if (!txParam) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSearchParams({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [txParam, setSearchParams]);

  const closeDetail = () => setSearchParams({});

  const handleTxClick = (tx) => {
    setSearchParams({ tx: String(tx.transaction_id) });
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-2 sm:px-8 sm:pb-12 sm:pt-4 lg:pb-16 lg:pt-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14">
          {/* Sidebar — intro + filters (desktop) */}
          <aside className="animate-in slide-in-from-left-4 duration-700 lg:col-span-4 lg:sticky lg:top-24">
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm ring-1 ring-primary-100">
                <DocumentTextIcon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl xl:text-4xl">
                Transaction history
              </h1>
              <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-slate-500">
                View and filter your activity. Select a row to open full details, receipt, and breakdown.
              </p>

              {/* Desktop filter list */}
              <nav className="mt-10 hidden lg:block" aria-label="Filter by type">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Filter by type</p>
                <ul className="space-y-1.5">
                  {TYPES.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => setFilter(t)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[14px] font-bold transition-all ${
                          filter === t
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 ring-2 ring-primary-600 ring-offset-2 ring-offset-white'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {t === 'ALL' && <FunnelIcon className="h-4 w-4 shrink-0 opacity-80" />}
                        <span className="min-w-0 flex-1">{filterLabel(t)}</span>
                        {filter === t && <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.5} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {!loading && transactions.length > 0 && (
                <p className="mt-8 hidden text-sm font-medium text-slate-400 lg:block">
                  Page <span className="font-bold text-slate-700">{page}</span> of{' '}
                  <span className="font-bold text-slate-700">{totalPages}</span>
                </p>
              )}
            </div>

            {/* Mobile / tablet horizontal filters */}
            <div className="mt-6 flex flex-wrap gap-2 lg:hidden">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-bold transition-all sm:text-[13px] ${
                    filter === t
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 ring-2 ring-primary-600 ring-offset-2'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'ALL' && <FunnelIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  {filterLabel(t)}
                </button>
              ))}
            </div>
          </aside>

          {/* Main list / table */}
          <div className="animate-in slide-in-from-right-4 duration-700 lg:col-span-8">
            <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 sm:rounded-[2.5rem] xl:max-w-none">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-8 sm:py-5">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Activity</h2>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {filter === 'ALL' ? 'All types' : filterLabel(filter)}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 sm:py-24">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-[15px] font-semibold text-slate-400">Loading transactions…</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center sm:py-28">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 ring-1 ring-slate-200/80">
                    <DocumentTextIcon className="h-10 w-10 text-slate-300" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">No transactions yet</h3>
                  <p className="mt-2 max-w-sm text-[15px] font-medium text-slate-500">
                    When you send money, cash in, or pay a bill, your activity will show up here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden lg:block">
                    <div className="grid grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50/80 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <div className="col-span-3">Type</div>
                      <div className="col-span-4">Counterparty</div>
                      <div className="col-span-2 text-right">Amount</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-1 text-right" aria-hidden />
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <DesktopHistoryRow
                          key={tx.transaction_id}
                          tx={tx}
                          currentProfileId={user?.profileId}
                          onOpen={() => handleTxClick(tx)}
                        />
                      ))}
                    </ul>
                  </div>

                  {/* Mobile cards */}
                  <div className="divide-y divide-slate-100 p-2 lg:hidden">
                    {transactions.map((tx) => (
                      <TransactionCard
                        key={tx.transaction_id}
                        tx={tx}
                        currentProfileId={user?.profileId}
                        onClick={handleTxClick}
                        className="border-none bg-transparent hover:bg-primary-50/25"
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                      <button
                        type="button"
                        onClick={() => fetchHistory(page - 1)}
                        disabled={page <= 1}
                        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-[15px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.5} />
                        Previous
                      </button>
                      <span className="text-center text-[15px] font-bold text-primary-600">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchHistory(page + 1)}
                        disabled={page >= totalPages}
                        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-[15px] font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRightIcon className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {txParam ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tx-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-md transition-opacity"
            aria-label="Close transaction details"
            onClick={closeDetail}
          />
          <div className="relative z-10 max-h-[min(90dvh,880px)] w-full max-w-xl overflow-y-auto overscroll-contain animate-in zoom-in-95 fade-in duration-200">
            <span id="tx-detail-title" className="sr-only">
              Transaction details
            </span>
            {detailLoading ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                <LoadingSpinner size="lg" />
              </div>
            ) : detailTx ? (
              <TransactionDetailPanel
                tx={detailTx}
                user={user}
                onClose={closeDetail}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const typeLabels = {
  SEND_MONEY: 'Send Money',
  CASH_IN: 'Cash In',
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment',
  PAY_BILL: 'Pay Bill',
  B2B: 'B2B',
};

function DesktopHistoryRow({ tx, currentProfileId, onOpen }) {
  const isSender = tx.sender_profile_id?.toString() === currentProfileId?.toString();
  const counterparty = isSender
    ? { name: tx.receiver_name, phone: tx.receiver_phone }
    : { name: tx.sender_name, phone: tx.sender_phone };
  const label = typeLabels[tx.type_name] || tx.type_name;
  const completed = tx.status === 'COMPLETED';

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group grid w-full grid-cols-12 gap-4 px-6 py-4 text-left transition-colors hover:bg-primary-50/30"
      >
        <div className="col-span-3 min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {new Date(tx.transaction_time).toLocaleDateString('en-BD', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="col-span-4 min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-900">{counterparty.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatPhone(counterparty.phone)}</p>
        </div>
        <div className="col-span-2 text-right">
          <p className={`text-[15px] font-black tracking-tight ${isSender ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isSender ? '-' : '+'}
            {formatBDT(tx.amount)}
          </p>
        </div>
        <div className="col-span-2 flex items-center">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {tx.status}
          </span>
        </div>
        <div className="col-span-1 flex items-center justify-end text-slate-300 transition-colors group-hover:text-primary-600">
          <ChevronRightIcon className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </button>
    </li>
  );
}

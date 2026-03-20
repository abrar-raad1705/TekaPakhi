import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentTextIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TransactionCard from '../../components/transaction/TransactionCard';

const TYPES = ['ALL', 'SEND_MONEY', 'CASH_IN', 'CASH_OUT', 'PAYMENT', 'PAY_BILL', 'B2B'];

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('ALL');

  const fetchHistory = useCallback(async (pageNum = 1, type = filter) => {
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
  }, [filter]);

  useEffect(() => { 
    fetchHistory(1, filter); 
  }, [filter, fetchHistory]);

  const handleTxClick = (tx) => {
    navigate(`/transactions/${tx.transaction_id}`);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">Transaction History</h1>
            <p className="mt-2 text-[15px] font-medium text-gray-400">View and track all your account activities in one place.</p>
          </div>
          
          {/* Desktop Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all
                  ${filter === t 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-100 ring-2 ring-primary-600 ring-offset-2' 
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {t === 'ALL' && <FunnelIcon className="h-4 w-4" />}
                {t === 'ALL' ? 'All Transactions' : t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-[15px] font-bold text-gray-400">Fetching transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-3xl border-2 border-dashed border-gray-100 animate-in zoom-in-95 duration-500">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
              <DocumentTextIcon className="h-10 w-10 text-gray-200" strokeWidth={1} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No transactions found</h3>
            <p className="mt-2 text-[15px] font-medium text-gray-400">When you perform transactions, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-700">
            <div className="rounded-3xl border border-gray-100 bg-white p-2 shadow-xl shadow-gray-100/50 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <div 
                    key={tx.transaction_id}
                    onClick={() => handleTxClick(tx)}
                    className="group cursor-pointer hover:bg-primary-50/30 transition-all duration-200"
                  >
                    <TransactionCard
                      tx={tx}
                      currentProfileId={user?.profileId}
                      className="border-none bg-transparent hover:translate-x-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Design */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-10 px-4">
                <button 
                  onClick={() => fetchHistory(page - 1)} 
                  disabled={page <= 1}
                  className="flex items-center gap-2 rounded-2xl border-2 border-gray-100 px-6 py-3 text-[15px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeftIcon className="h-5 w-5" strokeWidth={2.5} />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-black text-primary-600 px-4 py-2 rounded-xl bg-primary-50">
                    Page {page} of {totalPages}
                  </span>
                </div>

                <button 
                  onClick={() => fetchHistory(page + 1)} 
                  disabled={page >= totalPages}
                  className="flex items-center gap-2 rounded-2xl border-2 border-gray-100 px-6 py-3 text-[15px] font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import TransactionCard from '../../components/transaction/TransactionCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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
      const params = { page: pageNum, limit: 15 };
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

  useEffect(() => { fetchHistory(1, filter); }, [filter]);

  const handleTxClick = (tx) => {
    navigate(`/transactions/${tx.transaction_id}`);
  };

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      <Header title="Transaction History" />

      {/* Filter tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <div className="mx-auto flex max-w-md gap-1 overflow-x-auto py-2 no-scrollbar">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                ${filter === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {t === 'ALL' ? 'All' : t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {loading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionCard
                key={tx.transaction_id}
                tx={tx}
                currentProfileId={user?.profileId}
                onClick={handleTxClick}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button onClick={() => fetchHistory(page - 1)} disabled={page <= 1}
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30">Prev</button>
                <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                <button onClick={() => fetchHistory(page + 1)} disabled={page >= totalPages}
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-30">Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

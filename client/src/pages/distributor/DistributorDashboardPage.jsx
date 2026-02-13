import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { walletApi } from '../../api/walletApi';
import { transactionApi } from '../../api/transactionApi';
import { formatBDT } from '../../utils/formatCurrency';
import BottomNav from '../../components/layout/BottomNav';
import TransactionCard from '../../components/transaction/TransactionCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DistributorDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBalance(), fetchRecentTxns()]).finally(() => setLoading(false));
  }, []);

  const fetchBalance = async () => {
    try { const { data } = await walletApi.getBalance(); setWallet(data.data); }
    catch (e) { console.error(e); }
  };
  const fetchRecentTxns = async () => {
    try { const { data } = await transactionApi.getMiniStatement(); setRecentTxns(data.data); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 pb-16 pt-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-200">Distributor Dashboard</p>
              <h1 className="text-lg font-bold text-white">{user?.fullName || 'Distributor'}</h1>
            </div>
            <button onClick={logout} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20" title="Logout">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-md px-4">
        {/* Balance Card */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-lg">
          {loading ? <LoadingSpinner size="md" className="py-4" /> : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Distributor Balance</p>
                <button onClick={() => setShowBalance(!showBalance)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  {showBalance ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {showBalance ? formatBDT(wallet?.balance || 0) : '৳ * * * * *'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                <span>Distributor Account</span>
              </div>
            </>
          )}
        </div>

        {/* B2B Action */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Services</h2>
          <button
            onClick={() => navigate('/b2b')}
            className="flex w-full items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-xl text-white">
              🔄
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">B2B Transfer</p>
              <p className="text-xs text-gray-500">Send float to agents</p>
            </div>
          </button>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
            {recentTxns.length > 0 && (
              <button onClick={() => navigate('/transactions')} className="text-xs font-medium text-indigo-600">View All</button>
            )}
          </div>
          {recentTxns.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTxns.map((tx) => (
                <TransactionCard key={tx.transaction_id} tx={tx} currentProfileId={user?.profileId}
                  onClick={(t) => navigate(`/transactions/${t.transaction_id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { walletApi } from '../../api/walletApi';
import { transactionApi } from '../../api/transactionApi';
import { formatBDT } from '../../utils/formatCurrency';
import BottomNav from '../../components/layout/BottomNav';
import TransactionCard from '../../components/transaction/TransactionCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function MerchantDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPendingKYC = user?.accountStatus === 'PENDING_KYC';

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
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 pb-16 pt-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-200">Merchant Dashboard</p>
              <h1 className="text-lg font-bold text-white">{user?.fullName || 'Merchant'}</h1>
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
        {/* KYC Pending Banner */}
        {isPendingKYC && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-800">Verification Pending</p>
                <p className="mt-0.5 text-xs text-yellow-600">Your merchant account is under review. You'll start receiving payments once verified by admin.</p>
              </div>
            </div>
          </div>
        )}

        {/* Balance Card */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-lg">
          {loading ? <LoadingSpinner size="md" className="py-4" /> : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Merchant Balance</p>
                <button onClick={() => setShowBalance(!showBalance)} className="text-sm font-medium text-purple-600 hover:text-purple-700">
                  {showBalance ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {showBalance ? formatBDT(wallet?.balance || 0) : '৳ * * * * *'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
                <span>Merchant Account</span>
              </div>
            </>
          )}
        </div>

        {/* Receive Payments Info */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">How to Receive Payments</h2>
          <p className="text-xs text-gray-500">
            Customers can send you payments by entering your phone number ({user?.phoneNumber}) in the "Payment" section of their app.
          </p>
        </div>

        {/* Recent Payments */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Recent Payments</h2>
            {recentTxns.length > 0 && (
              <button onClick={() => navigate('/transactions')} className="text-xs font-medium text-purple-600">View All</button>
            )}
          </div>
          {recentTxns.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No payments received yet</p>
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

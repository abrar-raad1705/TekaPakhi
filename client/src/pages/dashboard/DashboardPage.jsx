import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRightOnRectangleIcon, 
  PaperAirplaneIcon,
  BanknotesIcon,
  CreditCardIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { walletApi } from '../../api/walletApi';
import { formatBDT } from '../../utils/formatCurrency';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const quickActions = [
  { label: 'Send Money', icon: <PaperAirplaneIcon className="h-6 w-6 rotate-[-45deg]" />, color: 'bg-blue-500', to: '/send-money' },
  { label: 'Cash Out', icon: <BanknotesIcon className="h-6 w-6" />, color: 'bg-orange-500', to: '/cash-out' },
  { label: 'Payment', icon: <CreditCardIcon className="h-6 w-6" />, color: 'bg-purple-500', to: '/payment' },
  { label: 'Pay Bill', icon: <ReceiptPercentIcon className="h-6 w-6" />, color: 'bg-green-500', to: '/pay-bill' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance().finally(() => setLoading(false));
  }, []);

  const fetchBalance = async () => {
    try {
      const { data } = await walletApi.getBalance();
      setWallet(data.data);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 pb-16 pt-6">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-200">Welcome back,</p>
              <h1 className="text-lg font-bold text-white">{user?.fullName || 'User'}</h1>
            </div>
            <button
              onClick={logout}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-md px-4">
        {/* Balance Card */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-lg">
          {loading ? (
            <LoadingSpinner size="md" className="py-4" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Available Balance</p>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {showBalance ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {showBalance ? formatBDT(wallet?.balance || 0) : '* * * * *'}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                <span>{wallet?.owner?.typeName || 'CUSTOMER'} Account</span>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                disabled={action.disabled}
                onClick={() => !action.disabled && navigate(action.to)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md disabled:opacity-40"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${action.color} text-white`}>
                  {action.icon}
                </div>
                <span className="text-[11px] font-medium text-gray-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

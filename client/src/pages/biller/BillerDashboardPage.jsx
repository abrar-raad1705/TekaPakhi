import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRightEndOnRectangleIcon, 
  ArrowUpRightIcon 
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function BillerDashboardPage() {
  const { user, logout } = useAuth();
  const theme = getDashboardTheme("BILLER");
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
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className={`min-h-dvh ${theme.dashboardBgClass} pb-20`}>
      {/* Header */}
      <div className={`${theme.headerClass} px-4 pb-16 pt-6`}>
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme.subtitleClass}`}>Biller Dashboard</p>
              <h1 className="text-lg font-bold text-white">
                {user?.fullName || "Biller"}
              </h1>
            </div>
            <button
              onClick={logout}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              title="Logout"
            >
              <ArrowRightEndOnRectangleIcon
                className="h-5 w-5"
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-md px-4">
        {/* Balance Card */}
        <div className={`mb-6 rounded-2xl border-2 border-white bg-white p-5 shadow-2xl ${theme.cardShadowClass}`}>
          {loading ? (
            <LoadingSpinner size="md" className="py-4" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Collections Balance</p>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className={`text-sm font-bold ${theme.balanceBtnClass}`}
                >
                  {showBalance ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-3xl font-bold text-gray-950 tracking-tight">
                {showBalance ? formatBDT(wallet?.balance || 0) : "৳ * * * * *"}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <span className={`inline-block h-2 w-2 rounded-full ${theme.statusDotClass} shadow-sm`} />
                <span className={theme.statusTextClass}>
                  Biller Account
                </span>
              </div>
            </>
          )}
        </div>

        {/* Info */}
        <div className={`mb-6 rounded-2xl border-2 border-white bg-white/60 backdrop-blur-sm p-6 shadow-xl ${theme.cardShadowClass} transition-all hover:bg-white hover:shadow-2xl`}>
          <h2 className="mb-2 text-[15px] font-extrabold text-gray-900 tracking-tight uppercase">
            Bill Collections
          </h2>
          <p className="text-[13px] font-medium leading-relaxed text-gray-500">
            Customers pay their bills by entering your service number (
            <span className="font-bold text-primary-600">{user?.phoneNumber}</span>) in the
            "Pay Bill" section of their app. Payments are credited to your balance
            automatically.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4">
          <Link
            to="/transaction/CASH_OUT"
            className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border-2 border-white bg-white p-5 shadow-lg ${theme.cardShadowClass} transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-95`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.iconBgClass} ${theme.iconTextClass} shadow-inner`}>
                <ArrowUpRightIcon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Cash Out</h3>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Withdraw Funds via Agent</p>
              </div>
            </div>
            <div className={`rounded-full p-2 ${theme.iconBgAltClass} ${theme.iconTextAltClass} opacity-0 transition-all group-hover:opacity-100`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightEndOnRectangleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import { TransactionTypeGlyph } from "../../constants/transactionTypeUi";
import BottomNav from "../../components/layout/BottomNav";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const quickActions = [
  {
    label: "Cash In",
    typeName: "CASH_IN",
    to: "/cash-in",
    desc: "Fund customer wallet",
  },
  {
    label: "Pay Bill",
    typeName: "PAY_BILL",
    to: "/pay-bill",
    desc: "Pay utility bills",
  },
];

export default function AgentDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = getDashboardTheme("AGENT");
  const [wallet, setWallet] = useState(null);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPendingKYC = user?.accountStatus === "PENDING_KYC";

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
    <div className="min-h-dvh bg-gray-50 pb-20">
      {/* Header */}
      <div className={`${theme.headerClass} px-4 pb-16 pt-6`}>
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme.subtitleClass}`}>Agent Dashboard</p>
              <h1 className="text-lg font-bold text-white">
                {user?.fullName || "Agent"}
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
        {/* KYC Pending Banner */}
        {isPendingKYC && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500"
                strokeWidth={2}
              />
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Verification Pending
                </p>
                <p className="mt-0.5 text-xs text-yellow-600">
                  Your agent account is under review. Transactions will be
                  enabled once verified by admin.
                </p>
              </div>
            </div>
          </div>
        )}

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
                  className={`text-sm font-medium ${theme.balanceBtnClass}`}
                >
                  {showBalance ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {showBalance ? formatBDT(wallet?.balance || 0) : "৳ * * * * *"}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <span className={`inline-block h-2 w-2 rounded-full ${theme.statusDotClass}`} />
                <span>Agent Account</span>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Services</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                disabled={action.disabled || isPendingKYC}
                onClick={() =>
                  !action.disabled && !isPendingKYC && navigate(action.to)
                }
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md disabled:opacity-40"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center ${theme.quickActionTileClass}`}
                >
                  <TransactionTypeGlyph
                    typeName={action.typeName}
                    className={`h-6 w-6 ${theme.quickActionIconClass}`}
                  />
                </div>
                <span className="text-[11px] font-medium text-gray-600">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

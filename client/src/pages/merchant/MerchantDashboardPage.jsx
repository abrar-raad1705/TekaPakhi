import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightEndOnRectangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import { TransactionTypeGlyph } from "../../constants/transactionTypeUi";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const quickActions = [
  {
    label: "Agent Cashout",
    typeName: "CASH_OUT",
    to: "/cash-out",
    desc: "Cash out via agent",
  },
  {
    label: "Send Money",
    typeName: "SEND_MONEY",
    to: "/send-money",
    desc: "Send to customer",
  },
  {
    label: "Pay Bill",
    typeName: "PAY_BILL",
    to: "/pay-bill",
    desc: "Pay utility bills",
  },
  {
    label: "Merchant Payment",
    typeName: "PAYMENT",
    to: "/payment",
    desc: "Pay a merchant",
  },
];

export default function MerchantDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = getDashboardTheme("MERCHANT");
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
    <div className={`min-h-dvh ${theme.dashboardBgClass} pb-20`}>
      {/* Header */}
      <div className={`${theme.headerClass} px-4 pb-16 pt-6`}>
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme.subtitleClass}`}>Merchant Dashboard</p>
              <h1 className="text-lg font-bold text-white">
                {user?.fullName || "Merchant"}
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
          <div className="mb-6 rounded-2xl border-2 border-white bg-white p-5 shadow-2xl shadow-yellow-200/40">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-50 shadow-sm ring-1 ring-yellow-200/50">
                <ExclamationCircleIcon
                  className="h-7 w-7 text-yellow-500"
                  strokeWidth={2}
                />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <h3 className="text-sm font-black uppercase tracking-[0.05em] text-yellow-900">
                  Verification Pending
                </h3>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-yellow-800/70">
                  Your merchant account is under review. You'll start receiving
                  payments once verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Balance Card */}
        <div className={`mb-6 rounded-2xl border-2 border-white bg-white p-5 shadow-2xl ${theme.cardShadowClass}`}>
          {loading ? (
            <LoadingSpinner size="md" className="py-4" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Merchant Balance</p>
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
                  Merchant Account
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h2 className="mb-4 text-[15px] font-extrabold text-gray-900 tracking-tight">Services</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                disabled={isPendingKYC}
                onClick={() => !isPendingKYC && navigate(action.to)}
                className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-sm p-4 shadow-xl ${theme.cardShadowClass} transition-all hover:-translate-y-1 hover:bg-white hover:shadow-2xl active:scale-95 disabled:opacity-40`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center ${theme.quickActionTileClass}`}
                >
                  <TransactionTypeGlyph
                    typeName={action.typeName}
                    className={`h-6 w-6 ${theme.quickActionIconClass}`}
                  />
                </div>
                <span className="text-[13px] font-bold text-gray-800 tracking-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Receive Payments Info */}
        <div className={`mb-6 rounded-2xl border-2 border-white bg-white/60 backdrop-blur-sm p-5 shadow-xl ${theme.cardShadowClass}`}>
          <h2 className="mb-2 text-sm font-black uppercase tracking-wider text-gray-950">
            How to Receive Payments
          </h2>
          <p className="text-[13px] font-medium leading-relaxed text-gray-500">
            Customers can pay you by entering your phone number (
            <span className="font-bold text-primary-600">{user?.phoneNumber}</span>) in the
            "Payment" section of their app.
          </p>
        </div>
      </div>
    </div>
  );
}

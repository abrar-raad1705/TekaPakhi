import { useState, useEffect } from "react";
import {
  ArrowRightEndOnRectangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import BottomNav from "../../components/layout/BottomNav";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function MerchantDashboardPage() {
  const { user, logout } = useAuth();
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
    <div className="min-h-dvh bg-gray-50 pb-20">
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
                  Your merchant account is under review. You'll start receiving
                  payments once verified by admin.
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
                <p className="text-sm text-gray-500">Merchant Balance</p>
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
                <span>Merchant Account</span>
              </div>
            </>
          )}
        </div>

        {/* Receive Payments Info */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">
            How to Receive Payments
          </h2>
          <p className="text-xs text-gray-500">
            Customers can send you payments by entering your phone number (
            {user?.phoneNumber}) in the "Payment" section of their app.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

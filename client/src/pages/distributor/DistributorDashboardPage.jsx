import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightEndOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import { TransactionTypeGlyph } from "../../constants/transactionTypeUi";
import BottomNav from "../../components/layout/BottomNav";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function DistributorDashboardPage() {
  const { user, logout } = useAuth();
  const theme = getDashboardTheme("DISTRIBUTOR");
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
              <p className={`text-sm ${theme.subtitleClass}`}>Distributor Dashboard</p>
              <h1 className="text-lg font-bold text-white">
                {user?.fullName || "Distributor"}
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
                <span>Distributor Account</span>
              </div>
            </>
          )}
        </div>

        {/* B2B Action */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Services</h2>
          <button
            onClick={() => navigate("/b2b")}
            className="flex w-full items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center ${theme.quickActionTileClass}`}
            >
              <TransactionTypeGlyph
                typeName="B2B"
                className={`h-6 w-6 ${theme.quickActionIconClass}`}
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                B2B Transfer
              </p>
              <p className="text-xs text-gray-500">Send float to agents</p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

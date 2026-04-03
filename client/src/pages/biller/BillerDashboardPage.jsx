import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRightEndOnRectangleIcon, 
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../../context/AuthContext";
import { walletApi } from "../../api/walletApi";
import { formatBDT } from "../../utils/formatCurrency";
import { getDashboardTheme } from "../../utils/roleTheme";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { TransactionTypeGlyph } from "../../constants/transactionTypeUi";
import { toast } from "sonner";

export default function BillerDashboardPage() {
  const { user, logout } = useAuth();
  const theme = getDashboardTheme("BILLER");
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
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Collections Balance</p>
                  
                  {/* Tooltip Trigger: Info Icon */}
                  <div className="group relative flex items-center cursor-help">
                    <InformationCircleIcon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary-500" />
                    
                    {/* Premium Light Tooltip */}
                    <div className="absolute left-1/2 top-7 z-50 w-64 -translate-x-[85%] -translate-y-2 scale-95 rounded-xl border border-gray-100 bg-white p-4 shadow-2xl shadow-gray-200 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 pointer-events-auto">
                      <h3 className="mb-1.5 text-xs font-black uppercase tracking-widest text-gray-950">Bill Collections</h3>
                      <p className="text-[12px] font-medium leading-relaxed text-gray-500">
                        Customers pay bills by entering your service number{" "}
                        <span className="whitespace-nowrap">
                          (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(user?.phoneNumber);
                              toast.success("Service number copied!", { duration: 1500 });
                            }}
                            className="font-bold text-primary-600 hover:text-primary-700 underline underline-offset-2 decoration-primary-200 hover:decoration-primary-600 transition-all cursor-pointer"
                            title="Click to copy"
                          >
                            {user?.phoneNumber}
                          </button>
                          )
                        </span>{" "}
                        in the "Pay Bill" section of their app.
                      </p>
                      
                      {/* Tooltip Arrow: Pointing to (i) icon */}
                      <div className="absolute -top-1 right-[12%] h-2 w-2 rotate-45 border-l border-t border-gray-100 bg-white" />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className={`px-3 py-1 text-sm font-bold transition-all hover:opacity-80 active:scale-95 ${theme.balanceBtnClass}`}
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-4">
          <Link
            to="/cash-out"
            className={`flex w-full items-center gap-5 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-sm p-5 shadow-xl ${theme.cardShadowClass} transition-all hover:-translate-y-1 hover:bg-white hover:shadow-2xl active:scale-95`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.quickActionTileClass}`}>
                <TransactionTypeGlyph
                  typeName="CASH_OUT"
                  className={`h-6 w-6 ${theme.quickActionIconClass}`}
                />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[15px] font-bold text-gray-900 tracking-tight">
                  Cash Out
                </p>
                <p className="text-[13px] font-medium text-gray-500">Withdraw funds via agent</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

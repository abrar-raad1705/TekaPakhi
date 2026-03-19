import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import OTPInput from "../../components/common/OTPInput";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthFooter from "../../components/auth/AuthFooter";
import { GlobalError } from "../../components/common/FormError";
import { formatPhone } from "../../utils/formatCurrency";

export default function VerifyPhonePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, logout, isAuthenticated } = useAuth();
  const { phoneNumber, otp: initialOtp } = location.state || {};
  const [currentDevOtp, setCurrentDevOtp] = useState(initialOtp);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  useEffect(() => {
    if (phoneNumber && !initialOtp) {
      handleResend(true);
    }
  }, [phoneNumber, initialOtp]);

  const handleVerify = async (otpCode) => {
    setLoading(true);
    setGlobalError(null);
    try {
      await authApi.verifyOtp({
        phoneNumber,
        otpCode,
        purpose: "VERIFY_PHONE",
      });

      if (isAuthenticated && user) {
        const updatedUser = { ...user, isPhoneVerified: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        const routeMap = {
          SYSTEM: "/admin",
          AGENT: "/agent",
          MERCHANT: "/merchant",
          DISTRIBUTOR: "/distributor",
          BILLER: "/biller",
        };
        navigate(routeMap[user.typeName] || "/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (error) {
      setGlobalError({
        message: error.response?.data?.message || "Verification failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (isAuto = false) => {
    if (requesting) return;
    setRequesting(true);
    setGlobalError(null);
    try {
      const { data } = await authApi.requestOtp({
        phoneNumber,
        purpose: "VERIFY_PHONE",
      });
      if (data.data.otp) {
        setCurrentDevOtp(data.data.otp);
      }
    } catch (error) {
      if (!isAuto) setGlobalError({ message: "Failed to resend OTP" });
    } finally {
      setRequesting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!phoneNumber) {
    navigate("/register", { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      <AuthHeader onClose={handleLogout} />

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 py-10 md:py-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Verify your phone
          </h1>
          <p className="mt-4 text-[15px] font-medium text-gray-500 leading-relaxed px-4">
            We've sent a 6-digit code to{" "}
            <span className="font-bold text-gray-900">{formatPhone(phoneNumber)}</span>
          </p>
          {currentDevOtp && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary-50 px-4 py-2 border border-primary-100">
              <span className="text-[11px] font-black uppercase tracking-widest text-primary-400">
                Dev OTP
              </span>
              <span className="text-sm font-black font-mono text-primary-600 tracking-wider">
                {currentDevOtp}
              </span>
            </div>
          )}
        </div>

        {globalError && (
          <GlobalError
            message={globalError.message}
            onClose={() => setGlobalError(null)}
          />
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <OTPInput onComplete={handleVerify} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6 text-center">
          <button
            onClick={() => handleResend(false)}
            disabled={requesting}
            className="text-[15px] font-bold text-gray-600 hover:text-primary-700 underline underline-offset-8 decoration-2 decoration-gray-100 hover:decoration-primary-600 transition-all disabled:opacity-50"
          >
            {requesting ? "Sending code..." : "Resend code"}
          </button>

          {isAuthenticated && (
            <div className="border-t border-gray-100 pt-10 mt-6">
              <button
                onClick={handleLogout}
                className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Use a different account
              </button>
            </div>
          )}
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}

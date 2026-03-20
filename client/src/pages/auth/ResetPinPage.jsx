import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import OTPInput from "../../components/common/OTPInput";
import PinInput from "../../components/common/PinInput";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AuthFooter from "../../components/auth/AuthFooter";
import { FieldError, GlobalError } from "../../components/common/FormError";
import { formatPhone } from "../../utils/formatCurrency";

export default function ResetPinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber, otp: initialOtp } = location.state || {};
  const [currentDevOtp, setCurrentDevOtp] = useState(initialOtp);

  const [step, setStep] = useState("otp"); // 'otp' or 'newPin'
  const [otpCode, setOtpCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const handleOtpComplete = async (code) => {
    setLoading(true);
    setGlobalError(null);
    try {
      await authApi.verifyOtp({
        phoneNumber,
        otpCode: code,
        purpose: "RESET_PIN",
      });
      setOtpCode(code);
      setStep("newPin");
    } catch (error) {
      setGlobalError({
        message: error.response?.data?.message || "OTP verification failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setGlobalError(null);
    try {
      const { data } = await authApi.requestOtp({
        phoneNumber,
        purpose: "RESET_PIN",
      });
      if (data.data.otp) {
        setCurrentDevOtp(data.data.otp);
      }
    } catch (error) {
      setGlobalError({ message: "Failed to resend OTP" });
    }
  };

  const handleResetPin = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const newErrors = {};
    if (!/^\d{5}$/.test(newPin)) {
      newErrors.newPin = "PIN must be exactly 5 digits";
    }
    if (newPin !== confirmPin) {
      newErrors.confirmPin = "PINs do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPin({ phoneNumber, otpCode, newPin });
      navigate("/login", { replace: true });
    } catch (error) {
      setGlobalError({
        message: error.response?.data?.message || "Reset failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!phoneNumber) {
    navigate("/forgot-pin", { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 py-10 md:py-24">
        {step === "otp" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                Enter reset code
              </h1>
              <p className="mt-4 text-[15px] font-medium text-gray-500 leading-relaxed px-4">
                Code sent to{" "}
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
              <>
                <div className="mb-10">
                  <OTPInput onComplete={handleOtpComplete} />
                </div>
                <div className="text-center">
                  <button
                    onClick={handleResend}
                    className="text-[15px] font-bold text-gray-900 hover:text-primary-700 underline underline-offset-4 decoration-2 decoration-gray-200 hover:decoration-primary-600 transition-all"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                Set new PIN
              </h1>
              <p className="mt-4 text-[15px] font-medium text-gray-500 leading-relaxed px-4">
                Choose a secure 5-digit number that you'll remember.
              </p>
            </div>

            {globalError && (
              <GlobalError
                message={globalError.message}
                onClose={() => setGlobalError(null)}
              />
            )}

            <form onSubmit={handleResetPin} className="space-y-8">
              <div className="space-y-2">
                <PinInput
                  length={5}
                  onChange={(pin) => {
                    setNewPin(pin);
                    if (errors.newPin)
                      setErrors((prev) => ({ ...prev, newPin: null }));
                  }}
                  label="New PIN"
                  error={!!errors.newPin}
                />
                <FieldError message={errors.newPin} />
              </div>

              <div className="space-y-2">
                <PinInput
                  length={5}
                  onChange={(pin) => {
                    setConfirmPin(pin);
                    if (errors.confirmPin)
                      setErrors((prev) => ({ ...prev, confirmPin: null }));
                  }}
                  label="Confirm PIN"
                  error={!!errors.confirmPin}
                />
                <FieldError message={errors.confirmPin} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" /> : "Set new PIN"}
              </button>
            </form>
          </div>
        )}
      </main>

      <AuthFooter />
    </div>
  );
}

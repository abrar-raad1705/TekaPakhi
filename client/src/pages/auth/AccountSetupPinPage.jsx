import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/authApi";
import PinInput from "../../components/common/PinInput";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { FieldError, GlobalError } from "../../components/common/FormError";
import AuthFooter from "../../components/auth/AuthFooter";

const ROLE_CONFIG = {
  DISTRIBUTOR: { subtitle: "Create a 5-digit PIN to secure your account and transactions." },
  BILLER: { subtitle: "Create a 5-digit PIN to secure your biller account." },
};

export default function AccountSetupPinPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [securityPin, setSecurityPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);

  const config = ROLE_CONFIG[user?.typeName] ?? ROLE_CONFIG.DISTRIBUTOR;
  const homeRoute = user?.typeName === "BILLER" ? "/biller" : "/distributor";

  const validate = () => {
    const next = {};
    if (!/^\d{5}$/.test(securityPin))
      next.securityPin = "PIN must be exactly 5 digits";
    if (securityPin !== confirmPin) next.confirmPin = "PINs do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.finalizeAccountPin({ newPin: securityPin, confirmPin });
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const next = { ...u, requiresPinSetup: false };
        localStorage.setItem("user", JSON.stringify(next));
        setUser(next);
      }
      navigate(homeRoute, { replace: true });
    } catch (err) {
      setGlobalError({
        message:
          err.response?.data?.message || "Could not save PIN. Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 py-12 md:py-20">
        <div className="mb-10 text-center relative">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            Setup your PIN
          </h1>
          <p className="mt-3 text-[15px] font-medium text-gray-500">
            {config.subtitle}
          </p>
        </div>

        {globalError && (
          <GlobalError
            message={globalError.message}
            onClose={() => setGlobalError(null)}
          />
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <div className="space-y-10">
            <div className="space-y-8">
              <div className="space-y-2">
                <PinInput
                  length={5}
                  onChange={(pin) => {
                    setSecurityPin(pin);
                    if (errors.securityPin)
                      setErrors((prev) => ({ ...prev, securityPin: null }));
                  }}
                  label="Set 5-digit PIN"
                  error={!!errors.securityPin}
                />
                <FieldError message={errors.securityPin} />
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
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" /> : "Continue"}
              </button>
              <p className="mt-8 text-center text-sm font-medium text-gray-500 leading-relaxed">
                Need to use another account?{" "}
                <Link
                  to="/login"
                  className="font-bold text-primary-600 hover:underline underline-offset-4 decoration-2"
                >
                  Sign out
                </Link>
              </p>
            </div>
          </div>
        </form>
      </main>
      <AuthFooter />
    </div>
  );
}

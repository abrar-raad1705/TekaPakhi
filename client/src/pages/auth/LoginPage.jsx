import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/authApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PinInput from "../../components/common/PinInput";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthFooter from "../../components/auth/AuthFooter";
import { FieldError, GlobalError } from "../../components/common/FormError";

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const newErrors = {};
    if (!/^01[3-9][0-9]{8}$/.test(phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }
    if (!/^\d{5}$/.test(securityPin)) {
      newErrors.securityPin = "Please fill this field";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const result = await login(phoneNumber, securityPin);
    if (result.success) {
      const profile = result.data.profile;

      if (!profile.isPhoneVerified) {
        try {
          const { data } = await authApi.requestOtp({
            phoneNumber,
            purpose: "VERIFY_PHONE",
          });
          navigate("/verify-phone", {
            state: { phoneNumber, otp: data.data.otp },
            replace: true,
          });
        } catch {
          navigate("/verify-phone", { state: { phoneNumber }, replace: true });
        }
        return;
      }

      const routeMap = {
        SYSTEM: "/admin",
        AGENT: "/agent",
        MERCHANT: "/merchant",
        DISTRIBUTOR: "/distributor",
        BILLER: "/biller",
      };
      navigate(routeMap[profile.typeName] || "/dashboard", { replace: true });
    } else {
      const match = result.message.match(/(\d+)/);
      const attempts = match ? match[1] : null;

      if (attempts) {
        setGlobalError({
          message: `Your Phone number and PIN didn't match. You have ${attempts} attempt(s) remaining.`,
          actionLink: "/forgot-pin",
          actionText: "Reset PIN",
        });
      } else {
        setGlobalError({
          message: result.message || "Invalid credentials",
          actionLink: "/forgot-pin",
          actionText: "Reset PIN",
        });
      }
    }
  };

  return (
    <div className="flex min-h-[108dvh] flex-col bg-white overflow-x-hidden">
      <AuthHeader onClose={() => navigate("/")} />

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-6 py-12 md:py-20">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            Welcome back
          </h1>
          <p className="mt-3 text-[15px] font-medium text-gray-500">
            New to TekaPakhi?{" "}
            <Link
              to="/register"
              className="font-bold text-gray-900 hover:text-primary-700 underline decoration-2 underline-offset-4 decoration-gray-200 hover:decoration-primary-700 transition-all"
            >
              Sign up
            </Link>
          </p>
        </div>

        {globalError && (
          <GlobalError
            message={globalError.message}
            actionLink={globalError.actionLink}
            actionText={globalError.actionText}
            onClose={() => setGlobalError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-2">
            <label className="block text-[15px] font-bold text-gray-700">
              Phone number
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-gray-400 group-focus-within:text-primary-600 transition-colors">
                +88
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 11),
                  );
                  if (errors.phoneNumber)
                    setErrors((prev) => ({ ...prev, phoneNumber: null }));
                }}
                placeholder="01XXXXXXXXX"
                className={`w-full rounded-xl border-2 py-4 pl-12 pr-4 text-[15px] font-medium transition-all focus:outline-none ${
                  errors.phoneNumber
                    ? "border-[#CD1C1C] focus:border-[#CD1C1C]"
                    : "border-gray-200 focus:border-primary-500"
                }`}
                maxLength={11}
              />
            </div>
            <FieldError message={errors.phoneNumber} />
          </div>

          <div className="space-y-2">
            <PinInput
              length={5}
              onChange={(pin) => {
                setSecurityPin(pin);
                if (errors.securityPin)
                  setErrors((prev) => ({ ...prev, securityPin: null }));
              }}
              label="Enter your PIN"
              error={!!errors.securityPin}
            />
            <FieldError message={errors.securityPin} />
            <div className="pt-1">
              <Link
                to="/forgot-pin"
                className="text-[15px] font-bold text-gray-900 hover:text-primary-700 underline decoration-2 underline-offset-4 decoration-gray-200 hover:decoration-primary-700 transition-all"
              >
                Forgot PIN number?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4 text-base font-bold text-white shadow-md shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Log in"}
          </button>
        </form>
      </main>

      <AuthFooter />
    </div>
  );
}

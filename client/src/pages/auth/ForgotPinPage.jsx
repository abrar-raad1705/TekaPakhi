import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AuthFooter from "../../components/auth/AuthFooter";
import { FieldError, GlobalError } from "../../components/common/FormError";

export default function ForgotPinPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setGlobalError(null);

    if (!/^01[3-9][0-9]{8}$/.test(phoneNumber)) {
      return setErrors({ phoneNumber: "Please enter a valid phone number" });
    }

    setLoading(true);
    try {
      const { data } = await authApi.forgotPin({ phoneNumber });
      navigate("/reset-pin", {
        state: { phoneNumber, otp: data.data.otp },
      });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to send OTP";
      if (message.toLowerCase().includes("distributor")) {
        setErrors({ phoneNumber: message });
      } else {
        setGlobalError({ message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 py-10 md:py-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Trouble logging in?
          </h1>
          <p className="mt-4 text-[15px] font-medium text-gray-500 leading-relaxed px-4">
            Enter your phone number and we'll send you a code to reset your PIN.
          </p>
        </div>

        {globalError && (
          <GlobalError
            message={globalError.message}
            onClose={() => setGlobalError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
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
                className={`w-full rounded-xl border-2 py-4 pl-14 pr-4 text-[15px] font-medium transition-all focus:outline-none ${
                  errors.phoneNumber
                    ? "border-[#CD1C1C] focus:border-[#CD1C1C]"
                    : "border-gray-200 focus:border-primary-500"
                }`}
                maxLength={11}
              />
            </div>
            <FieldError message={errors.phoneNumber} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Send reset code"}
          </button>
        </form>

        <div className="mt-10 border-t border-gray-100 pt-10 text-center">
          <Link
            to="/login"
            className="text-[15px] font-bold text-gray-900 hover:text-primary-600 underline decoration-2 underline-offset-4 decoration-gray-200 hover:decoration-primary-600 transition-all"
          >
            Back to login
          </Link>
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}

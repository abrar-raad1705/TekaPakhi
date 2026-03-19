import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/authApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PinInput from "../../components/common/PinInput";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthFooter from "../../components/auth/AuthFooter";
import { FieldError, GlobalError } from "../../components/common/FormError";
import {
  ChevronLeftIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const accountTypes = [
  { id: "CUSTOMER", label: "Personal", desc: "Send & receive money" },
  { id: "AGENT", label: "Agent", desc: "Cash in/out services" },
  { id: "MERCHANT", label: "Merchant", desc: "Accept payments" },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [tempType, setTempType] = useState("CUSTOMER");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: "",
    fullName: "",
    securityPin: "",
    confirmPin: "",
    accountType: "CUSTOMER",
    shopName: "",
    shopAddress: "",
    businessName: "",
    businessType: "",
  });

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const updateField = (field) => (e) => {
    let value = e.target.value;
    if (field === "phoneNumber") value = value.replace(/\D/g, "").slice(0, 11);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const clearFormForType = (newType) => {
    setForm({
      phoneNumber: "",
      fullName: "",
      securityPin: "",
      confirmPin: "",
      accountType: newType,
      shopName: "",
      shopAddress: "",
      businessName: "",
      businessType: "",
    });
    setErrors({});
  };

  const handleConfirmType = () => {
    if (tempType !== form.accountType) {
      clearFormForType(tempType);
    }
    setShowTypeSelection(false);
  };

  const validateStep1Fields = () => {
    const newErrors = {};
    if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Please enter your full name";
    }
    if (!/^01[3-9][0-9]{8}$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    if (form.accountType === "AGENT") {
      if (!form.shopName.trim()) newErrors.shopName = "Please enter shop name";
    }
    if (form.accountType === "MERCHANT") {
      if (!form.businessName.trim())
        newErrors.businessName = "Please enter business name";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!/^\d{5}$/.test(form.securityPin)) {
      newErrors.securityPin = "PIN must be exactly 5 digits";
    }
    if (form.securityPin !== form.confirmPin) {
      newErrors.confirmPin = "PINs do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep1Fields()) return;

    setIsVerifyingPhone(true);
    setGlobalError(null);
    try {
      const response = await authApi.checkPhone({
        phoneNumber: form.phoneNumber,
      });
      if (response.data.data.exists) {
        setErrors({ phoneNumber: "This phone number is already registered" });
        return;
      }
      setStep(2);
    } catch (err) {
      setGlobalError({
        message: "Communication error with server. Please try again.",
      });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep2()) return;

    const payload = {
      phoneNumber: form.phoneNumber,
      fullName: form.fullName.trim(),
      securityPin: form.securityPin,
      accountType: form.accountType,
    };
    if (form.accountType === "AGENT") {
      payload.shopName = form.shopName.trim();
      payload.shopAddress = form.shopAddress.trim() || undefined;
    }
    if (form.accountType === "MERCHANT") {
      payload.businessName = form.businessName.trim();
      payload.businessType = form.businessType.trim() || undefined;
    }

    const result = await register(payload);
    if (result.success) {
      navigate("/verify-phone", {
        state: { phoneNumber: form.phoneNumber, otp: result.data.otp },
      });
    } else {
      setGlobalError({ message: result.message });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      <AuthHeader onClose={() => navigate("/login")} />

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 py-12 md:py-20">
        <div className="mb-10 text-center relative">
          {(step === 2 ||
            (step === 1 &&
              (showTypeSelection || form.accountType !== "CUSTOMER"))) && (
            <button
              onClick={() => {
                if (step === 2) setStep(1);
                else if (showTypeSelection) setShowTypeSelection(false);
                else setShowTypeSelection(true);
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            {showTypeSelection
              ? "Account type"
              : step === 1
                ? "Join TekaPakhi"
                : "Setup your PIN"}
          </h1>
          <p className="mt-3 text-[15px] font-medium text-gray-500">
            {showTypeSelection
              ? "Select your role correctly"
              : step === 1
                ? (
                  <>
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-gray-900 hover:text-primary-700 underline decoration-2 underline-offset-4 decoration-gray-200 hover:decoration-primary-700 transition-all font-sans"
                  >
                    Log in
                  </Link>
                  </>
                )
                : "Step 2 of 2: Security setup"}
          </p>
        </div>

        {globalError && (
          <GlobalError
            message={globalError.message}
            onClose={() => setGlobalError(null)}
          />
        )}

        <div className="flex-1">
          {showTypeSelection ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 py-2">
                  Choose account type
                </label>
                <div className="grid gap-3">
                  {accountTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTempType(type.id)}
                      className={`group relative flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all
                          ${
                            tempType === type.id
                              ? "border-primary-600 bg-primary-50 ring-4 ring-primary-50/50 shadow-sm"
                              : "border-gray-100 bg-white hover:border-gray-300"
                          }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all
                          ${tempType === type.id ? "border-primary-600 bg-primary-600" : "border-gray-200"}`}
                      >
                        {tempType === type.id && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{type.label}</p>
                        <p className="text-sm text-gray-500 font-medium">
                          {type.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmType}
                  className="w-full rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]"
                >
                  Confirm selection
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={step === 1 ? handleNext : handleSubmit}
              className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {step === 1 ? (
                <div className="space-y-6">
                  {/* Removed Role Selected box */}

                  <div className="space-y-2">
                    <label className="block text-[15px] font-bold text-gray-700">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={updateField("fullName")}
                      placeholder="e.g. John Doe"
                      className={`w-full rounded-xl border-2 py-4 px-4 text-[15px] font-medium transition-all focus:outline-none ${
                        errors.fullName
                          ? "border-[#CD1C1C] focus:border-[#CD1C1C]"
                          : "border-gray-200 focus:border-primary-500"
                      }`}
                    />
                    <FieldError message={errors.fullName} />
                  </div>

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
                        value={form.phoneNumber}
                        onChange={updateField("phoneNumber")}
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

                  {/* Role-specific Fields */}
                  {form.accountType === "AGENT" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[15px] font-bold text-gray-700">
                          Shop name
                        </label>
                        <input
                          type="text"
                          value={form.shopName}
                          onChange={updateField("shopName")}
                          placeholder="e.g. My Awesome Shop"
                          className={`w-full rounded-xl border-2 py-4 px-4 text-[15px] font-medium transition-all focus:outline-none ${
                            errors.shopName
                              ? "border-[#CD1C1C] focus:border-[#CD1C1C]"
                              : "border-gray-200 focus:border-primary-500"
                          }`}
                        />
                        <FieldError message={errors.shopName} />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-bold text-gray-700">
                          Shop address (optional)
                        </label>
                        <input
                          type="text"
                          value={form.shopAddress}
                          onChange={updateField("shopAddress")}
                          placeholder="e.g. 123 Street Name"
                          className="w-full rounded-xl border-2 border-gray-200 py-4 px-4 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {form.accountType === "MERCHANT" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="block text-[15px] font-bold text-gray-700">
                          Business name
                        </label>
                        <input
                          type="text"
                          value={form.businessName}
                          onChange={updateField("businessName")}
                          placeholder="e.g. Acme Corp"
                          className={`w-full rounded-xl border-2 py-4 px-4 text-[15px] font-medium transition-all focus:outline-none ${
                            errors.businessName
                              ? "border-[#CD1C1C] focus:border-[#CD1C1C]"
                              : "border-gray-200 focus:border-primary-500"
                          }`}
                        />
                        <FieldError message={errors.businessName} />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[15px] font-bold text-gray-700">
                          Business type (optional)
                        </label>
                        <input
                          type="text"
                          value={form.businessType}
                          onChange={updateField("businessType")}
                          placeholder="e.g. Retail"
                          className="w-full rounded-xl border-2 border-gray-100 py-4 px-4 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {form.accountType === "CUSTOMER" && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setTempType(form.accountType);
                          setShowTypeSelection(true);
                        }}
                        className="text-[15px] font-bold text-gray-400 hover:text-primary-600 underline underline-offset-8 decoration-2 decoration-gray-200 hover:decoration-primary-700 transition-all font-sans"
                      >
                        Register as Agent or Merchant?
                      </button>
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isVerifyingPhone}
                      className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isVerifyingPhone ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "Continue"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <PinInput
                        length={5}
                        onChange={(pin) => {
                          setForm((prev) => ({ ...prev, securityPin: pin }));
                          if (errors.securityPin)
                            setErrors((prev) => ({
                              ...prev,
                              securityPin: null,
                            }));
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
                          setForm((prev) => ({ ...prev, confirmPin: pin }));
                          if (errors.confirmPin)
                            setErrors((prev) => ({
                              ...prev,
                              confirmPin: null,
                            }));
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
                      {loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "Create your account"
                      )}
                    </button>
                    <p className="mt-8 text-center text-sm font-medium text-gray-500 leading-relaxed">
                      By signing up, you agree to our{" "}
                      <a
                        href="#"
                        className="font-bold text-primary-600 hover:underline underline-offset-4 decoration-2"
                      >
                        Terms of Use
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="font-bold text-primary-600 hover:underline underline-offset-4 decoration-2"
                      >
                        Privacy Policy
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PinInput from "../../components/common/PinInput";
import AuthHeader from "../../components/auth/AuthHeader";
import AuthFooter from "../../components/auth/AuthFooter";

export default function ChangePinPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPin: "", newPin: "", confirmPin: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!/^\d{5}$/.test(form.newPin)) {
      return toast.error("New PIN must be exactly 5 digits");
    }
    if (form.newPin !== form.confirmPin) {
      return toast.error("PINs do not match");
    }
    if (form.oldPin === form.newPin) {
      return toast.error("New PIN must be different from old PIN");
    }

    setLoading(true);
    try {
      await authApi.changePin({ oldPin: form.oldPin, newPin: form.newPin });
      toast.success("PIN changed successfully!");
      setTimeout(() => navigate("/profile", { replace: true }), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden">
      <AuthHeader onClose={() => navigate(-1)} />

      {/* Main Content */}

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-6 py-12 md:py-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">
            Change your PIN
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Regularly changing your PIN helps keep your account secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <PinInput
            length={5}
            onChange={(pin) => setForm((prev) => ({ ...prev, oldPin: pin }))}
            label="Current PIN"
          />

          <PinInput
            length={5}
            onChange={(pin) => setForm((prev) => ({ ...prev, newPin: pin }))}
            label="New PIN (5 digits)"
          />

          <PinInput
            length={5}
            onChange={(pin) =>
              setForm((prev) => ({ ...prev, confirmPin: pin }))
            }
            label="Confirm New PIN"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary-500 py-4 text-sm font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Confirm change"}
          </button>
        </form>
      </main>

      <AuthFooter />
    </div>
  );
}

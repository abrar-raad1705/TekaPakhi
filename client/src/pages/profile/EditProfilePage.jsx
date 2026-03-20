import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { profileApi } from "../../api/profileApi";
import { toast } from "sonner";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function EditProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const existing = location.state?.profile;

  const [form, setForm] = useState({
    fullName: existing?.full_name || "",
    email: existing?.email || "",
    nidNumber: existing?.nid_number || "",
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) {
      return toast.error("Name must be at least 2 characters");
    }

    setLoading(true);
    try {
      await profileApi.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        nidNumber: form.nidNumber.trim() || null,
      });
      toast.success("Profile updated!");
      setTimeout(() => navigate("/profile", { replace: true }), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 py-10 md:py-20">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            Update account
          </h1>
          <p className="mt-3 text-[15px] font-medium text-gray-500">
            Keep your profile information accurate
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="block text-[15px] font-bold text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={updateField("fullName")}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border-2 border-gray-200 py-4 px-4 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[15px] font-bold text-gray-700">
              Email Address (optional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={updateField("email")}
              placeholder="your@email.com"
              className="w-full rounded-xl border-2 border-gray-200 py-4 px-4 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[15px] font-bold text-gray-700">
              NID Number (optional)
            </label>
            <input
              type="text"
              value={form.nidNumber}
              onChange={updateField("nidNumber")}
              placeholder="Enter your NID number"
              className="w-full rounded-xl border-2 border-gray-200 py-4 px-4 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
              maxLength={20}
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { adminLoginRequest, adminApi } from "../../api/adminApi";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AuthFooter from "../../components/auth/AuthFooter";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // If a stored token still works, skip the form (avoid stale tokens blindly redirecting to a broken /admin)
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setCheckingSession(false);
      return;
    }
    adminApi
      .getDashboard()
      .then(() => navigate("/admin", { replace: true }))
      .catch(() => {
        localStorage.removeItem("adminToken");
      })
      .finally(() => setCheckingSession(false));
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await adminLoginRequest(password);
      const token = data.data?.adminToken;
      if (!token) {
        setError("Unexpected response from server.");
        return;
      }
      localStorage.setItem("adminToken", token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex flex-col bg-white overflow-x-hidden">
        <main className="mx-auto flex w-full max-w-sm min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm font-medium text-gray-500">
            Checking session...
          </p>
        </main>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white overflow-x-hidden">
      <main className="mx-auto flex w-full max-w-sm min-h-[100dvh] flex-col justify-center px-6 py-12">
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-primary-100 bg-primary-50">
            <LockClosedIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 leading-tight">
            Admin Login
          </h1>
          <p className="mt-3 text-[15px] font-medium text-gray-500">
            Enter the admin password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="block text-[15px] font-bold text-gray-700"
            >
              Password
            </label>
            <div>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 py-4 px-4 text-[15px] font-medium text-gray-900 transition-all focus:border-primary-500 focus:outline-none"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-[#CD1C1C]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-full bg-primary-600 py-4 text-base font-bold text-white shadow-md shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Sign in"}
          </button>
        </form>
      </main>

      <AuthFooter />
    </div>
  );
}

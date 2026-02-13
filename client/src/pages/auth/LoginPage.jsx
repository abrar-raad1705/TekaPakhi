import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'error' });
  const { login, loading, getHomeRoute } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^01[3-9][0-9]{8}$/.test(phoneNumber)) {
      setToast({ message: 'Enter a valid Bangladeshi phone number', type: 'error' });
      return;
    }
    if (!/^\d{4,6}$/.test(securityPin)) {
      setToast({ message: 'PIN must be 4-6 digits', type: 'error' });
      return;
    }

    const result = await login(phoneNumber, securityPin);
    if (result.success) {
      // Navigate to role-specific dashboard based on the profile returned from login
      const typeName = result.data.profile.typeName;
      const routeMap = {
        SYSTEM: '/admin',
        AGENT: '/agent',
        MERCHANT: '/merchant',
        DISTRIBUTOR: '/distributor',
        BILLER: '/biller',
      };
      navigate(routeMap[typeName] || '/dashboard', { replace: true });
    } else {
      setToast({ message: result.message, type: 'error' });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800 px-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />

      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <span className="text-2xl font-bold text-primary-600">TP</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TekaPakhi</h1>
          <p className="mt-1 text-sm text-primary-200">Mobile Financial Services</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">Welcome Back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">+88</span>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  maxLength={11}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Security PIN</label>
              <input
                type="password"
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter your PIN"
                inputMode="numeric"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Login'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-pin" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Forgot PIN?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-primary-200">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-white hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ForgotPinPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^01[3-9][0-9]{8}$/.test(phoneNumber)) {
      return toast.error('Enter a valid phone number');
    }

    setLoading(true);
    try {
      const { data } = await authApi.forgotPin({ phoneNumber });
      toast.success('OTP sent!');
      setTimeout(() => {
        navigate('/reset-pin', {
          state: { phoneNumber, otp: data.data.otp },
        });
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800 px-4">


      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-gray-800">Forgot PIN</h2>
            <p className="mt-1 text-sm text-gray-500">Enter your phone number to receive a reset code</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Send OTP'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

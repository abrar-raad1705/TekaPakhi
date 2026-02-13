import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import OTPInput from '../../components/common/OTPInput';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function VerifyOTPPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber, otp: devOtp } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const handleVerify = async (otpCode) => {
    setLoading(true);
    try {
      await authApi.verifyOtp({ phoneNumber, otpCode });
      setToast({ message: 'Phone verified! Please login.', type: 'success' });
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Verification failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { data } = await authApi.requestOtp({ phoneNumber });
      setToast({ message: `OTP resent${data.data.otp ? ` (Dev: ${data.data.otp})` : ''}`, type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to resend OTP', type: 'error' });
    }
  };

  if (!phoneNumber) {
    navigate('/register', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800 px-4">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Verify Phone Number</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the 6-digit code sent to <span className="font-medium text-gray-700">{phoneNumber}</span>
            </p>
            {devOtp && (
              <p className="mt-2 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                Dev OTP: <span className="font-mono font-bold">{devOtp}</span>
              </p>
            )}
          </div>

          {loading ? (
            <LoadingSpinner size="lg" className="py-8" />
          ) : (
            <OTPInput onComplete={handleVerify} />
          )}

          <div className="mt-6 text-center">
            <button onClick={handleResend} className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Resend OTP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

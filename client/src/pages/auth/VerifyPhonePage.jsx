import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import OTPInput from '../../components/common/OTPInput';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function VerifyPhonePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, logout, isAuthenticated } = useAuth();
  const { phoneNumber, otp: initialOtp } = location.state || {};
  const [currentDevOtp, setCurrentDevOtp] = useState(initialOtp);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // If we arrived here without an OTP (e.g. via PrivateRoute guard), request one automatically
  useEffect(() => {
    if (phoneNumber && !initialOtp) {
      handleResend(true);
    }
  }, [phoneNumber, initialOtp]);

  const handleVerify = async (otpCode) => {
    setLoading(true);
    try {
      await authApi.verifyOtp({ phoneNumber, otpCode, purpose: 'VERIFY_PHONE' });
      toast.success('Phone verified!');

      // If user is logged in, update their profile and go to dashboard
      if (isAuthenticated && user) {
        const updatedUser = { ...user, isPhoneVerified: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setTimeout(() => {
          const routeMap = {
            SYSTEM: '/admin',
            AGENT: '/agent',
            MERCHANT: '/merchant',
            DISTRIBUTOR: '/distributor',
            BILLER: '/biller',
          };
          navigate(routeMap[user.typeName] || '/dashboard', { replace: true });
        }, 1000);
      } else {
        // Not logged in (came from registration), go to login
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (isAuto = false) => {
    if (requesting) return;
    setRequesting(true);
    try {
      const { data } = await authApi.requestOtp({ phoneNumber, purpose: 'VERIFY_PHONE' });
      if (data.data.otp) {
        setCurrentDevOtp(data.data.otp);
      }
      if (!isAuto) toast.success('OTP resent successfully');
    } catch (error) {
      if (!isAuto) toast.error('Failed to resend OTP');
    } finally {
      setRequesting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!phoneNumber) {
    navigate('/register', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800 px-4">

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
            {currentDevOtp && (
              <p className="mt-2 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                Dev OTP: <span className="font-mono font-bold">{currentDevOtp}</span>
              </p>
            )}
          </div>

          {loading ? (
            <LoadingSpinner size="lg" className="py-8" />
          ) : (
            <OTPInput onComplete={handleVerify} />
          )}

          <div className="mt-6 flex flex-col gap-4 text-center">
            <button
              onClick={() => handleResend(false)}
              disabled={requesting}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              {requesting ? 'Requesting...' : 'Resend OTP'}
            </button>

            {isAuthenticated && (
              <div className="border-t border-gray-100 pt-4 text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors duration-200"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

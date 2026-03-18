import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import OTPInput from '../../components/common/OTPInput';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ResetPinPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { phoneNumber, otp: initialOtp } = location.state || {};
  const [currentDevOtp, setCurrentDevOtp] = useState(initialOtp);

  const [step, setStep] = useState('otp'); // 'otp' or 'newPin'
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);


  const handleOtpComplete = async (code) => {
    setLoading(true);
    try {
      await authApi.verifyOtp({ phoneNumber, otpCode: code, purpose: 'RESET_PIN' });
      setOtpCode(code);
      setStep('newPin');
    } catch (error) {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { data } = await authApi.requestOtp({ phoneNumber, purpose: 'RESET_PIN' });
      if (data.data.otp) {
        setCurrentDevOtp(data.data.otp);
      }
      toast.success('OTP resent successfully');
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };

  const handleResetPin = async (e) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(newPin)) {
      return toast.error('PIN must be exactly 5 digits');
    }
    if (newPin !== confirmPin) {
      return toast.error('PINs do not match');
    }

    setLoading(true);
    try {
      await authApi.resetPin({ phoneNumber, otpCode, newPin });
      toast.success('PIN reset successful!');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!phoneNumber) {
    navigate('/forgot-pin', { replace: true });
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary-600 to-primary-800 px-4">


      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {step === 'otp' ? (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-gray-800">Enter Reset Code</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Code sent to <span className="font-medium">{phoneNumber}</span>
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
                <>
                  <OTPInput onComplete={handleOtpComplete} />
                  <div className="mt-6 text-center">
                    <button onClick={handleResend} className="text-sm font-medium text-primary-600 hover:text-primary-700">
                      Resend OTP
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-gray-800">Set New PIN</h2>
                <p className="mt-1 text-sm text-gray-500">Choose a new 5-digit security PIN</p>
              </div>
              <form onSubmit={handleResetPin} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">New PIN</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Enter 5-digit PIN"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Confirm PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="Re-enter PIN"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    maxLength={5}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Reset PIN'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

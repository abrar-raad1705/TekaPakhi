import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import Header from '../../components/layout/Header';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinInput from '../../components/common/PinInput';

export default function ChangePinPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [loading, setLoading] = useState(false);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(form.newPin)) {
      return toast.error('New PIN must be exactly 5 digits');
    }
    if (form.newPin !== form.confirmPin) {
      return toast.error('PINs do not match');
    }
    if (form.oldPin === form.newPin) {
      return toast.error('New PIN must be different from old PIN');
    }

    setLoading(true);
    try {
      await authApi.changePin({ oldPin: form.oldPin, newPin: form.newPin });
      toast.success('PIN changed successfully!');
      setTimeout(() => navigate('/profile', { replace: true }), 1500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50">

      <Header title="Change PIN" showBack />

      <div className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-5 shadow-sm">
          <PinInput
            length={5}
            onChange={(pin) => setForm(prev => ({ ...prev, oldPin: pin }))}
            label="Current PIN"
          />

          <PinInput
            length={5}
            onChange={(pin) => setForm(prev => ({ ...prev, newPin: pin }))}
            label="New PIN (5 digits)"
          />

          <PinInput
            length={5}
            onChange={(pin) => setForm(prev => ({ ...prev, confirmPin: pin }))}
            label="Confirm New PIN"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Change PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}

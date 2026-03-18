import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import Header from '../../components/layout/Header';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function ChangePinPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [loading, setLoading] = useState(false);


  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value.replace(/\D/g, '').slice(0, 5) }));
  };

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
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Current PIN</label>
            <input
              type="password"
              value={form.oldPin}
              onChange={updateField('oldPin')}
              placeholder="Enter current PIN"
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              maxLength={5}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">New PIN (5 digits)</label>
            <input
              type="password"
              value={form.newPin}
              onChange={updateField('newPin')}
              placeholder="Enter new PIN"
              inputMode="numeric"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              maxLength={5}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New PIN</label>
            <input
              type="password"
              value={form.confirmPin}
              onChange={updateField('confirmPin')}
              placeholder="Re-enter new PIN"
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
            {loading ? <LoadingSpinner size="sm" /> : 'Change PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}

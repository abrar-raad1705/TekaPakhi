import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { profileApi } from '../../api/profileApi';
import Header from '../../components/layout/Header';
import Toast from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function EditProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const existing = location.state?.profile;

  const [form, setForm] = useState({
    fullName: existing?.full_name || '',
    email: existing?.email || '',
    nidNumber: existing?.nid_number || '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'error' });

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) {
      return setToast({ message: 'Name must be at least 2 characters', type: 'error' });
    }

    setLoading(true);
    try {
      await profileApi.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        nidNumber: form.nidNumber.trim() || null,
      });
      setToast({ message: 'Profile updated!', type: 'success' });
      setTimeout(() => navigate('/profile', { replace: true }), 1000);
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Update failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'error' })} />
      <Header title="Edit Profile" showBack />

      <div className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={updateField('fullName')}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              maxLength={100}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">NID Number (optional)</label>
            <input
              type="text"
              value={form.nidNumber}
              onChange={updateField('nidNumber')}
              placeholder="Enter your NID number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

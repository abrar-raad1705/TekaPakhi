import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipientApi } from '../../api/recipientApi';
import { profileApi } from '../../api/profileApi';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SavedRecipientsPage() {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [saving, setSaving] = useState(false);


  useEffect(() => { fetchRecipients(); }, []);

  const fetchRecipients = async () => {
    try {
      const { data } = await recipientApi.getAll();
      setRecipients(data.data);
    } catch {
      toast.error('Failed to load recipients.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (phone.length !== 11) return;
    try {
      const { data } = await profileApi.lookup(phone);
      setLookupResult(data.data);
      if (!nickname) setNickname(data.data.fullName);
    } catch {
      setLookupResult(null);
      toast.error('No account found with this number.');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await recipientApi.create({ phoneNumber: phone, nickname });
      toast.success('Recipient saved!');
      setShowAddForm(false);
      setPhone('');
      setNickname('');
      setLookupResult(null);
      fetchRecipients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save recipient.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this recipient?')) return;
    try {
      await recipientApi.delete(id);
      setRecipients((prev) => prev.filter((r) => r.recipient_id !== id));
      toast.success('Recipient removed.');
    } catch {
      toast.error('Failed to remove recipient.');
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      <Header title="Saved Recipients" backTo="/profile" />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Recipient
          </button>
        )}

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">New Recipient</h3>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setLookupResult(null); }}
                  placeholder="01XXXXXXXXX"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={phone.length !== 11}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40"
                >
                  Lookup
                </button>
              </div>
            </div>

            {lookupResult && (
              <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Found: <strong>{lookupResult.fullName}</strong> ({lookupResult.typeName})
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Mom, Office"
                maxLength={50}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setPhone(''); setNickname(''); setLookupResult(null); }}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !lookupResult || !nickname.trim()}
                className="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* Recipients list */}
        {loading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : recipients.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No saved recipients yet</p>
            <p className="text-xs text-gray-400">Add frequently used numbers for faster transfers</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipients.map((r) => (
              <div
                key={r.recipient_id}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
              >
                <div
                  className="flex flex-1 cursor-pointer items-center gap-3"
                  onClick={() => navigate(`/send-money?phone=${r.target_phone}`)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600">
                    {(r.nickname || r.target_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.nickname || r.target_name}</p>
                    <p className="text-xs text-gray-500">{r.target_phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(r.recipient_id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Remove"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

    </div>
  );
}

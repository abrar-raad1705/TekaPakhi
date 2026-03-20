import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  XMarkIcon, 
  UserIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';
import { recipientApi } from '../../api/recipientApi';
import { profileApi } from '../../api/profileApi';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';

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
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 py-8">
        <h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-gray-900">Saved recipients</h1>
        {/* Add button */}
        {!showAddForm && (
          <div className="mb-8">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              <PlusIcon className="h-6 w-6" strokeWidth={2.5} />
              Add New Recipient
            </button>
          </div>
        )}

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-10 space-y-6 rounded-2xl border-2 border-primary-50 bg-primary-50/20 p-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-black uppercase tracking-widest text-primary-600">New Recipient</h3>
               <button 
                type="button" 
                onClick={() => { setShowAddForm(false); setPhone(''); setNickname(''); setLookupResult(null); }}
                className="text-gray-400 hover:text-gray-600"
               >
                 <XMarkIcon className="h-5 w-5" strokeWidth={2} />
               </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-700 mx-1">Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setLookupResult(null); }}
                  placeholder="01XXXXXXXXX"
                  className="flex-1 rounded-xl border-2 border-white bg-white px-4 py-3.5 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={phone.length !== 11}
                  className="rounded-xl bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-40 transition-all shadow-md shadow-primary-50"
                >
                  Find
                </button>
              </div>
            </div>

            {lookupResult && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4 animate-in fade-in duration-300">
                <p className="text-[11px] font-black uppercase tracking-widest text-green-600 mb-1">Account Found</p>
                <p className="text-sm font-bold text-green-800">
                  {lookupResult.fullName} <span className="mx-1 opacity-40">|</span> <span className="font-medium text-green-600">{lookupResult.typeName}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[13px] font-bold text-gray-700 mx-1">Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g., Mom's Account"
                maxLength={50}
                className="w-full rounded-xl border-2 border-white bg-white px-4 py-3.5 text-[15px] font-medium transition-all focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !lookupResult || !nickname.trim()}
                className="w-full rounded-full bg-primary-600 py-4.5 text-base font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {saving ? <LoadingSpinner size="sm" /> : 'Save Recipient'}
              </button>
            </div>
          </form>
        )}

        {/* Recipients list */}
        <div className="space-y-4">
           <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 px-1 mb-2">Saved Contacts</label>
           
          {loading ? (
            <LoadingSpinner size="lg" className="py-12" />
          ) : recipients.length === 0 ? (
            <div className="rounded-3xl border-2 border-gray-50 bg-gray-50/30 p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <UserIcon className="h-8 w-8 text-gray-300" strokeWidth={1.5} />
              </div>
              <p className="text-base font-bold text-gray-900">No recipients yet</p>
              <p className="mt-1 text-sm font-medium text-gray-500 leading-relaxed px-4">
                Add frequently used numbers for faster transfers
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recipients.map((r) => (
                <div
                  key={r.recipient_id}
                  className="group flex items-center justify-between rounded-2xl border-2 border-gray-50 bg-gray-50/30 p-4 transition-all hover:border-primary-100 hover:bg-white"
                >
                  <div
                    className="flex flex-1 cursor-pointer items-center gap-4"
                    onClick={() => navigate(`/send-money?phone=${r.target_phone}`)}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-base font-black text-primary-600 ring-4 ring-primary-50/50">
                      {(r.nickname || r.target_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {r.nickname || r.target_name}
                      </p>
                      <p className="text-sm font-medium text-gray-500">{r.target_phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.recipient_id)}
                    className="rounded-full p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove"
                  >
                    <TrashIcon className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

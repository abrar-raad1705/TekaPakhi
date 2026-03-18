import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const statusBadge = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_KYC: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const statusActions = [
  { status: 'ACTIVE', label: 'Activate', color: 'bg-green-600 hover:bg-green-700' },
  { status: 'SUSPENDED', label: 'Suspend', color: 'bg-orange-600 hover:bg-orange-700' },
  { status: 'BLOCKED', label: 'Block', color: 'bg-red-600 hover:bg-red-700' },
];

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [loadAmount, setLoadAmount] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);

  useEffect(() => {
    adminApi.getUserDetail(id)
      .then((res) => setUser(res.data.data))
      .catch(() => toast.error('User not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLoadWallet = async () => {
    const amount = parseFloat(loadAmount);
    if (!amount || amount <= 0) {
      return toast.error('Enter a valid positive amount.');
    }
    const confirmMsg = `Load ৳${amount.toLocaleString()} to ${user.full_name}'s wallet?\nThis creates new e-money backed by physical cash deposit.`;
    if (!confirm(confirmMsg)) return;

    setLoadingWallet(true);
    try {
      const res = await adminApi.loadWallet(id, amount);
      toast.success(res.data.message);
      setLoadAmount('');
      // Refresh user data
      const refreshed = await adminApi.getUserDetail(id);
      setUser(refreshed.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load wallet.');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const confirmMsg = `Are you sure you want to change this user's status to ${newStatus}?`;
    if (!confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      await adminApi.updateUserStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}.`);
      // Refresh
      const res = await adminApi.getUserDetail(id);
      setUser(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <AdminLayout><LoadingSpinner size="lg" className="py-24" /></AdminLayout>;
  }

  if (!user) {
    return (
      <AdminLayout>
        <p className="py-24 text-center text-gray-500">User not found.</p>
      </AdminLayout>
    );
  }

  const currentStatus = user.subtypeData?.status || 'N/A';

  return (
    <AdminLayout>
      {/* Back + Title */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
          <p className="text-sm text-gray-500">Profile #{user.profile_id} &middot; {user.type_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Profile Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="font-medium text-gray-900">{user.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="font-medium text-gray-900">{user.phone_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="font-medium text-gray-900">{user.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">NID</p>
                <p className="font-medium text-gray-900">{user.nid_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Phone Verified</p>
                <p className={`font-medium ${user.is_phone_verified ? 'text-green-600' : 'text-red-500'}`}>
                  {user.is_phone_verified ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Registered</p>
                <p className="font-medium text-gray-900">{new Date(user.registration_date).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Subtype Details */}
          {user.subtypeData && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">{user.type_name} Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(user.subtypeData)
                  .filter(([key]) => !['profile_id'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-gray-400">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="font-medium text-gray-900">{value?.toString() || '—'}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Recent Transactions</h2>
            {!user.recentTransactions || user.recentTransactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No transactions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="pb-2 pr-3">Ref</th>
                      <th className="pb-2 pr-3">Type</th>
                      <th className="pb-2 pr-3 text-right">Amount</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {user.recentTransactions.map((tx) => (
                      <tr key={tx.transaction_id}>
                        <td className="py-2 pr-3 font-mono text-xs text-gray-500">{tx.transaction_ref.slice(0, 12)}...</td>
                        <td className="py-2 pr-3 text-gray-700">{tx.type_name}</td>
                        <td className="py-2 pr-3 text-right font-medium text-gray-900">{formatBDT(tx.amount)}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            tx.status === 'REVERSED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-400">{new Date(tx.transaction_time).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Wallet + Actions */}
        <div className="space-y-6">
          {/* Wallet Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Wallet</h2>
            <p className="text-3xl font-bold text-gray-900">
              {user.balance != null ? formatBDT(user.balance) : '—'}
            </p>
            {user.max_balance && (
              <p className="mt-1 text-xs text-gray-400">Max: {formatBDT(user.max_balance)}</p>
            )}
          </div>

          {/* Load E-Cash Card (visible for DISTRIBUTOR, AGENT, or any non-SYSTEM profile) */}
          {user.type_name !== 'SYSTEM' && (
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
              <h2 className="mb-2 text-sm font-semibold text-indigo-700">Load E-Cash</h2>
              <p className="mb-3 text-[11px] text-gray-500">
                Credit e-money to this wallet (backed by physical cash deposit).
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">৳</span>
                  <input
                    type="number"
                    value={loadAmount}
                    onChange={(e) => setLoadAmount(e.target.value)}
                    placeholder="Amount"
                    min="1"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <button
                  onClick={handleLoadWallet}
                  disabled={loadingWallet || !loadAmount}
                  className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loadingWallet ? '...' : 'Load'}
                </button>
              </div>
            </div>
          )}

          {/* Status Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Account Status</h2>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusBadge[currentStatus] || 'bg-gray-100 text-gray-600'}`}>
              {currentStatus}
            </span>

            {user.type_name !== 'SYSTEM' && (
              <div className="mt-4 space-y-2">
                {statusActions
                  .filter((a) => a.status !== currentStatus)
                  .map((action) => (
                    <button
                      key={action.status}
                      disabled={updating}
                      onClick={() => handleStatusChange(action.status)}
                      className={`w-full rounded-lg px-4 py-2 text-sm font-medium text-white ${action.color} disabled:opacity-50`}
                    >
                      {updating ? '...' : action.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </AdminLayout>
  );
}

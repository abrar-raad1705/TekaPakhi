import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PinInput from '../../components/common/PinInput';
import toast from 'react-hot-toast';

const profileTypes = [
  { id: '', label: 'All Types' },
  { id: '1', label: 'Customer' },
  { id: '2', label: 'Agent' },
  { id: '3', label: 'Merchant' },
  { id: '4', label: 'Distributor' },
  { id: '5', label: 'Biller' },
  { id: '6', label: 'System' },
];

const statusOptions = [
  { id: '', label: 'All Statuses' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'PENDING_KYC', label: 'Pending KYC' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'BLOCKED', label: 'Blocked' },
];

const statusBadge = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_KYC: 'bg-yellow-100 text-yellow-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ users: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [showCreate, setShowCreate] = useState(false);


  const page = parseInt(searchParams.get('page') || '1', 10);
  const typeId = searchParams.get('typeId') || '';
  const status = searchParams.get('status') || '';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeId) params.typeId = typeId;
      if (status) params.status = status;
      const res = await adminApi.getUsers(params);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeId, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateParams = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams('search', search);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">{data.total} total users</p>
      </div>

      {/* Action bar */}
      <div className="mb-4 flex items-center justify-between">
        <div />
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showCreate ? 'Cancel' : '+ Create Distributor / Biller'}
        </button>
      </div>

      {/* Create Profile Form */}
      {showCreate && (
        <CreateProfileForm
          onCreated={() => { setShowCreate(false); fetchUsers(); }}
        />
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Search
          </button>
        </form>

        <select
          value={typeId}
          onChange={(e) => updateParams('typeId', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {profileTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => updateParams('status', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        >
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : data.users.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map((u) => (
                  <tr
                    key={u.profile_id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/admin/users/${u.profile_id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-600">
                          {(u.full_name || '?')[0]}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone_number}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {u.type_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[u.account_status] || 'bg-gray-100 text-gray-600'}`}>
                        {u.account_status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {u.balance != null ? formatBDT(u.balance) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(u.registration_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {data.page} of {data.totalPages} ({data.total} results)
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => updateParams('page', String(data.page - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => updateParams('page', String(data.page + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>


    </AdminLayout>
  );
}

// ── Create Profile Form (Distributor / Biller) ────────────────

function CreateProfileForm({ onCreated }) {
  const [form, setForm] = useState({
    phoneNumber: '', fullName: '', securityPin: '',
    accountType: 'DISTRIBUTOR',
    region: '',
    billerCode: '', serviceName: '', category: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        phoneNumber: form.phoneNumber,
        fullName: form.fullName,
        securityPin: form.securityPin,
        accountType: form.accountType,
      };
      if (form.accountType === 'DISTRIBUTOR') {
        payload.region = form.region || undefined;
      } else {
        payload.billerCode = form.billerCode;
        payload.serviceName = form.serviceName;
        payload.category = form.category || undefined;
      }
      await adminApi.createProfile(payload);
      toast.success(`${form.accountType} profile created successfully.`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Create New Profile</h3>

      <div className="mb-4 flex gap-2">
        {['DISTRIBUTOR', 'BILLER'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm((p) => ({ ...p, accountType: t }))}
            className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-colors ${
              form.accountType === t
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Phone Number</label>
          <input type="tel" required value={form.phoneNumber} maxLength={11}
            onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="01XXXXXXXXX" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Full Name</label>
          <input type="text" required value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <PinInput
            length={5}
            onChange={(pin) => setForm((p) => ({ ...p, securityPin: pin }))}
            label="PIN (5 digits)"
          />
        </div>
      </div>

      {form.accountType === 'DISTRIBUTOR' && (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-gray-500">Region (optional)</label>
          <input type="text" value={form.region}
            onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Dhaka Division" />
        </div>
      )}

      {form.accountType === 'BILLER' && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Biller Code</label>
            <input type="text" required value={form.billerCode}
              onChange={(e) => setForm((p) => ({ ...p, billerCode: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., DESCO" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Service Name</label>
            <input type="text" required value={form.serviceName}
              onChange={(e) => setForm((p) => ({ ...p, serviceName: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Electricity" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Category (optional)</label>
            <input type="text" value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g., Utility" />
          </div>
        </div>
      )}

      <div className="mt-4">
        <button type="submit" disabled={saving}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
          {saving ? 'Creating...' : 'Create Profile'}
        </button>
      </div>
    </form>
  );
}

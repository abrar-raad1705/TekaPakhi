import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'types', label: 'Transaction Types' },
  { id: 'limits', label: 'Limits' },
  { id: 'commissions', label: 'Commissions' },
];

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState('types');


  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-sm text-gray-500">Manage fees, limits, and commission policies</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'types' && <TransactionTypesTab />}
      {activeTab === 'limits' && <LimitsTab />}
      {activeTab === 'commissions' && <CommissionsTab />}
    </AdminLayout>
  );
}

// ── Transaction Types Tab ──────────────────────────────────────

function TransactionTypesTab() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    adminApi.getTransactionTypes()
      .then((res) => setTypes(res.data.data))
      .catch(() => toast.error('Failed to load types.'))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (t) => {
    setEditing(t.type_id);
    setForm({
      fee_percentage: t.fee_percentage,
      fee_flat_amount: t.fee_flat_amount,
      fee_bearer: t.fee_bearer,
      fee_min_amount: t.fee_min_amount || '',
      fee_max_amount: t.fee_max_amount || '',
    });
  };

  const handleSave = async (typeId) => {
    try {
      const payload = { ...form };
      if (payload.fee_min_amount === '') payload.fee_min_amount = null;
      if (payload.fee_max_amount === '') payload.fee_max_amount = null;
      await adminApi.updateTransactionType(typeId, payload);
      toast.success('Updated successfully.');
      setEditing(null);
      const res = await adminApi.getTransactionTypes();
      setTypes(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="py-12" />;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Fee %</th>
              <th className="px-4 py-3">Flat Fee</th>
              <th className="px-4 py-3">Min Fee</th>
              <th className="px-4 py-3">Max Fee</th>
              <th className="px-4 py-3">Bearer</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {types.map((t) => (
              <tr key={t.type_id}>
                <td className="px-4 py-3 font-medium text-gray-900">{t.type_name}</td>
                {editing === t.type_id ? (
                  <>
                    <td className="px-4 py-3">
                      <input type="number" step="0.01" value={form.fee_percentage}
                        onChange={(e) => setForm({ ...form, fee_percentage: e.target.value })}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.01" value={form.fee_flat_amount}
                        onChange={(e) => setForm({ ...form, fee_flat_amount: e.target.value })}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.01" value={form.fee_min_amount}
                        onChange={(e) => setForm({ ...form, fee_min_amount: e.target.value })}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" step="0.01" value={form.fee_max_amount}
                        onChange={(e) => setForm({ ...form, fee_max_amount: e.target.value })}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
                    </td>
                    <td className="px-4 py-3">
                      <select value={form.fee_bearer}
                        onChange={(e) => setForm({ ...form, fee_bearer: e.target.value })}
                        className="rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="SENDER">SENDER</option>
                        <option value="RECEIVER">RECEIVER</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button onClick={() => handleSave(t.type_id)}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">Save</button>
                      <button onClick={() => setEditing(null)}
                        className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-gray-600">{parseFloat(t.fee_percentage)}%</td>
                    <td className="px-4 py-3 text-gray-600">{formatBDT(t.fee_flat_amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{t.fee_min_amount ? formatBDT(t.fee_min_amount) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{t.fee_max_amount ? formatBDT(t.fee_max_amount) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {t.fee_bearer}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(t)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50">Edit</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Limits Tab ─────────────────────────────────────────────────

function LimitsTab() {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    profileTypeId: '', transactionTypeId: '', dailyLimit: '', monthlyLimit: '',
    maxCountDaily: '', maxCountMonthly: '', minPerTransaction: '', maxPerTransaction: '',
  });

  const fetchLimits = async () => {
    try {
      const res = await adminApi.getTransactionLimits();
      setLimits(res.data.data);
    } catch { toast.error('Failed to load limits.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLimits(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await adminApi.upsertTransactionLimit(form);
      toast.success('Limit saved.');
      setShowAdd(false);
      setForm({ profileTypeId: '', transactionTypeId: '', dailyLimit: '', monthlyLimit: '',
        maxCountDaily: '', maxCountMonthly: '', minPerTransaction: '', maxPerTransaction: '' });
      fetchLimits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    }
  };

  const handleDelete = async (l) => {
    if (!confirm('Delete this limit?')) return;
    try {
      await adminApi.deleteTransactionLimit(l.profile_type_id, l.transaction_type_id);
      toast.success('Limit removed.');
      fetchLimits();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="py-12" />;

  return (
    <div>
      <button onClick={() => setShowAdd(!showAdd)}
        className="mb-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
        {showAdd ? 'Cancel' : '+ Add/Update Limit'}
      </button>

      {showAdd && (
        <form onSubmit={handleSave} className="mb-6 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-4">
          <div><label className="mb-1 block text-xs text-gray-500">Profile Type ID</label>
            <input type="number" required value={form.profileTypeId}
              onChange={(e) => setForm({ ...form, profileTypeId: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Tx Type ID</label>
            <input type="number" required value={form.transactionTypeId}
              onChange={(e) => setForm({ ...form, transactionTypeId: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Daily Limit</label>
            <input type="number" step="0.01" value={form.dailyLimit}
              onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Monthly Limit</label>
            <input type="number" step="0.01" value={form.monthlyLimit}
              onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Max Count/Day</label>
            <input type="number" value={form.maxCountDaily}
              onChange={(e) => setForm({ ...form, maxCountDaily: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Max Count/Month</label>
            <input type="number" value={form.maxCountMonthly}
              onChange={(e) => setForm({ ...form, maxCountMonthly: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Min Per Tx</label>
            <input type="number" step="0.01" value={form.minPerTransaction}
              onChange={(e) => setForm({ ...form, minPerTransaction: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Max Per Tx</label>
            <input type="number" step="0.01" value={form.maxPerTransaction}
              onChange={(e) => setForm({ ...form, maxPerTransaction: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div className="col-span-full">
            <button type="submit" className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
              Save Limit
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Tx Type</th>
                <th className="px-4 py-3 text-right">Daily</th>
                <th className="px-4 py-3 text-right">Monthly</th>
                <th className="px-4 py-3 text-right">Count/Day</th>
                <th className="px-4 py-3 text-right">Count/Mo</th>
                <th className="px-4 py-3 text-right">Min/Tx</th>
                <th className="px-4 py-3 text-right">Max/Tx</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {limits.map((l, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.profile_type_name}</td>
                  <td className="px-4 py-3 text-gray-700">{l.transaction_type_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.daily_limit ? formatBDT(l.daily_limit) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.monthly_limit ? formatBDT(l.monthly_limit) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.max_count_daily ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.max_count_monthly ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.min_per_transaction ? formatBDT(l.min_per_transaction) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{l.max_per_transaction ? formatBDT(l.max_per_transaction) : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(l)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Commissions Tab ────────────────────────────────────────────

function CommissionsTab() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ profileTypeId: '', transactionTypeId: '', commissionShare: '' });

  const fetchPolicies = async () => {
    try {
      const res = await adminApi.getCommissionPolicies();
      setPolicies(res.data.data);
    } catch { toast.error('Failed to load policies.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await adminApi.upsertCommissionPolicy(form);
      toast.success('Policy saved.');
      setShowAdd(false);
      setForm({ profileTypeId: '', transactionTypeId: '', commissionShare: '' });
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save.');
    }
  };

  const handleDelete = async (p) => {
    if (!confirm('Delete this policy?')) return;
    try {
      await adminApi.deleteCommissionPolicy(p.profile_type_id, p.transaction_type_id);
      toast.success('Policy removed.');
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete.');
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="py-12" />;

  return (
    <div>
      <button onClick={() => setShowAdd(!showAdd)}
        className="mb-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
        {showAdd ? 'Cancel' : '+ Add/Update Policy'}
      </button>

      {showAdd && (
        <form onSubmit={handleSave} className="mb-6 grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-white p-5">
          <div><label className="mb-1 block text-xs text-gray-500">Beneficiary Type ID</label>
            <input type="number" required value={form.profileTypeId}
              onChange={(e) => setForm({ ...form, profileTypeId: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Tx Type ID</label>
            <input type="number" required value={form.transactionTypeId}
              onChange={(e) => setForm({ ...form, transactionTypeId: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-gray-500">Share %</label>
            <input type="number" step="0.01" required value={form.commissionShare}
              onChange={(e) => setForm({ ...form, commissionShare: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
          <div className="col-span-full">
            <button type="submit" className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700">
              Save Policy
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Tx Type</th>
                <th className="px-4 py-3">Beneficiary</th>
                <th className="px-4 py-3 text-right">Commission Share</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.transaction_type_name}</td>
                  <td className="px-4 py-3 text-gray-700">{p.beneficiary_type_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{parseFloat(p.commission_share)}%</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

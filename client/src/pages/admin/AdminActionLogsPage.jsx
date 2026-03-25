import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatBDT } from '../../utils/formatCurrency';

const ACTION_TYPES = [
  { id: '', label: 'All Actions' },
  { id: 'LOAD_WALLET', label: 'Load Wallet' },
  { id: 'REVERSE_TRANSACTION', label: 'Reverse Transaction' },
  { id: 'UPDATE_USER_STATUS', label: 'Update Status' },
  { id: 'UPDATE_WALLET_LIMIT', label: 'Update Wallet Limit' },
  { id: 'CREATE_PROFILE', label: 'Create Profile' },
  { id: 'UPDATE_TRANSACTION_TYPE', label: 'Update Txn Type' },
  { id: 'UPSERT_LIMIT', label: 'Upsert Limit' },
  { id: 'DELETE_LIMIT', label: 'Delete Limit' },
  { id: 'UPSERT_COMMISSION', label: 'Upsert Commission' },
  { id: 'DELETE_COMMISSION', label: 'Delete Commission' },
  { id: 'GRANT_PIN_RESET', label: 'Grant PIN Reset' },
  { id: 'REVOKE_PIN_RESET', label: 'Revoke PIN Reset' },
];

const ACTION_BADGE_STYLE = {
  LOAD_WALLET: 'bg-green-50 text-green-700 border-green-200',
  REVERSE_TRANSACTION: 'bg-red-50 text-red-600 border-red-200',
  UPDATE_USER_STATUS: 'bg-blue-50 text-blue-700 border-blue-200',
  UPDATE_WALLET_LIMIT: 'bg-purple-50 text-purple-700 border-purple-200',
  CREATE_PROFILE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE_TRANSACTION_TYPE: 'bg-amber-50 text-amber-700 border-amber-200',
  UPSERT_LIMIT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE_LIMIT: 'bg-red-50 text-red-600 border-red-200',
  UPSERT_COMMISSION: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE_COMMISSION: 'bg-red-50 text-red-600 border-red-200',
  GRANT_PIN_RESET: 'bg-teal-50 text-teal-700 border-teal-200',
  REVOKE_PIN_RESET: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function AdminActionLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (action) params.action = action;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await adminApi.getActionLogs(params);
      setLogs(data.data.data);
      setTotal(data.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, action, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Action Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">All administrative operations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No admin action logs found.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACTION_BADGE_STYLE[log.action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.target_name ? (
                        <div>
                          <div className="font-medium text-gray-800">{log.target_name}</div>
                          <div className="text-xs text-gray-400">{log.target_phone} &middot; {log.target_type}</div>
                        </div>
                      ) : log.target_entity ? (
                        <span className="text-xs text-gray-500">{log.target_entity}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {log.amount != null ? formatBDT(log.amount) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50"
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

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EVENT_TYPES = [
  { id: '', label: 'All Events' },
  { id: 'LOGIN_SUCCESS', label: 'Login Success' },
  { id: 'LOGIN_FAILURE', label: 'Login Failure' },
  { id: 'OTP_REQUEST', label: 'OTP Request' },
  { id: 'OTP_VERIFY', label: 'OTP Verify' },
  { id: 'PIN_CHANGE', label: 'PIN Change' },
  { id: 'PIN_RESET', label: 'PIN Reset' },
  { id: 'ACCOUNT_LOCK', label: 'Account Lock' },
  { id: 'TXN_PIN_FAILURE', label: 'Txn PIN Failure' },
  { id: 'ADMIN_LOGIN_SUCCESS', label: 'Admin Login' },
  { id: 'ADMIN_LOGIN_FAILURE', label: 'Admin Login Failure' },
];

const EVENT_BADGE_STYLE = {
  LOGIN_SUCCESS: 'bg-green-50 text-green-700 border-green-200',
  LOGIN_FAILURE: 'bg-red-50 text-red-600 border-red-200',
  OTP_REQUEST: 'bg-blue-50 text-blue-700 border-blue-200',
  OTP_VERIFY: 'bg-blue-50 text-blue-700 border-blue-200',
  PIN_CHANGE: 'bg-amber-50 text-amber-700 border-amber-200',
  PIN_RESET: 'bg-amber-50 text-amber-700 border-amber-200',
  ACCOUNT_LOCK: 'bg-red-50 text-red-700 border-red-200',
  TXN_PIN_FAILURE: 'bg-orange-50 text-orange-700 border-orange-200',
  ADMIN_LOGIN_SUCCESS: 'bg-green-50 text-green-700 border-green-200',
  ADMIN_LOGIN_FAILURE: 'bg-red-50 text-red-600 border-red-200',
};

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (eventType) params.eventType = eventType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await adminApi.getSecurityLogs(params);
      setLogs(data.data.data);
      setTotal(data.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Security Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Authentication and security events</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {EVENT_TYPES.map((t) => (
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
          <div className="text-center py-16 text-gray-400 text-sm">No security logs found.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">User Agent</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${EVENT_BADGE_STYLE[log.event_type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.full_name ? (
                        <div>
                          <div className="font-medium text-gray-800">{log.full_name}</div>
                          <div className="text-xs text-gray-400">{log.phone_number} &middot; {log.type_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={log.user_agent}>{log.user_agent || '—'}</td>
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

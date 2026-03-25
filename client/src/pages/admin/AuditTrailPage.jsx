import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EVENT_TYPES = [
  { id: '', label: 'All Events' },
  { id: 'SEND_MONEY', label: 'Send Money' },
  { id: 'CASH_IN', label: 'Cash In' },
  { id: 'CASH_OUT', label: 'Cash Out' },
  { id: 'PAYMENT', label: 'Payment' },
  { id: 'PAY_BILL', label: 'Pay Bill' },
  { id: 'B2B', label: 'B2B' },
  { id: 'LOAD_WALLET', label: 'Load Wallet' },
  { id: 'REVERSE_TRANSACTION', label: 'Reverse Transaction' },
  { id: 'CREATE_PROFILE', label: 'Create Profile' },
  { id: 'UPDATE_USER_STATUS', label: 'Update Status' },
  { id: 'GRANT_PIN_RESET', label: 'Grant PIN Reset' },
  { id: 'REVOKE_PIN_RESET', label: 'Revoke PIN Reset' },
];

const ACTOR_TYPES = [
  { id: '', label: 'All Actors' },
  { id: 'USER', label: 'User' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'SYSTEM', label: 'System' },
];

const ACTOR_BADGE = {
  USER: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  SYSTEM: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState('');
  const [actorType, setActorType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (eventType) params.eventType = eventType;
      if (actorType) params.actorType = actorType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await adminApi.getAuditLogs(params);
      setLogs(data.data.data);
      setTotal(data.data.total);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, actorType, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-0.5">Log of key platform events</p>
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Actor</label>
            <select
              value={actorType}
              onChange={(e) => { setActorType(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {ACTOR_TYPES.map((t) => (
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

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No audit logs found.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ACTOR_BADGE[log.actor_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {log.actor_type || 'SYSTEM'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{log.summary}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-500 uppercase">{log.event_type.replace(/_/g, ' ')}</span>
                    {log.actor_name && <span>{log.actor_name}</span>}
                    {log.related_transaction_id && (
                      <span className="font-mono">Txn #{log.related_transaction_id}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
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

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { DatePicker } from '../../components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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

const EVENT_LABEL = {
  SEND_MONEY: 'Send Money',
  CASH_IN: 'Cash In',
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment',
  PAY_BILL: 'Pay Bill',
  B2B: 'B2B Transfer',
  LOAD_WALLET: 'Load Wallet',
  REVERSE_TRANSACTION: 'Reversal',
  CREATE_PROFILE: 'Create Profile',
  UPDATE_USER_STATUS: 'Status Update',
  GRANT_PIN_RESET: 'Grant PIN Reset',
  REVOKE_PIN_RESET: 'Revoke PIN Reset',
};

/* ── Copyable inline element ──────────────────────────────────── */
function Copyable({ children, value, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Click to copy: ${value}`}
      className={`relative inline-flex items-center gap-0.5 cursor-pointer hover:opacity-70 active:scale-95 transition-all ${className}`}
    >
      {children}
      {copied && (
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap shadow-sm animate-fade-in">
          Copied!
        </span>
      )}
    </button>
  );
}

/* ── Summary parser & renderer ────────────────────────────────── */
/**
 * Tokenise an audit summary into structured segments for rich rendering.
 * Recognises: ৳amounts, phone numbers (01...), (ref: XYZ), ACTIVE/BLOCKED/…, role names, #id.
 */
function parseSummary(raw) {
  if (!raw) return [{ type: 'text', value: '' }];
  const tokens = [];
  const re = /(\u09f3[\d,.]+)|(\b01\d{8,9}\b)|(\(ref:\s*([A-Z0-9]+)\))|(\b(?:ACTIVE|BLOCKED|SUSPENDED|PENDING_KYC)\b)|(\b(?:CUSTOMER|AGENT|MERCHANT|DISTRIBUTOR|BILLER)\b)|(#\d+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: raw.slice(last, m.index) });
    if (m[1]) tokens.push({ type: 'amount', value: m[1] });
    else if (m[2]) tokens.push({ type: 'phone', value: m[2] });
    else if (m[3]) tokens.push({ type: 'ref', value: m[4] }); // m[4] = inner code without parens
    else if (m[5]) tokens.push({ type: 'status', value: m[5] });
    else if (m[6]) tokens.push({ type: 'role', value: m[6] });
    else if (m[7]) tokens.push({ type: 'id', value: m[7] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) tokens.push({ type: 'text', value: raw.slice(last) });
  return tokens;
}

function SummaryText({ summary }) {
  const tokens = parseSummary(summary);
  return (
    <span>
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'amount':
            return <span key={i} className="font-semibold text-gray-900">{t.value}</span>;
          case 'phone':
            return (
              <Copyable key={i} value={t.value}>
                <span className="font-mono font-medium text-primary-700 underline decoration-primary-200 underline-offset-2">{t.value}</span>
              </Copyable>
            );
          case 'ref':
            return (
              <span key={i} className="text-gray-500 text-[14px]">
                (Trx ID:{' '}
                <Copyable value={t.value} className="hover:text-primary-500 transition-colors">
                  <span className="font-mono font-medium text-gray-700 underline decoration-gray-300 underline-offset-2">{t.value}</span>
                </Copyable>)
              </span>
            );
          case 'status':
            return <span key={i} className="font-semibold text-gray-900">{t.value}</span>;
          case 'role':
            return <span key={i} className="font-medium text-gray-700">{t.value}</span>;
          case 'id':
            return <span key={i} className="font-mono font-medium text-gray-600">{t.value}</span>;
          default:
            return <span key={i}>{t.value}</span>;
        }
      })}
    </span>
  );
}

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
          <div className="w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
            <Select value={eventType} onValueChange={(val) => { setEventType(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full bg-white h-[38px]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {EVENT_TYPES.filter(t => t.id !== '').map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Actor</label>
            <Select value={actorType} onValueChange={(val) => { setActorType(val === 'all' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full bg-white h-[38px]">
                <SelectValue placeholder="All Actors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actors</SelectItem>
                {ACTOR_TYPES.filter(t => t.id !== '').map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[210px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <DatePicker 
              value={startDate}
              onChange={(val) => { setStartDate(val || ''); setPage(1); }}
              placeholder="Start Date"
            />
          </div>
          <div className="w-[210px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <DatePicker 
              value={endDate}
              onChange={(val) => { setEndDate(val || ''); setPage(1); }}
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No audit logs found.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const evLabel = EVENT_LABEL[log.event_type] || log.event_type.replace(/_/g, ' ');

              return (
                <div key={log.id} className="rounded-xl border border-gray-200/75 bg-white px-5 py-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-gray-300 flex items-start gap-4 transition-all duration-200">
                  {/* Actor badge — fixed width so content column always aligns */}
                  <div className="shrink-0 w-[72px] mt-[3px] flex justify-center">
                    <span className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ACTOR_BADGE[log.actor_type] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {log.actor_type || 'SYSTEM'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] leading-relaxed text-gray-800 tracking-tight">
                      <SummaryText summary={log.summary} />
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[14px]">
                      <span className="font-semibold text-gray-500">{evLabel}</span>
                      {log.actor_name && (
                        <>
                          <span className="text-gray-300">&middot;</span>
                          <span className="font-medium text-gray-600">{log.actor_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 text-right whitespace-nowrap tabular-nums">
                    <div className="text-[14px] font-medium text-gray-600">
                      {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-[13px] font-medium text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Tiny animation for "Copied!" tooltip */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
      `}</style>
    </AdminLayout>
  );
}

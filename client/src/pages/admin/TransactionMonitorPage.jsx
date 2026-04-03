import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import { ChevronDownIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import TransactionDetailDrawer from '../../components/admin/TransactionDetailDrawer';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

function CopyableTrxId({ value, inline = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('TrxID copied', { duration: 1500 });
  };

  const base =
    'group cursor-pointer items-center font-mono text-xs font-medium text-gray-800 hover:text-primary-700 transition-colors';
  const inner = (
    <>
      <span className={`truncate ${inline ? 'max-w-[160px]' : 'max-w-[140px]'}`}>{value}</span>
      {copied ? (
        <ClipboardDocumentCheckIcon className={`text-green-600 shrink-0 ${inline ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      ) : (
        <ClipboardDocumentIcon
          className={`text-gray-400 opacity-70 group-hover:opacity-100 group-hover:text-primary-600 transition-opacity shrink-0 ${inline ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
        />
      )}
    </>
  );

  if (inline) {
    return (
      <span onClick={handleCopy} className={`${base} inline-flex gap-1 align-middle`} title="Click to copy TrxID">
        {inner}
      </span>
    );
  }

  return (
    <div onClick={handleCopy} className={`${base} flex gap-1.5 items-center`} title="Click to copy TrxID">
      {inner}
    </div>
  );
}

const txTypes = [
  { id: '', label: 'All Types' },
  { id: '1', label: 'Cash In' },
  { id: '2', label: 'Cash Out' },
  { id: '3', label: 'Send Money' },
  { id: '4', label: 'Payment' },
  { id: '5', label: 'Pay Bill' },
  { id: '6', label: 'B2B' },
];

const txStatuses = [
  { id: '', label: 'All Statuses' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'REVERSED', label: 'Reversed' },
];

const TX_STATUS_STYLE = {
  COMPLETED: 'bg-green-50 text-green-700 border border-green-100',
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-100',
  FAILED:    'bg-red-50 text-red-600 border border-red-100',
  REVERSED:  'border border-[#E2136E]/15 bg-[#E2136E]/10 text-[#E2136E]',
};

const TX_STATUS_BADGE =
  'inline-flex min-w-[4.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide';

const REVERSAL_TYPE_CLASS = 'text-[#E2136E]';

export default function TransactionMonitorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(null);

  // Detail drawer
  const [drawer, setDrawer] = useState({ isOpen: false, txId: null });
  const openDrawer = (txId) => setDrawer({ isOpen: true, txId });
  const closeDrawer = () => setDrawer({ isOpen: false, txId: null });

  // Reversal confirmation
  const [modal, setModal] = useState({ isOpen: false, txId: null });
  const closeModal = () => setModal({ isOpen: false, txId: null });

  const [search, setSearch] = useState(searchParams.get('search') || '');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const typeId = searchParams.get('typeId') || '';
  const status = searchParams.get('status') || '';

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeId) params.typeId = typeId;
      if (status) params.status = status;
      const res = await adminApi.getTransactions(params);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeId, status]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

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

  const handleReverse = (txId) => {
    setModal({ isOpen: true, txId });
  };

  const confirmReverse = async () => {
    const txId = modal.txId;
    closeModal();
    setReversing(txId);
    try {
      await adminApi.reverseTransaction(txId);
      toast.success('Transaction reversed successfully.');
      fetchTxns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reverse transaction.');
    } finally {
      setReversing(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transaction monitor</h1>
        <p className="text-sm text-gray-500 mt-0.5">{data.total.toLocaleString()} total · search by TrxID or phone</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-[2] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TrxID or phone..."
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10 shadow-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        <div className="w-full sm:w-44">
          <Select value={typeId} onValueChange={(val) => updateParams('typeId', val === 'all' ? '' : val)}>
             <SelectTrigger className="w-full bg-white h-[42px] rounded-xl shadow-sm border-gray-200">
               <SelectValue placeholder="All Types" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               {txTypes.filter(t => t.id !== '').map((t) => (
                 <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
               ))}
             </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <Select value={status} onValueChange={(val) => updateParams('status', val === 'all' ? '' : val)}>
             <SelectTrigger className="w-full bg-white h-[42px] rounded-xl shadow-sm border-gray-200">
               <SelectValue placeholder="All Statuses" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Statuses</SelectItem>
               {txStatuses.filter(s => s.id !== '').map((s) => (
                 <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
               ))}
             </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        {loading ? (
          <LoadingSpinner size="lg" className="py-16" />
        ) : data.transactions.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">No transactions match your filters.</p>
        ) : (
          <div className="overflow-x-auto px-1">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    TrxID
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Receiver
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Time
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.transactions.map((tx) => {
                  const isReversal = !!tx.original_transaction_id;
                  const displayType = isReversal ? "Reversal" : tx.type_name.replace(/_/g, " ");
                  return (
                    <tr key={tx.transaction_id} className="bg-white odd:bg-gray-50/60 hover:bg-primary-50/40 transition-colors">
                      <td className="px-4 py-3.5 align-middle">
                        <CopyableTrxId value={tx.transaction_ref} />
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className={`text-sm font-semibold ${isReversal ? REVERSAL_TYPE_CLASS : "text-gray-900"}`}>
                          {displayType}
                        </span>
                        {isReversal && tx.original_transaction_ref && (
                          <p className="mt-0.5 text-xs text-gray-600 leading-snug">
                            of: <CopyableTrxId value={tx.original_transaction_ref} inline />
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-gray-900">
                        <p className="text-sm font-semibold">{tx.sender_name}</p>
                        <p className="text-xs text-gray-500">{tx.sender_phone}</p>
                      </td>
                      <td className="px-4 py-3.5 align-middle text-gray-900">
                        <p className="text-sm font-semibold">{tx.receiver_name}</p>
                        <p className="text-xs text-gray-500">{tx.receiver_phone}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle font-semibold tabular-nums text-gray-900">{formatBDT(tx.amount)}</td>
                      <td className="px-4 py-3.5 text-right align-middle text-xs font-medium tabular-nums text-gray-600">{formatBDT(tx.fee_amount)}</td>
                      <td className="px-4 py-3.5 text-center align-middle">
                        <span className={`${TX_STATUS_BADGE} ${TX_STATUS_STYLE[tx.status] || "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle whitespace-nowrap tabular-nums">
                        <div className="text-[13px] font-medium text-gray-800">
                          {new Date(tx.transaction_time).toLocaleDateString("en-BD", { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[12px] font-medium text-gray-500 mt-0.5">
                          {new Date(tx.transaction_time).toLocaleTimeString("en-BD", { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDrawer(tx.transaction_id)}
                            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 transition-colors shadow-sm"
                            title="View Details"
                          >
                            <EyeIcon className="h-3.5 w-3.5 inline-block mr-1 -mt-[1px]" />
                            View
                          </button>
                          {tx.status === "COMPLETED" && !tx.original_transaction_id && (
                            <button
                              disabled={reversing === tx.transaction_id}
                              onClick={() => handleReverse(tx.transaction_id)}
                              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {reversing === tx.transaction_id ? "…" : "Reverse"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-5 py-3">
            <p className="text-xs text-gray-500 font-medium">
              Page <span className="text-gray-800 font-semibold">{data.page}</span> of {data.totalPages} · {data.total.toLocaleString()} results
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => updateParams('page', String(data.page - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.totalPages}
                onClick={() => updateParams('page', String(data.page + 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>


      <ConfirmationModal
        isOpen={modal.isOpen}
        title="Confirm Transaction Reversal"
        message="Are you sure you want to reverse this transaction?
        
        This will create a NEW transaction moving money back and update the original status to REVERSED. This action cannot be undone."
        confirmLabel="Reverse Now"
        isDanger={true}
        onConfirm={confirmReverse}
        onCancel={closeModal}
      />

      <TransactionDetailDrawer
        transactionId={drawer.txId}
        isOpen={drawer.isOpen}
        onClose={closeDrawer}
      />
    </AdminLayout>
  );
}

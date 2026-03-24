import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import { formatBDT } from '../../utils/formatCurrency';
import { ChevronDownIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';

function CopyableRef({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Reference copied to clipboard', { duration: 1500 });
  };

  return (
    <div
      onClick={handleCopy}
      className="group flex cursor-pointer items-center gap-1.5 font-mono text-[10px] text-gray-500 hover:text-primary-600"
      title="Click to copy"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <ClipboardDocumentIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
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

const statusColor = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  REVERSED: 'bg-purple-100 text-purple-700',
};

export default function TransactionMonitorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [reversing, setReversing] = useState(null);

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

  const handleReverse = async (txId) => {
    if (!confirm('Are you sure you want to reverse this transaction? This action cannot be undone.')) return;
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
        <h1 className="text-2xl font-bold text-gray-900">Transaction Monitor</h1>
        <p className="text-sm text-gray-500">{data.total} total transactions</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-[2] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref or phone..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Search
          </button>
        </form>

        <div className="relative w-full sm:w-48">
          <select
            value={typeId}
            onChange={(e) => updateParams('typeId', e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {txTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => updateParams('status', e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {txStatuses.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <LoadingSpinner size="lg" className="py-12" />
        ) : data.transactions.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No transactions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Sender</th>
                  <th className="px-4 py-3">Receiver</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.transactions.map((tx) => (
                  <tr key={tx.transaction_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <CopyableRef value={tx.transaction_ref} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{tx.type_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{tx.sender_name}</p>
                      <p className="text-[10px] text-gray-400">{tx.sender_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-900">{tx.receiver_name}</p>
                      <p className="text-[10px] text-gray-400">{tx.receiver_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatBDT(tx.amount)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatBDT(tx.fee_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor[tx.status] || 'bg-gray-100 text-gray-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(tx.transaction_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {tx.status === 'COMPLETED' && !tx.original_transaction_id && (
                        <button
                          disabled={reversing === tx.transaction_id}
                          onClick={() => handleReverse(tx.transaction_id)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {reversing === tx.transaction_id ? '...' : 'Reverse'}
                        </button>
                      )}
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

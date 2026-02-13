import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/layout/Header';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatBDT, formatPhone } from '../../utils/formatCurrency';

const typeLabels = {
  SEND_MONEY: 'Send Money', CASH_IN: 'Cash In', CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment', PAY_BILL: 'Pay Bill', B2B: 'B2B Transfer',
};

export default function TransactionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await transactionApi.getDetail(id);
        setTx(data.data);
      } catch (error) {
        console.error('Failed to fetch detail:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!tx) return <div className="flex min-h-dvh items-center justify-center text-gray-500">Transaction not found</div>;

  const isSender = tx.sender_profile_id?.toString() === user?.profileId?.toString();

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header title="Transaction Detail" showBack />

      <div className="mx-auto max-w-md px-4 py-4">
        {/* Amount header */}
        <div className="mb-4 rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className={`text-3xl font-bold ${isSender ? 'text-red-600' : 'text-green-600'}`}>
            {isSender ? '-' : '+'}{formatBDT(tx.amount)}
          </p>
          <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium
            ${tx.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {tx.status}
          </span>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="divide-y divide-gray-100 px-5">
            <Row label="Type" value={typeLabels[tx.type_name] || tx.type_name} />
            <Row label="From" value={`${tx.sender_name} (${formatPhone(tx.sender_phone)})`} />
            <Row label="To" value={`${tx.receiver_name} (${formatPhone(tx.receiver_phone)})`} />
            <Row label="Amount" value={formatBDT(tx.amount)} />
            <Row label="Fee" value={formatBDT(tx.fee_amount)} />
            <Row label="Reference" value={tx.transaction_ref} mono />
            <Row label="Date" value={new Date(tx.transaction_time).toLocaleString('en-BD', { dateStyle: 'long', timeStyle: 'medium' })} />
            {tx.user_note && <Row label="Note" value={tx.user_note} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`max-w-[60%] text-right text-sm font-medium text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

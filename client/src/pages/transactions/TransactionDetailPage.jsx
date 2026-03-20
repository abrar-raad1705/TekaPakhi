import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionApi } from '../../api/transactionApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatBDT, formatPhone } from '../../utils/formatCurrency';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ArrowUpRightIcon, 
  ArrowDownLeftIcon,
  DocumentDuplicateIcon 
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const typeLabels = {
  SEND_MONEY: 'Send Money', 
  CASH_IN: 'Cash In', 
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment', 
  PAY_BILL: 'Pay Bill', 
  B2B: 'B2B Transfer',
};

export default function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Transaction ID copied!');
  };

  if (loading) return <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500"><div className="flex flex-1 items-center justify-center"><LoadingSpinner size="lg" /></div></div>;
  if (!tx) return <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500"><div className="flex flex-1 items-center justify-center font-bold text-gray-400">Transaction not found</div></div>;

  const isSender = tx.sender_profile_id?.toString() === user?.profileId?.toString();
  const isCompleted = tx.status === 'COMPLETED';

  return (
    <div className="flex min-h-dvh flex-col bg-white overflow-x-hidden animate-in fade-in duration-500">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 md:py-16">
        <div className="flex flex-col items-center">
          {/* Status Icon & Header */}
          <div className="mb-8 text-center animate-in zoom-in-95 duration-500">
            <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl shadow-gray-100 ${isCompleted ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
              {isCompleted ? (
                <CheckCircleIcon className="h-14 w-14" strokeWidth={1.5} />
              ) : (
                <ClockIcon className="h-14 w-14" strokeWidth={1.5} />
              )}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              {isSender ? '-' : '+'}{formatBDT(tx.amount)}
            </h1>
            <p className="mt-2 text-[15px] font-bold text-gray-400 uppercase tracking-widest">
              {typeLabels[tx.type_name] || tx.type_name}
            </p>
            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-black uppercase tracking-wider
              ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {tx.status}
            </div>
          </div>

          {/* Transaction Card */}
          <div className="w-full max-w-2xl rounded-[2.5rem] border border-gray-100 bg-white p-10 shadow-2xl shadow-gray-100/50 animate-in slide-in-from-bottom-6 duration-700">
            <div className="space-y-6">
              <Row 
                label="Sender" 
                value={tx.sender_name} 
                subValue={formatPhone(tx.sender_phone)} 
                icon={<ArrowUpRightIcon className="h-5 w-5 text-red-400" strokeWidth={2.5} />}
              />
              <Row 
                label="Receiver" 
                value={tx.receiver_name} 
                subValue={formatPhone(tx.receiver_phone)} 
                icon={<ArrowDownLeftIcon className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />}
              />
              
              <div className="h-px bg-gray-50 my-8" />
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-300">Transaction ID</label>
                  <div className="mt-1.5 flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(tx.transaction_ref)}>
                    <p className="text-[15px] font-black text-gray-900 font-mono">{tx.transaction_ref}</p>
                    <DocumentDuplicateIcon className="h-4 w-4 text-gray-300 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-300">Transaction Date</label>
                  <p className="mt-1.5 text-[15px] font-black text-gray-900">
                    {new Date(tx.transaction_time).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="h-px bg-gray-50 my-8" />

              <div className="space-y-4">
                <DetailRow label="Net Amount" value={formatBDT(tx.amount)} />
                <DetailRow label="Service Fee" value={formatBDT(tx.fee_amount)} isRed />
                {tx.user_note && <DetailRow label="Reference Note" value={tx.user_note} isItalic />}
                <div className="pt-4 mt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-black text-gray-400">Total Charged</span>
                    <span className="font-black text-primary-600">
                      {formatBDT(tx.amount + (isSender ? tx.fee_amount : 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => window.print()}
            className="mt-12 text-[15px] font-bold text-gray-400 hover:text-primary-600 transition-all px-6 py-2 rounded-xl hover:bg-primary-50 active:scale-95"
          >
            Download Receipt (PDF)
          </button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, subValue, icon }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-[11px] font-black uppercase tracking-widest text-gray-300">{label}</label>
        <p className="text-[17px] font-black text-gray-900 truncate">{value}</p>
        <p className="text-[14px] font-bold text-gray-400">{subValue}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, isRed = false, isItalic = false }) {
  return (
    <div className="flex justify-between items-center text-[15px]">
      <span className="font-bold text-gray-400">{label}</span>
      <span className={`font-black tracking-tight ${isRed ? 'text-red-500' : 'text-gray-900'} ${isItalic ? 'italic font-medium text-gray-500' : ''}`}>
        {value}
      </span>
    </div>
  );
}

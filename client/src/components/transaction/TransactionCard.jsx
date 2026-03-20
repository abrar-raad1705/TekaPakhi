import { formatBDT, formatPhone } from '../../utils/formatCurrency';
import { 
  PaperAirplaneIcon, 
  ArrowDownLeftIcon, 
  ArrowUpRightIcon, 
  CreditCardIcon, 
  ReceiptPercentIcon, 
  ArrowsRightLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const typeConfig = {
  // All types now use the primary brand color for consistency as per user request
  SEND_MONEY:  { label: 'Send Money', icon: <PaperAirplaneIcon className="h-5 w-5 rotate-[-45deg]" />, color: 'bg-primary-50 text-primary-600' },
  CASH_IN:     { label: 'Cash In',    icon: <ArrowDownLeftIcon className="h-5 w-5" />, color: 'bg-primary-50 text-primary-600' },
  CASH_OUT:    { label: 'Cash Out',   icon: <ArrowUpRightIcon className="h-5 w-5" />, color: 'bg-primary-50 text-primary-600' },
  PAYMENT:     { label: 'Payment',    icon: <CreditCardIcon className="h-5 w-5" />, color: 'bg-primary-50 text-primary-600' },
  PAY_BILL:    { label: 'Pay Bill',   icon: <ReceiptPercentIcon className="h-5 w-5" />, color: 'bg-primary-50 text-primary-600' },
  B2B:         { label: 'B2B Transfer', icon: <ArrowsRightLeftIcon className="h-5 w-5" />, color: 'bg-primary-50 text-primary-600' },
};

export default function TransactionCard({ tx, currentProfileId, onClick, className = "" }) {
  const config = typeConfig[tx.type_name] || { label: tx.type_name, icon: '?', color: 'bg-gray-50 text-gray-400' };
  const isSender = tx.sender_profile_id?.toString() === currentProfileId?.toString();
  const counterparty = isSender
    ? { name: tx.receiver_name, phone: tx.receiver_phone }
    : { name: tx.sender_name, phone: tx.sender_phone };

  return (
    <button
      onClick={() => onClick?.(tx)}
      className={`group flex w-full items-center gap-4 rounded-2xl bg-white px-5 py-4 text-left transition-all duration-200 hover:bg-gray-50 active:scale-[0.99] border border-transparent hover:border-gray-100 ${className}`}
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 duration-300 ${config.color}`}>
        {config.icon}
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-black text-gray-900">{counterparty.name}</p>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-gray-200" />
          <p className="hidden sm:inline-block text-[13px] font-bold text-gray-400">{formatPhone(counterparty.phone)}</p>
        </div>
        <p className="text-[13px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider opacity-70">
          {config.label} &middot; {new Date(tx.transaction_time).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="shrink-0 text-right flex items-center gap-4">
        <div>
          <p className={`text-[17px] font-black tracking-tight ${isSender ? 'text-rose-500' : 'text-emerald-500'}`}>
            {isSender ? '-' : '+'}{formatBDT(tx.amount)}
          </p>
          <p className={`text-[11px] font-black uppercase tracking-widest ${isCompleted(tx.status) ? 'text-emerald-400' : 'text-amber-400'}`}>
            {tx.status}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 text-gray-300 group-hover:text-primary-600 transition-all group-hover:translate-x-1" strokeWidth={3} />
      </div>
    </button>
  );
}

function isCompleted(status) {
  return status === 'COMPLETED';
}

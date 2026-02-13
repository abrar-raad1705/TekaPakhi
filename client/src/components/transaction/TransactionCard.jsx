import { formatBDT, formatPhone } from '../../utils/formatCurrency';

const typeConfig = {
  SEND_MONEY:  { label: 'Send Money', icon: '↗', color: 'bg-blue-100 text-blue-600' },
  CASH_IN:     { label: 'Cash In',    icon: '↓', color: 'bg-green-100 text-green-600' },
  CASH_OUT:    { label: 'Cash Out',   icon: '↑', color: 'bg-orange-100 text-orange-600' },
  PAYMENT:     { label: 'Payment',    icon: '💳', color: 'bg-purple-100 text-purple-600' },
  PAY_BILL:    { label: 'Pay Bill',   icon: '📄', color: 'bg-teal-100 text-teal-600' },
  B2B:         { label: 'B2B',        icon: '🔄', color: 'bg-gray-100 text-gray-600' },
};

export default function TransactionCard({ tx, currentProfileId, onClick }) {
  const config = typeConfig[tx.type_name] || { label: tx.type_name, icon: '?', color: 'bg-gray-100 text-gray-600' };
  const isSender = tx.sender_profile_id?.toString() === currentProfileId?.toString();
  const counterparty = isSender
    ? { name: tx.receiver_name, phone: tx.receiver_phone }
    : { name: tx.sender_name, phone: tx.sender_phone };

  return (
    <button
      onClick={() => onClick?.(tx)}
      className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${config.color}`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{counterparty.name}</p>
        <p className="text-xs text-gray-400">{config.label} &middot; {formatPhone(counterparty.phone)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold ${isSender ? 'text-red-600' : 'text-green-600'}`}>
          {isSender ? '-' : '+'}{formatBDT(tx.amount)}
        </p>
        <p className="text-[10px] text-gray-400">
          {new Date(tx.transaction_time).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
        </p>
      </div>
    </button>
  );
}

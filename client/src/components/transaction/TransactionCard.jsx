import { formatBDT, formatPhone } from '../../utils/formatCurrency';
import { typeLabels } from '../../utils/transactionDetailFormat';
import ProfileAvatar from '../common/ProfileAvatar';
import { TransactionTypeGlyph } from '../../constants/transactionTypeUi';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export default function TransactionCard({ tx, currentProfileId, onClick, className = "" }) {
  const label = typeLabels[tx.type_name] || tx.type_name;
  const isSender = tx.sender_profile_id?.toString() === currentProfileId?.toString();
  const counterparty = isSender
    ? {
        name: tx.receiver_name,
        phone: tx.receiver_phone,
        pictureUrl: tx.receiver_profile_picture_url,
      }
    : {
        name: tx.sender_name,
        phone: tx.sender_phone,
        pictureUrl: tx.sender_profile_picture_url,
      };

  return (
    <button
      onClick={() => onClick?.(tx)}
      className={`group flex w-full items-center gap-4 rounded-2xl bg-white px-5 py-4 text-left transition-all duration-200 hover:bg-gray-50 active:scale-[0.99] border border-transparent hover:border-gray-100 ${className}`}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <TransactionTypeGlyph typeName={tx.type_name} className="h-6 w-6" />
        </div>
        <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
          <ProfileAvatar
            pictureUrl={counterparty.pictureUrl}
            name={counterparty.name}
            className="h-12 w-12 text-lg"
          />
        </div>
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-black text-gray-900">{counterparty.name}</p>
          <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-gray-200" />
          <p className="hidden sm:inline-block text-[13px] font-bold text-gray-400">{formatPhone(counterparty.phone)}</p>
        </div>
        <p className="text-[13px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider opacity-70">
          {label} &middot; {new Date(tx.transaction_time).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
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

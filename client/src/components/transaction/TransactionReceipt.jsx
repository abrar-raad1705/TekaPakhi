import { useNavigate } from 'react-router-dom';
import { formatBDT, formatPhone } from '../../utils/formatCurrency';

const typeLabels = {
  SEND_MONEY: 'Send Money',
  CASH_IN: 'Cash In',
  CASH_OUT: 'Cash Out',
  PAYMENT: 'Payment',
  PAY_BILL: 'Pay Bill',
  B2B: 'B2B Transfer',
};

export default function TransactionReceipt({ receipt, onDone }) {
  const navigate = useNavigate();

  const handleDone = () => {
    if (onDone) onDone();
    else navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Success icon */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Transaction Successful</h2>
          <p className="text-sm text-gray-500">{typeLabels[receipt.type] || receipt.type}</p>
        </div>

        {/* Receipt card */}
        <div className="rounded-2xl bg-white shadow-lg">
          {/* Amount */}
          <div className="border-b border-dashed border-gray-200 px-5 py-4 text-center">
            <p className="text-3xl font-bold text-primary-600">{formatBDT(receipt.amount)}</p>
          </div>

          {/* Details */}
          <div className="space-y-0 divide-y divide-gray-100 px-5">
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">To</span>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{receipt.receiver?.name}</p>
                <p className="text-xs text-gray-400">{formatPhone(receipt.receiver?.phone)}</p>
              </div>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Fee</span>
              <span className="text-sm font-medium text-gray-800">{formatBDT(receipt.fee)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Total Debit</span>
              <span className="text-sm font-bold text-gray-900">{formatBDT(receipt.totalDebit)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Ref</span>
              <span className="font-mono text-xs text-gray-600">{receipt.transactionRef}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm text-gray-600">
                {new Date(receipt.timestamp).toLocaleString('en-BD', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </span>
            </div>
            {receipt.note && (
              <div className="flex justify-between py-3">
                <span className="text-sm text-gray-500">Note</span>
                <span className="max-w-[60%] text-right text-sm text-gray-600">{receipt.note}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleDone}
          className="mt-6 w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

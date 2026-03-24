import {
  PaperAirplaneIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  ShoppingBagIcon,
  ReceiptPercentIcon,
  ArrowPathIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

/**
 * Canonical Heroicons for each transaction type — use everywhere (history, dashboards, flows).
 * Matches the icon used on each transaction flow page (SendMoney, CashIn, CashOut, etc.).
 */
export const TRANSACTION_TYPE_ICONS = {
  SEND_MONEY: PaperAirplaneIcon,
  CASH_IN: PlusCircleIcon,
  CASH_OUT: ArrowUpTrayIcon,
  PAYMENT: ShoppingBagIcon,
  PAY_BILL: ReceiptPercentIcon,
  B2B: ArrowPathIcon,
  COMMISSION: BanknotesIcon,
};

/**
 * Renders the standard icon for a transaction type name (e.g. tx.type_name).
 */
export function TransactionTypeGlyph({
  typeName,
  className = "h-5 w-5",
  strokeWidth = 2,
}) {
  const Icon = TRANSACTION_TYPE_ICONS[typeName];
  if (!Icon) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded font-bold text-slate-400 ${className}`}
        aria-hidden
      >
        ?
      </span>
    );
  }
  const sendMoneyExtra = typeName === "SEND_MONEY" ? " -rotate-45" : "";
  return (
    <Icon
      className={`${className}${sendMoneyExtra}`}
      strokeWidth={strokeWidth}
    />
  );
}

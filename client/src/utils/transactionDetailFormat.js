export const typeLabels = {
  SEND_MONEY: "Send Money",
  CASH_IN: "Cash In",
  CASH_OUT: "Cash Out",
  PAYMENT: "Payment",
  PAY_BILL: "Pay Bill",
  B2B: "B2B Transfer",
};

export function formatTaka(n) {
  const num = parseFloat(n);
  if (Number.isNaN(num)) return "৳0.00";
  return `৳${num.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatReceiptTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  const mm = String(m).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${h12}:${mm}${ampm} ${day}/${month}/${yy}`;
}

export function headerTitle(tx, isSender) {
  if (tx.type_name === "SEND_MONEY") {
    return isSender ? "Send Money" : "Received Money";
  }
  return (
    typeLabels[tx.type_name] ||
    String(tx.type_name || "").replace(/_/g, " ")
  );
}

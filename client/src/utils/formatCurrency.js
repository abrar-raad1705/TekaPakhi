/**
 * Format a number as BDT currency
 */
export function formatBDT(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Tk 0.00';
  return `Tk ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format phone number for display (e.g., 01712345678 → 01712-345678)
 */
export function formatPhone(phone) {
  if (!phone || phone.length !== 11) return phone;
  return `${phone.slice(0, 5)}-${phone.slice(5)}`;
}

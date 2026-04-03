/**
 * Deduped receiver-side counterparties from mini-statement when the user initiated the tx (sender).
 * Used for Recent lists on Cash Out (CASH_OUT) and Payment (PAYMENT).
 */
export function buildRecentCounterpartyFromMiniStatement(transactions, profileId, typeName) {
  const pid = String(profileId ?? '');
  const seen = new Set();
  const out = [];
  for (const tx of transactions || []) {
    if (tx.type_name !== typeName) continue;
    // Reversals swap sender/receiver vs the original payment; skip so we don't list
    // customers as "recent merchants" (or agents as recent cash-out contacts, etc.).
    if (tx.original_transaction_id) continue;
    if (String(tx.sender_profile_id) !== pid) continue;
    const name = tx.receiver_name;
    const phoneRaw = tx.receiver_phone;
    const pictureUrl = tx.receiver_profile_picture_url;
    const digits = String(phoneRaw || '').replace(/\D/g, '');
    if (!/^01[3-9]\d{8}$/.test(digits)) continue;
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push({
      key: `recent-${typeName}-${digits}`,
      name: name || 'Recipient',
      phone: digits,
      pictureUrl: pictureUrl ?? null,
      account_status: tx.receiver_account_status,
    });
    if (out.length >= 10) break;
  }
  return out;
}

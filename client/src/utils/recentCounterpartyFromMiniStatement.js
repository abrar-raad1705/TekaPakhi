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
    });
    if (out.length >= 10) break;
  }
  return out;
}

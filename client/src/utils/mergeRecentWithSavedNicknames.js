/**
 * When a phone appears in saved contacts with a non-empty nickname, use that
 * as the display name in Recent lists instead of the legal name from history.
 */
export function mergeRecentWithSavedNicknames(recentList, savedContacts) {
  if (!recentList?.length) return recentList || [];
  const nickByPhone = new Map();
  for (const s of savedContacts || []) {
    const d = String(s.target_phone || "").replace(/\D/g, "");
    if (!d) continue;
    const nick = s.nickname?.trim();
    if (nick) nickByPhone.set(d, nick);
  }
  return recentList.map((r) => {
    const nick = nickByPhone.get(r.phone);
    return nick ? { ...r, name: nick } : r;
  });
}

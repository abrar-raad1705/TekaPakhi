/**
 * Turn a stored upload path (e.g. /uploads/avatars/x.jpg) into a full URL for <img src>.
 */
export function resolveMediaUrl(relativeOrAbsolute) {
  if (relativeOrAbsolute == null || relativeOrAbsolute === "") return null;
  const s = String(relativeOrAbsolute).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const base =
    import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "http://localhost:5000";
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

/**
 * Turn a stored upload path (e.g. /uploads/avatars/x.jpg) into a full URL for <img src>.
 * Matches ProfilePage: when VITE_API_URL is missing or relative-only, dev uses the API host
 * (uploads are served by Express, not the Vite dev server).
 */
export function resolveMediaUrl(relativeOrAbsolute) {
  if (relativeOrAbsolute == null || relativeOrAbsolute === "") return null;
  const s = String(relativeOrAbsolute).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;

  const raw = import.meta.env.VITE_API_URL || "";
  let base = raw.replace(/\/api\/v1\/?$/, "");
  if (!base) {
    base = import.meta.env.DEV
      ? "http://localhost:5000"
      : typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5000";
  }

  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

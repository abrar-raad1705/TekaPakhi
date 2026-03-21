import { useState } from "react";
import { resolveMediaUrl } from "../../utils/resolveMediaUrl";

const DEFAULT_ACCENT = "#2563EB";

/**
 * Rounds image from profile_picture_url, or initial fallback.
 */
export default function ProfileAvatar({
  pictureUrl,
  name,
  className = "h-11 w-11 text-base",
  accentColor = DEFAULT_ACCENT,
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(pictureUrl);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ring-2 ring-white ${className}`}
      style={{
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        color: accentColor,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

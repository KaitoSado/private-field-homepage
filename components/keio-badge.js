export function KeioBadge({ profile, compact = false }) {
  if (!profile?.keio_verified) return null;

  return (
    <span className={`keio-badge ${compact ? "keio-badge-compact" : ""}`}>
      {compact ? "慶應認証" : "keio.jp / keio.ac.jp 認証済み"}
    </span>
  );
}

import { sanitizeMediaUrl } from "@/lib/url";

export function AvatarMark({ profile, size = "md" }) {
  const label = profile?.display_name || profile?.username || "?";
  const src = sanitizeMediaUrl(profile?.avatar_url);
  const classes = `avatar-mark avatar-mark-${size}`;

  if (src) {
    return <img src={src} alt={label} className={classes} />;
  }

  return <div className={classes}>{label.slice(0, 2)}</div>;
}

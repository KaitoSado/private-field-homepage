import { sanitizeExternalUrl } from "@/lib/url";

const FIXED_LINK_FIELDS = [
  { label: "Website", key: "website_url", placeholder: "https://your-site.com" },
  { label: "X", key: "x_url", placeholder: "https://x.com/..." },
  { label: "GitHub", key: "github_url", placeholder: "https://github.com/..." },
  { label: "note", key: "note_url", placeholder: "https://note.com/..." }
];

export function getFixedLinkFields() {
  return FIXED_LINK_FIELDS;
}

export function inflateCustomLinks(customLinks) {
  if (!Array.isArray(customLinks)) return [];

  return customLinks.map((item) => ({
    label: `${item?.label ?? ""}`,
    href: `${item?.href ?? ""}`
  }));
}

export function normalizeCustomLinks(customLinks) {
  return inflateCustomLinks(customLinks)
    .map((item) => ({
      label: `${item.label || ""}`.trim().slice(0, 40),
      href: sanitizeExternalUrl(item.href) || ""
    }))
    .filter((item) => item.label || item.href);
}

export function buildRenderedProfileLinks(profile) {
  const fixed = FIXED_LINK_FIELDS.map((field) => ({
    label: field.label,
    href: sanitizeExternalUrl(profile?.[field.key]),
    key: field.key
  })).filter((item) => item.href);

  const custom = normalizeCustomLinks(profile?.custom_links).map((item, index) => ({
    label: item.label || "Link",
    href: item.href,
    key: `custom-${index}`
  }));

  return [...fixed, ...custom];
}

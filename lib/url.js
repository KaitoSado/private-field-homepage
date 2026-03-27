const ALLOWED_EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const ALLOWED_HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function sanitizeExternalUrl(value) {
  return sanitizeUrl(value, ALLOWED_EXTERNAL_PROTOCOLS);
}

export function sanitizeHttpUrl(value) {
  return sanitizeUrl(value, ALLOWED_HTTP_PROTOCOLS);
}

export function sanitizeMediaUrl(value) {
  if (typeof value === "string" && value.startsWith("/")) {
    return value;
  }
  return sanitizeUrl(value, ALLOWED_HTTP_PROTOCOLS);
}

function sanitizeUrl(value, allowedProtocols) {
  if (!value) return null;

  try {
    const normalized = value.includes("://") || value.startsWith("mailto:") ? value : `https://${value}`;
    const url = new URL(normalized);
    if (!allowedProtocols.has(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

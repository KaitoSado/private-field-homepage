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
    const normalizedInput = normalizeKnownExternalUrl(value);
    const normalized =
      normalizedInput.includes("://") || normalizedInput.startsWith("mailto:")
        ? normalizedInput
        : `https://${normalizedInput}`;
    const url = new URL(normalized);
    if (!allowedProtocols.has(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeKnownExternalUrl(value) {
  const input = `${value || ""}`.trim();
  if (!input) return input;

  const discordInviteMatch = input.match(
    /^discord:\/\/(?:-\/)?invite\/([A-Za-z0-9-]+)$/i
  );
  if (discordInviteMatch) {
    return `https://discord.gg/${discordInviteMatch[1]}`;
  }

  const discordShareMatch = input.match(
    /^discord:\/\/(?:www\.)?discord\.gg\/([A-Za-z0-9-]+)$/i
  );
  if (discordShareMatch) {
    return `https://discord.gg/${discordShareMatch[1]}`;
  }

  const discordDomainMatch = input.match(
    /^(?:https?:\/\/)?(?:www\.)?(discord\.gg\/[A-Za-z0-9-]+|discord(?:app)?\.com\/invite\/[A-Za-z0-9-]+)$/i
  );
  if (discordDomainMatch) {
    return `https://${discordDomainMatch[1]}`;
  }

  return input;
}

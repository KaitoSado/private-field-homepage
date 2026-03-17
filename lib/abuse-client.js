const STORAGE_PREFIX = "fieldcard-abuse";

export function checkRateLimit(key, { windowMs, max }) {
  if (typeof window === "undefined") {
    return { allowed: true, retryAfterMs: 0, count: 0 };
  }

  const now = Date.now();
  const records = loadRecords(key).filter((value) => now - value < windowMs);

  if (records.length >= max) {
    const retryAfterMs = Math.max(0, windowMs - (now - records[0]));
    return { allowed: false, retryAfterMs, count: records.length };
  }

  return { allowed: true, retryAfterMs: 0, count: records.length };
}

export function markRateLimitAction(key) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const records = loadRecords(key).filter((value) => now - value < 24 * 60 * 60 * 1000);
  records.push(now);
  window.localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(records.slice(-50)));
}

export async function reportAbuseClient(payload) {
  await fetch("/api/telemetry/abuse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).catch(() => undefined);
}

export function formatRetryAfter(retryAfterMs) {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}分`;
}

function loadRecords(key) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
  } catch {
    return [];
  }
}

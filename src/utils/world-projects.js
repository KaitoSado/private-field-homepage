"use client";

export function buildProjectSettingsFromStore({ sceneName, lighting, environment, fog }) {
  return {
    sceneName,
    lighting,
    environment,
    fog
  };
}

export function normalizeProjectSettings(settings, defaults) {
  return {
    sceneName: settings?.sceneName || defaults.sceneName,
    lighting: settings?.lighting || defaults.lighting,
    environment: settings?.environment || defaults.environment,
    fog: settings?.fog || defaults.fog
  };
}

export function sceneObjectRowToObject(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.model_url,
    modelUrl: row.model_url,
    mimeType: row.mime_type || guessMimeTypeFromUrl(row.model_url),
    position: ensureVector(row.position, [0, 0, 0]),
    rotation: ensureVector(row.rotation, [0, 0, 0]),
    scale: ensureVector(row.scale, [1, 1, 1]),
    updatedBy: row.updated_by || null,
    updatedAt: row.updated_at || null,
    isRemote: true
  };
}

export function objectToSceneObjectRow({ object, projectId, userId }) {
  return {
    id: object.id,
    project_id: projectId,
    name: object.name,
    model_url: object.modelUrl || object.url || "",
    mime_type: object.mimeType || guessMimeTypeFromUrl(object.modelUrl || object.url),
    position: object.position || [0, 0, 0],
    rotation: object.rotation || [0, 0, 0],
    scale: object.scale || [1, 1, 1],
    updated_by: userId
  };
}

export function buildInviteUrl({ origin, projectId, token }) {
  const url = new URL(`/apps/vr/${projectId}`, origin);
  url.searchParams.set("invite", token);
  return url.toString();
}

export function colorForUser(userId) {
  const palette = ["#22c55e", "#38bdf8", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
  const key = `${userId || "user"}`;
  let total = 0;
  for (let index = 0; index < key.length; index += 1) {
    total = (total + key.charCodeAt(index) * (index + 17)) % 2147483647;
  }
  return palette[total % palette.length];
}

export function throttle(fn, wait) {
  let lastRun = 0;
  let timeoutId = null;
  let trailingArgs = null;

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastRun);

    if (remaining <= 0) {
      lastRun = now;
      fn(...args);
      return;
    }

    trailingArgs = args;
    if (timeoutId) return;
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      lastRun = Date.now();
      fn(...(trailingArgs || []));
      trailingArgs = null;
    }, remaining);
  };
}

function ensureVector(value, fallback) {
  return Array.isArray(value) && value.length === 3 ? value.map((entry, index) => Number(entry ?? fallback[index] ?? 0)) : [...fallback];
}

function guessMimeTypeFromUrl(url) {
  return `${url || ""}`.toLowerCase().includes(".gltf") ? "model/gltf+json" : "model/gltf-binary";
}

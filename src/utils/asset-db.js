"use client";

import Dexie from "dexie";

const db = new Dexie("fieldcard-world-editor");
db.version(1).stores({
  assets: "id, name, mimeType, createdAt"
});

function createAssetId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveAssetFile(file, preferredId) {
  const id = preferredId || createAssetId();
  await db.assets.put({
    id,
    name: file.name,
    mimeType: file.type || "",
    blob: file,
    createdAt: Date.now()
  });
  return {
    assetId: id,
    name: file.name,
    mimeType: file.type || ""
  };
}

export async function saveAssetFromDataUrl({ dataUrl, name, mimeType, preferredId }) {
  const file = dataUrlToFile(dataUrl, name, mimeType);
  return saveAssetFile(file, preferredId);
}

export async function getAssetRecord(assetId) {
  return db.assets.get(assetId);
}

export async function buildObjectUrlFromAsset(assetId) {
  const record = await getAssetRecord(assetId);
  if (!record?.blob) {
    throw new Error(`asset not found: ${assetId}`);
  }
  return {
    url: URL.createObjectURL(record.blob),
    name: record.name,
    mimeType: record.mimeType || guessMimeType(record.name)
  };
}

export async function exportAssetsForObjects(objects) {
  const assets = [];
  for (const object of objects || []) {
    if (!object.assetId) continue;
    const record = await getAssetRecord(object.assetId);
    if (!record?.blob) continue;
    assets.push({
      id: object.assetId,
      name: record.name,
      mimeType: record.mimeType || guessMimeType(record.name),
      dataUrl: await readBlobAsDataUrl(record.blob)
    });
  }
  return assets;
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ""}`);
    reader.onerror = () => reject(reader.error || new Error("blob read failed"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl, name, type) {
  const [header, body] = dataUrl.split(",");
  const isBase64 = header.includes(";base64");
  const bytes = isBase64 ? atob(body) : decodeURIComponent(body);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    array[index] = bytes.charCodeAt(index);
  }
  return new File([array], name, { type });
}

function guessMimeType(filename) {
  return filename?.toLowerCase().endsWith(".glb") ? "model/gltf-binary" : "model/gltf+json";
}

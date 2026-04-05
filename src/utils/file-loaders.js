import { buildObjectUrlFromAsset, saveAssetFile, saveAssetFromDataUrl } from "@/src/utils/asset-db";

const GLTF_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "model/gltf_binary",
  "application/octet-stream",
  "application/gltf-buffer",
  ""
]);

export function isGltfFile(file) {
  const lower = file.name.toLowerCase();
  if (!(lower.endsWith(".glb") || lower.endsWith(".gltf"))) {
    return false;
  }

  const mimeType = `${file.type || ""}`.toLowerCase();
  if (!mimeType) {
    return true;
  }

  return GLTF_TYPES.has(mimeType);
}

export async function filesToSceneObjects(files) {
  const valid = files.filter(isGltfFile);
  const objects = [];

  for (const [index, file] of valid.entries()) {
    let assetId = null;
    let mimeType = file.type || guessMimeType(file.name);
    try {
      const stored = await saveAssetFile(file);
      assetId = stored.assetId;
      mimeType = stored.mimeType || mimeType;
    } catch {
      // Keep the model usable even if IndexedDB is unavailable.
      assetId = null;
    }
    const objectUrl = URL.createObjectURL(file);
    objects.push({
      id: createObjectId(),
      name: file.name.replace(/\.(glb|gltf)$/i, "") || `Model ${index + 1}`,
      assetId,
      url: objectUrl,
      mimeType: mimeType || guessMimeType(file.name),
      position: [index * 1.8, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1]
    });
  }

  return objects;
}

export function revokeSceneObjectUrl(object) {
  if (object?.url) {
    URL.revokeObjectURL(object.url);
  }
}

export function revokeSceneObjectUrls(objects) {
  (objects || []).forEach(revokeSceneObjectUrl);
}

export async function rebuildSceneObjectsFromSnapshot(objects) {
  const rebuilt = [];

  for (const object of objects || []) {
    let assetId = object.assetId;

    if (!assetId && object.sourceData) {
      const stored = await saveAssetFromDataUrl({
        dataUrl: object.sourceData,
        name: `${object.name || "model"}.${guessExtension(object.mimeType)}`,
        mimeType: object.mimeType
      });
      assetId = stored.assetId;
    }

    if (!assetId) continue;
    const { url, mimeType, name } = await buildObjectUrlFromAsset(assetId);
    rebuilt.push({
      ...object,
      assetId,
      name: object.name || name?.replace(/\.(glb|gltf)$/i, "") || "Model",
      mimeType: object.mimeType || mimeType,
      url
    });
  }

  return rebuilt;
}

export async function rebuildSceneObjectsFromPortable({ objects, assets }) {
  const assetMap = new Map((assets || []).map((asset) => [asset.id, asset]));
  const rebuilt = [];

  for (const object of objects || []) {
    const asset = assetMap.get(object.assetId);
    if (!asset?.dataUrl) continue;
    const stored = await saveAssetFromDataUrl({
      dataUrl: asset.dataUrl,
      name: asset.name || `${object.name || "model"}.${guessExtension(asset.mimeType)}`,
      mimeType: asset.mimeType || object.mimeType,
      preferredId: object.assetId
    });
    const { url } = await buildObjectUrlFromAsset(stored.assetId);
    rebuilt.push({
      ...object,
      assetId: stored.assetId,
      mimeType: stored.mimeType || object.mimeType,
      url
    });
  }

  return rebuilt;
}

function createObjectId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `object-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function guessMimeType(filename) {
  return filename.toLowerCase().endsWith(".glb") ? "model/gltf-binary" : "model/gltf+json";
}

function guessExtension(mimeType) {
  return mimeType === "model/gltf+json" ? "gltf" : "glb";
}

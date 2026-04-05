const GLTF_TYPES = new Set(["model/gltf-binary", "model/gltf+json", "application/octet-stream", ""]);

export function isGltfFile(file) {
  const lower = file.name.toLowerCase();
  return (lower.endsWith(".glb") || lower.endsWith(".gltf")) && GLTF_TYPES.has(file.type || "");
}

export async function filesToSceneObjects(files) {
  const valid = files.filter(isGltfFile);
  const objects = [];

  for (const [index, file] of valid.entries()) {
    const dataUrl = await readFileAsDataUrl(file);
    const objectUrl = URL.createObjectURL(file);
    objects.push({
      id: createObjectId(),
      name: file.name.replace(/\.(glb|gltf)$/i, "") || `Model ${index + 1}`,
      url: objectUrl,
      mimeType: file.type || guessMimeType(file.name),
      sourceData: dataUrl,
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
    if (!object.sourceData) continue;
    const file = dataUrlToFile(object.sourceData, `${object.name || "model"}.${guessExtension(object.mimeType)}`, object.mimeType);
    const url = URL.createObjectURL(file);
    rebuilt.push({
      ...object,
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ""}`);
    reader.onerror = () => reject(reader.error || new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

function guessMimeType(filename) {
  return filename.toLowerCase().endsWith(".glb") ? "model/gltf-binary" : "model/gltf+json";
}

function guessExtension(mimeType) {
  return mimeType === "model/gltf+json" ? "gltf" : "glb";
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

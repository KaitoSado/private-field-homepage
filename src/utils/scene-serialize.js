const DEFAULT_VERSION = 2;

function normalizeObject(item) {
  return {
    id: item.id,
    name: item.name,
    assetId: item.assetId,
    mimeType: item.mimeType,
    position: item.position,
    rotation: item.rotation,
    scale: item.scale
  };
}

export function buildSceneSnapshot(scene) {
  return {
    version: DEFAULT_VERSION,
    sceneName: scene.sceneName || "みんなで作るVR空間",
    selectedId: scene.selectedId || null,
    objects: (scene.objects || []).map(normalizeObject),
    lighting: scene.lighting,
    environment: scene.environment,
    fog: scene.fog,
    camera: scene.camera
  };
}

export function serializePortableScene(scene, assets) {
  return JSON.stringify(
    {
      ...buildSceneSnapshot(scene),
      exportMode: "portable",
      assets: assets || []
    },
    null,
    2
  );
}

export function serializeLocalScene(scene) {
  return buildSceneSnapshot(scene);
}

export function parseSceneJson(source) {
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.objects)) {
    throw new Error("シーンJSONの形式が不正です。");
  }
  return {
    version: parsed.version || 1,
    sceneName: parsed.sceneName || "みんなで作るVR空間",
    selectedId: parsed.selectedId || null,
    objects: parsed.objects || [],
    lighting: parsed.lighting || null,
    environment: parsed.environment || null,
    fog: parsed.fog || null,
    camera: parsed.camera || null,
    assets: parsed.assets || [],
    exportMode: parsed.exportMode || "local"
  };
}

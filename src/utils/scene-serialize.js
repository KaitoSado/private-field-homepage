export function serializeScene({ sceneName, objects }) {
  return JSON.stringify(
    {
      version: 1,
      sceneName: sceneName || "みんなで作るVR空間",
      objects: (objects || []).map((item) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        sourceData: item.sourceData,
        position: item.position,
        rotation: item.rotation,
        scale: item.scale
      }))
    },
    null,
    2
  );
}

export function parseSceneJson(source) {
  const parsed = JSON.parse(source);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.objects)) {
    throw new Error("シーンJSONの形式が不正です。");
  }
  return parsed;
}

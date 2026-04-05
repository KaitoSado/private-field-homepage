"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ObjectInspectorPanel } from "@/src/components/world-editor/object-inspector-panel";
import { ObjectListPanel } from "@/src/components/world-editor/object-list-panel";
import { SceneViewport } from "@/src/components/world-editor/scene-viewport";
import { createEmptySceneState, useSceneEditorStore } from "@/src/stores/scene-editor-store";
import { exportAssetsForObjects } from "@/src/utils/asset-db";
import { filesToSceneObjects, rebuildSceneObjectsFromPortable, rebuildSceneObjectsFromSnapshot, revokeSceneObjectUrl, revokeSceneObjectUrls } from "@/src/utils/file-loaders";
import { buildSceneSnapshot, parseSceneJson, serializeLocalScene, serializePortableScene } from "@/src/utils/scene-serialize";

const WORKSPACE_KEY = "fieldcard-vr-scenes-v2";
const SHARE_LIMIT = 6000;

export function WorldEditorApp() {
  const fileInputRef = useRef(null);
  const sceneInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const [status, setStatus] = useState("モデルを落として、左の一覧と右の数値で空間を組みます。");
  const [dragActive, setDragActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);
  const [scenes, setScenes] = useState([]);

  const sceneName = useSceneEditorStore((state) => state.sceneName);
  const objects = useSceneEditorStore((state) => state.objects);
  const selectedId = useSceneEditorStore((state) => state.selectedId);
  const transformMode = useSceneEditorStore((state) => state.transformMode);
  const orbitEnabled = useSceneEditorStore((state) => state.orbitEnabled);
  const lighting = useSceneEditorStore((state) => state.lighting);
  const environment = useSceneEditorStore((state) => state.environment);
  const fog = useSceneEditorStore((state) => state.fog);
  const camera = useSceneEditorStore((state) => state.camera);
  const cameraRequest = useSceneEditorStore((state) => state.cameraRequest);
  const historyPast = useSceneEditorStore((state) => state.historyPast);
  const historyFuture = useSceneEditorStore((state) => state.historyFuture);

  const addObjects = useSceneEditorStore((state) => state.addObjects);
  const selectObject = useSceneEditorStore((state) => state.selectObject);
  const renameObject = useSceneEditorStore((state) => state.renameObject);
  const updateObjectTransform = useSceneEditorStore((state) => state.updateObjectTransform);
  const beginTransform = useSceneEditorStore((state) => state.beginTransform);
  const endTransform = useSceneEditorStore((state) => state.endTransform);
  const setTransformMode = useSceneEditorStore((state) => state.setTransformMode);
  const setOrbitEnabled = useSceneEditorStore((state) => state.setOrbitEnabled);
  const removeSelectedObject = useSceneEditorStore((state) => state.removeSelectedObject);
  const setSceneName = useSceneEditorStore((state) => state.setSceneName);
  const replaceScene = useSceneEditorStore((state) => state.replaceScene);
  const updateLightingField = useSceneEditorStore((state) => state.updateLightingField);
  const updateEnvironmentField = useSceneEditorStore((state) => state.updateEnvironmentField);
  const updateFogField = useSceneEditorStore((state) => state.updateFogField);
  const updateCurrentCameraPose = useSceneEditorStore((state) => state.updateCurrentCameraPose);
  const requestCameraPose = useSceneEditorStore((state) => state.requestCameraPose);
  const clearCameraRequest = useSceneEditorStore((state) => state.clearCameraRequest);
  const saveCurrentCameraBookmark = useSceneEditorStore((state) => state.saveCurrentCameraBookmark);
  const renameCameraBookmark = useSceneEditorStore((state) => state.renameCameraBookmark);
  const removeCameraBookmark = useSceneEditorStore((state) => state.removeCameraBookmark);
  const undo = useSceneEditorStore((state) => state.undo);
  const redo = useSceneEditorStore((state) => state.redo);

  const selectedObject = useMemo(() => objects.find((item) => item.id === selectedId) || null, [objects, selectedId]);
  const currentSnapshot = useMemo(
    () =>
      serializeLocalScene({
        sceneName,
        objects,
        selectedId,
        lighting,
        environment,
        fog,
        camera
      }),
    [camera, environment, fog, lighting, objects, sceneName, selectedId]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      revokeSceneObjectUrls(useSceneEditorStore.getState().objects);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get("scene");
      if (shared) {
        try {
          const parsed = parseSceneJson(decodeSharePayload(shared));
          const rebuiltObjects = await rebuildSceneObjectsFromPortable({ objects: parsed.objects, assets: parsed.assets });
          if (cancelled) return;
          const nextSceneId = createSceneId();
          replaceScene({
            ...createEmptySceneState(parsed.sceneName),
            ...parsed,
            objects: rebuiltObjects,
            selectedId: rebuiltObjects[0]?.id || null
          });
          requestCameraPose(parsed.camera?.currentPose || createEmptySceneState(parsed.sceneName).camera.currentPose);
          const nextScenes = [
            {
              id: nextSceneId,
              name: parsed.sceneName,
              updatedAt: Date.now(),
              snapshot: {
                ...buildSceneSnapshot(parsed),
                objects: parsed.objects
              }
            }
          ];
          setScenes(nextScenes);
          setCurrentSceneId(nextSceneId);
          persistWorkspace(nextScenes, nextSceneId);
          setStatus("共有URLのシーンを読み込みました。");
          setHydrated(true);
          return;
        } catch (error) {
          setStatus(error.message || "共有URLの読み込みに失敗しました。");
        }
      }

      const workspace = loadWorkspace();
      if (workspace.scenes.length) {
        const nextSceneId = workspace.currentSceneId || workspace.scenes[0].id;
        const entry = workspace.scenes.find((scene) => scene.id === nextSceneId) || workspace.scenes[0];
        const rebuiltObjects = await rebuildSceneObjectsFromSnapshot(entry.snapshot.objects);
        if (cancelled) return;
        replaceScene({
          ...createEmptySceneState(entry.snapshot.sceneName),
          ...entry.snapshot,
          objects: rebuiltObjects,
          selectedId: rebuiltObjects[0]?.id || entry.snapshot.selectedId || null
        });
        requestCameraPose(entry.snapshot.camera?.currentPose || createEmptySceneState(entry.snapshot.sceneName).camera.currentPose);
        setScenes(workspace.scenes);
        setCurrentSceneId(entry.id);
      } else {
        const nextSceneId = createSceneId();
        const initialScene = {
          id: nextSceneId,
          name: "はじめてのシーン",
          updatedAt: Date.now(),
          snapshot: serializeLocalScene(createEmptySceneState("はじめてのシーン"))
        };
        replaceScene(createEmptySceneState("はじめてのシーン"));
        requestCameraPose(createEmptySceneState("はじめてのシーン").camera.currentPose);
        setScenes([initialScene]);
        setCurrentSceneId(nextSceneId);
        persistWorkspace([initialScene], nextSceneId);
      }
      setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [replaceScene]);

  useEffect(() => {
    if (!hydrated || !currentSceneId) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setScenes((previous) => {
        const nextScenes = upsertScene(previous, {
          id: currentSceneId,
          name: currentSnapshot.sceneName,
          updatedAt: Date.now(),
          snapshot: currentSnapshot
        });
        persistWorkspace(nextScenes, currentSceneId);
        return nextScenes;
      });
    }, 250);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentSceneId, currentSnapshot, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    function handleKeyDown(event) {
      const tag = event.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSaveNow();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
          return;
        }
        undo();
        return;
      }

      if (isTyping) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        const removed = removeSelectedObject();
        if (removed) {
          revokeSceneObjectUrl(removed);
          setStatus(`${removed.name} を削除しました。`);
        }
      }

      if (event.key.toLowerCase() === "w") {
        setTransformMode("translate");
      }
      if (event.key.toLowerCase() === "e") {
        setTransformMode("rotate");
      }
      if (event.key.toLowerCase() === "r") {
        setTransformMode("scale");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hydrated, redo, undo, removeSelectedObject, setTransformMode]);

  async function handleDropFiles(files) {
    const validFiles = files.filter((file) => /\.gltf?$/i.test(file.name));
    if (!validFiles.length) {
      setStatus("GLB / GLTF を落としてください。");
      return;
    }

    const nextObjects = await filesToSceneObjects(validFiles);
    addObjects(nextObjects);
    setStatus(`${nextObjects.length}個のモデルを読み込みました。`);
  }

  async function handleImportScene(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const source = await file.text();
      const parsed = parseSceneJson(source);
      const previous = useSceneEditorStore.getState().objects;
      let rebuiltObjects;
      if (parsed.assets?.length) {
        rebuiltObjects = await rebuildSceneObjectsFromPortable({ objects: parsed.objects, assets: parsed.assets });
      } else {
        rebuiltObjects = await rebuildSceneObjectsFromSnapshot(parsed.objects);
      }
      revokeSceneObjectUrls(previous);
      replaceScene({
        ...createEmptySceneState(parsed.sceneName),
        ...parsed,
        objects: rebuiltObjects,
        selectedId: rebuiltObjects[0]?.id || null
      });
      requestCameraPose(parsed.camera?.currentPose || createEmptySceneState(parsed.sceneName).camera.currentPose);
      setScenes((previousScenes) => {
        const nextId = currentSceneId || createSceneId();
        const nextScenes = upsertScene(previousScenes, {
          id: nextId,
          name: parsed.sceneName,
          updatedAt: Date.now(),
          snapshot: serializeLocalScene({
            ...parsed,
            sceneName: parsed.sceneName,
            objects: rebuiltObjects,
            selectedId: rebuiltObjects[0]?.id || null,
            lighting: parsed.lighting || currentSnapshot.lighting,
            environment: parsed.environment || currentSnapshot.environment,
            fog: parsed.fog || currentSnapshot.fog,
            camera: parsed.camera || currentSnapshot.camera
          })
        });
        setCurrentSceneId(nextId);
        persistWorkspace(nextScenes, nextId);
        return nextScenes;
      });
      setStatus("シーンを読み込みました。");
    } catch (error) {
      setStatus(error.message || "JSON の読み込みに失敗しました。");
    } finally {
      event.target.value = "";
    }
  }

  async function handleExportScene() {
    const portable = await buildPortableScene();
    const blob = new Blob([serializePortableScene(portable.scene, portable.assets)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(sceneName || "fieldcard-vr-scene")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("シーンを JSON で書き出しました。");
  }

  async function handleShareScene() {
    const portable = await buildPortableScene();
    const payload = serializePortableScene(portable.scene, portable.assets);
    const encoded = encodeSharePayload(payload);
    if (encoded.length > SHARE_LIMIT) {
      setStatus("シーンが重いため URL 共有には向きません。ファイル書き出しを使ってください。");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("scene", encoded);
    await navigator.clipboard.writeText(url.toString());
    setStatus("共有URLをコピーしました。");
  }

  function handleSaveNow() {
    if (!currentSceneId) return;
    setScenes((previous) => {
      const nextScenes = upsertScene(previous, {
        id: currentSceneId,
        name: currentSnapshot.sceneName,
        updatedAt: Date.now(),
        snapshot: currentSnapshot
      });
      persistWorkspace(nextScenes, currentSceneId);
      return nextScenes;
    });
    setStatus("ローカルに保存しました。");
  }

  async function handleSwitchScene(sceneId) {
    if (sceneId === currentSceneId) return;
    const entry = scenes.find((scene) => scene.id === sceneId);
    if (!entry) return;
    const previous = useSceneEditorStore.getState().objects;
    const rebuiltObjects = await rebuildSceneObjectsFromSnapshot(entry.snapshot.objects);
    revokeSceneObjectUrls(previous);
    replaceScene({
      ...createEmptySceneState(entry.snapshot.sceneName),
      ...entry.snapshot,
      objects: rebuiltObjects,
      selectedId: rebuiltObjects[0]?.id || entry.snapshot.selectedId || null
    });
    requestCameraPose(entry.snapshot.camera?.currentPose || createEmptySceneState(entry.snapshot.sceneName).camera.currentPose);
    setCurrentSceneId(sceneId);
    persistWorkspace(scenes, sceneId);
    setStatus(`${entry.name} を開きました。`);
  }

  function handleCreateScene() {
    const nextId = createSceneId();
    const nextScene = {
      id: nextId,
      name: `シーン ${scenes.length + 1}`,
      updatedAt: Date.now(),
      snapshot: serializeLocalScene(createEmptySceneState(`シーン ${scenes.length + 1}`))
    };
    const previous = useSceneEditorStore.getState().objects;
    revokeSceneObjectUrls(previous);
    replaceScene(createEmptySceneState(nextScene.name));
    requestCameraPose(createEmptySceneState(nextScene.name).camera.currentPose);
    const nextScenes = [...scenes, nextScene];
    setScenes(nextScenes);
    setCurrentSceneId(nextId);
    persistWorkspace(nextScenes, nextId);
    setStatus("新しいシーンを作りました。");
  }

  async function handleDeleteScene(sceneId) {
    if (scenes.length === 1) {
      const replacement = {
        id: createSceneId(),
        name: "新しいシーン",
        updatedAt: Date.now(),
        snapshot: serializeLocalScene(createEmptySceneState("新しいシーン"))
      };
      const previous = useSceneEditorStore.getState().objects;
      revokeSceneObjectUrls(previous);
      replaceScene(createEmptySceneState("新しいシーン"));
      requestCameraPose(createEmptySceneState("新しいシーン").camera.currentPose);
      setScenes([replacement]);
      setCurrentSceneId(replacement.id);
      persistWorkspace([replacement], replacement.id);
      setStatus("シーンを削除して、新しい空間に切り替えました。");
      return;
    }
    const remaining = scenes.filter((scene) => scene.id !== sceneId);
    if (!remaining.length) return;
    const fallback = remaining[0];
    setScenes(remaining);
    if (sceneId === currentSceneId) {
      const previous = useSceneEditorStore.getState().objects;
      const rebuiltObjects = await rebuildSceneObjectsFromSnapshot(fallback.snapshot.objects);
      revokeSceneObjectUrls(previous);
      replaceScene({
        ...createEmptySceneState(fallback.snapshot.sceneName),
        ...fallback.snapshot,
        objects: rebuiltObjects,
        selectedId: rebuiltObjects[0]?.id || fallback.snapshot.selectedId || null
      });
      requestCameraPose(fallback.snapshot.camera?.currentPose || createEmptySceneState(fallback.snapshot.sceneName).camera.currentPose);
      setCurrentSceneId(fallback.id);
      persistWorkspace(remaining, fallback.id);
    } else {
      persistWorkspace(remaining, currentSceneId);
    }
    setStatus("シーンを削除しました。");
  }

  async function buildPortableScene() {
    const assets = await exportAssetsForObjects(objects);
    return {
      scene: {
        sceneName,
        objects,
        selectedId,
        lighting,
        environment,
        fog,
        camera
      },
      assets
    };
  }

  return (
    <section className="section-grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">みんなで作るVR空間</p>
          <h1 className="page-title">3Dシーンを持ち寄って、ブラウザ上で空間を組む</h1>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
        <ObjectListPanel
          sceneName={sceneName}
          onSceneNameChange={setSceneName}
          objects={objects}
          selectedId={selectedId}
          onSelect={selectObject}
          onRename={renameObject}
          onTriggerImport={() => fileInputRef.current?.click()}
          onTriggerSceneImport={() => sceneInputRef.current?.click()}
          onExportScene={() => void handleExportScene()}
          onShareScene={() => void handleShareScene()}
          onSaveScene={handleSaveNow}
          status={status}
          scenes={scenes}
          currentSceneId={currentSceneId}
          onCreateScene={handleCreateScene}
          onSwitchScene={(sceneId) => void handleSwitchScene(sceneId)}
          onDeleteScene={(sceneId) => void handleDeleteScene(sceneId)}
        />

        <div className="grid gap-4">
          <SceneViewport
            objects={objects}
            selectedId={selectedId}
            transformMode={transformMode}
            orbitEnabled={orbitEnabled}
            lighting={lighting}
            environment={environment}
            fog={fog}
            cameraPose={camera.currentPose}
            cameraRequest={cameraRequest}
            onSelect={selectObject}
            onTransformStart={() => {
              beginTransform();
              setOrbitEnabled(false);
            }}
            onTransformEnd={() => {
              endTransform();
              setOrbitEnabled(true);
            }}
            onTransformCommit={updateObjectTransform}
            onDropFiles={handleDropFiles}
            dragActive={dragActive}
            onDragStateChange={setDragActive}
            onCameraPoseChange={updateCurrentCameraPose}
            onCameraRequestSettled={clearCameraRequest}
            onRequestCameraPose={requestCameraPose}
          />

          <div className="grid gap-3 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur md:grid-cols-4">
            <MiniNote title="シーン保存">Ctrl+S でローカル保存。起動時に自動復元します。</MiniNote>
            <MiniNote title="共有">軽いシーンは URL 共有、重いシーンは JSON を書き出します。</MiniNote>
            <MiniNote title="カメラ">Top / Front / Right / Perspective と視点保存を使えます。</MiniNote>
            <MiniNote title="Undo / Redo">Ctrl+Z / Ctrl+Shift+Z で操作をさかのぼれます。</MiniNote>
          </div>
        </div>

        <ObjectInspectorPanel
          object={selectedObject}
          transformMode={transformMode}
          onSetTransformMode={setTransformMode}
          onDelete={() => {
            const removed = removeSelectedObject();
            if (removed) {
              revokeSceneObjectUrl(removed);
              setStatus(`${removed.name} を削除しました。`);
            }
          }}
          canDelete={Boolean(selectedObject)}
          onUpdateField={(field, axis, value) => {
            if (!selectedObject) return;
            const next = [...selectedObject[field]];
            next[axis] = Number.isFinite(value) ? value : 0;
            updateObjectTransform(selectedObject.id, { [field]: next }, { recordHistory: true });
          }}
          sceneStats={{ count: objects.length }}
          lighting={lighting}
          environment={environment}
          fog={fog}
          camera={camera}
          onUpdateLightingField={updateLightingField}
          onUpdateEnvironmentField={updateEnvironmentField}
          onUpdateFogField={updateFogField}
          onSaveCameraBookmark={() => saveCurrentCameraBookmark(`視点 ${camera.bookmarks.length + 1}`)}
          onRequestCameraPose={requestCameraPose}
          onRenameCameraBookmark={renameCameraBookmark}
          onRemoveCameraBookmark={removeCameraBookmark}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          onUndo={undo}
          onRedo={redo}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        multiple
        hidden
        onChange={(event) => {
          void handleDropFiles(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      <input ref={sceneInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void handleImportScene(event)} />
    </section>
  );
}

function MiniNote({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-600">{children}</div>
    </div>
  );
}

function loadWorkspace() {
  if (typeof window === "undefined") {
    return { currentSceneId: null, scenes: [] };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.scenes)) {
      return { currentSceneId: null, scenes: [] };
    }
    return parsed;
  } catch {
    return { currentSceneId: null, scenes: [] };
  }
}

function persistWorkspace(scenes, currentSceneId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({
      currentSceneId,
      scenes
    })
  );
}

function upsertScene(scenes, entry) {
  const exists = scenes.some((scene) => scene.id === entry.id);
  if (!exists) {
    return [...scenes, entry];
  }
  return scenes.map((scene) => (scene.id === entry.id ? entry : scene));
}

function createSceneId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value) {
  return (value || "scene")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function encodeSharePayload(payload) {
  return btoa(unescape(encodeURIComponent(payload))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeSharePayload(payload) {
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ObjectInspectorPanel } from "@/src/components/world-editor/object-inspector-panel";
import { ObjectListPanel } from "@/src/components/world-editor/object-list-panel";
import { SceneViewport } from "@/src/components/world-editor/scene-viewport";
import { useSceneEditorStore } from "@/src/stores/scene-editor-store";
import { filesToSceneObjects, rebuildSceneObjectsFromSnapshot, revokeSceneObjectUrl, revokeSceneObjectUrls } from "@/src/utils/file-loaders";
import { parseSceneJson, serializeScene } from "@/src/utils/scene-serialize";

export function WorldEditorApp() {
  const fileInputRef = useRef(null);
  const sceneInputRef = useRef(null);
  const [status, setStatus] = useState("モデルを落として、左の一覧と右の数値で空間を組みます。");
  const [dragActive, setDragActive] = useState(false);

  const sceneName = useSceneEditorStore((state) => state.sceneName);
  const objects = useSceneEditorStore((state) => state.objects);
  const selectedId = useSceneEditorStore((state) => state.selectedId);
  const transformMode = useSceneEditorStore((state) => state.transformMode);
  const orbitEnabled = useSceneEditorStore((state) => state.orbitEnabled);
  const addObjects = useSceneEditorStore((state) => state.addObjects);
  const selectObject = useSceneEditorStore((state) => state.selectObject);
  const renameObject = useSceneEditorStore((state) => state.renameObject);
  const updateObjectTransform = useSceneEditorStore((state) => state.updateObjectTransform);
  const setTransformMode = useSceneEditorStore((state) => state.setTransformMode);
  const setOrbitEnabled = useSceneEditorStore((state) => state.setOrbitEnabled);
  const removeSelectedObject = useSceneEditorStore((state) => state.removeSelectedObject);
  const clearScene = useSceneEditorStore((state) => state.clearScene);
  const replaceScene = useSceneEditorStore((state) => state.replaceScene);

  const selectedObject = useMemo(() => objects.find((item) => item.id === selectedId) || null, [objects, selectedId]);

  useEffect(() => {
    return () => {
      revokeSceneObjectUrls(useSceneEditorStore.getState().objects);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = event.target?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea";
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
  }, [removeSelectedObject, setTransformMode]);

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
      const snapshot = parseSceneJson(source);
      const previous = clearScene();
      revokeSceneObjectUrls(previous);
      const rebuiltObjects = await rebuildSceneObjectsFromSnapshot(snapshot.objects);
      replaceScene({
        sceneName: snapshot.sceneName,
        objects: rebuiltObjects,
        selectedId: rebuiltObjects[0]?.id || null
      });
      setStatus("保存したシーンを読み込みました。");
    } catch (error) {
      setStatus(error.message || "JSON の読み込みに失敗しました。");
    } finally {
      event.target.value = "";
    }
  }

  function handleExportScene() {
    const blob = new Blob([serializeScene({ sceneName, objects })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "fieldcard-vr-scene.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("シーンを JSON で保存しました。");
  }

  function handleClearScene() {
    const previous = clearScene();
    revokeSceneObjectUrls(previous);
    setStatus("シーンを空に戻しました。");
  }

  return (
    <section className="section-grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">みんなで作るVR空間</p>
          <h1 className="page-title">3Dシーンを持ち寄って、ブラウザ上で空間を組む</h1>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <ObjectListPanel
          objects={objects}
          selectedId={selectedId}
          onSelect={selectObject}
          onRename={renameObject}
          onTriggerImport={() => fileInputRef.current?.click()}
          onTriggerSceneImport={() => sceneInputRef.current?.click()}
          onExportScene={handleExportScene}
          onClearScene={handleClearScene}
          status={status}
        />

        <div className="grid gap-4">
          <SceneViewport
            objects={objects}
            selectedId={selectedId}
            transformMode={transformMode}
            orbitEnabled={orbitEnabled}
            onSelect={selectObject}
            onTransformStart={() => setOrbitEnabled(false)}
            onTransformEnd={() => setOrbitEnabled(true)}
            onTransformCommit={updateObjectTransform}
            onDropFiles={handleDropFiles}
            dragActive={dragActive}
            onDragStateChange={setDragActive}
          />

          <div className="grid gap-3 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur md:grid-cols-3">
            <MiniNote title="ドラッグ&ドロップ">GLB / GLTF を落とすだけでシーンに追加します。</MiniNote>
            <MiniNote title="キーボード">W: 移動 / E: 回転 / R: 拡大 / Delete: 削除</MiniNote>
            <MiniNote title="保存">最低限の配置情報を JSON で保存し、あとで再読込できます。</MiniNote>
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
            updateObjectTransform(selectedObject.id, { [field]: next });
          }}
          sceneStats={{ count: objects.length }}
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

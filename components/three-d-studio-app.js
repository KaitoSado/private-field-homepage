"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STEP_TABS = [
  { id: "shape", label: "1. つくる" },
  { id: "move", label: "2. うごかす" },
  { id: "material", label: "3. ぬる" },
  { id: "light", label: "4. ひかり" },
  { id: "finish", label: "5. しあげ" }
];

const PRIMITIVES = [
  { type: "cube", label: "立方体", color: "#4f8fff" },
  { type: "sphere", label: "球体", color: "#ff8f66" },
  { type: "cylinder", label: "円柱", color: "#66c68f" }
];

const CAMERA_PRESETS = [
  { label: "正面", yaw: 0, pitch: 0.2 },
  { label: "斜め", yaw: -0.8, pitch: 0.48 },
  { label: "真上", yaw: 0.2, pitch: 1.2 },
  { label: "横", yaw: Math.PI / 2, pitch: 0.2 }
];

export function ThreeDStudioApp() {
  const initialSceneRef = useRef(null);
  const objectCounterRef = useRef(2);
  const fileInputRef = useRef(null);

  if (!initialSceneRef.current) {
    initialSceneRef.current = createInitialScene();
  }

  const [scene, setScene] = useState(() => cloneScene(initialSceneRef.current));
  const sceneRef = useRef(scene);
  const historyRef = useRef([cloneScene(initialSceneRef.current)]);
  const historyIndexRef = useRef(0);
  const [historyMeta, setHistoryMeta] = useState({ index: 0, length: 1 });
  const [activeStep, setActiveStep] = useState("shape");
  const [status, setStatus] = useState("立方体から始めて、色や形を少しずつ変えてみてください。");
  const [dragState, setDragState] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  const selectedObject = useMemo(
    () => scene.objects.find((item) => item.id === scene.selectedId) || scene.objects[0] || null,
    [scene]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawStudioScene(context, scene);
  }, [scene]);

  function applyScene(nextScene, options = {}) {
    const normalized = normalizeScene(nextScene);
    sceneRef.current = normalized;
    setScene(normalized);
    if (options.recordHistory !== false) {
      const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      nextHistory.push(cloneScene(normalized));
      const trimmed = nextHistory.slice(-80);
      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      setHistoryMeta({ index: historyIndexRef.current, length: trimmed.length });
    }
    if (options.status) {
      setStatus(options.status);
    }
  }

  function updateScene(recipe, options = {}) {
    const draft = cloneScene(sceneRef.current);
    recipe(draft);
    applyScene(draft, options);
  }

  function jumpHistory(index) {
    const snapshot = historyRef.current[index];
    if (!snapshot) return;
    const nextScene = cloneScene(snapshot);
    sceneRef.current = nextScene;
    setScene(nextScene);
    historyIndexRef.current = index;
    setHistoryMeta({ index, length: historyRef.current.length });
    setStatus("前の状態に戻しました。");
  }

  function addPrimitive(type) {
    const primitiveIndex = scene.objects.filter((item) => item.type === type).length + 1;
    const object = createSceneObject(type, objectCounterRef.current, primitiveIndex);
    objectCounterRef.current += 1;

    updateScene(
      (draft) => {
        draft.objects.push(object);
        draft.selectedId = object.id;
      },
      {
        status: `${primitiveLabel(type)}を追加しました。`
      }
    );
  }

  function removeSelectedObject() {
    if (!selectedObject) return;
    if (scene.objects.length === 1) {
      setStatus("最後のひとつは残してあります。");
      return;
    }

    updateScene(
      (draft) => {
        draft.objects = draft.objects.filter((item) => item.id !== selectedObject.id);
        draft.selectedId = draft.objects[0]?.id || null;
      },
      {
        status: `${selectedObject.name}を片づけました。`
      }
    );
  }

  function duplicateSelectedObject() {
    if (!selectedObject) return;
    const duplicated = cloneObject(selectedObject);
    duplicated.id = `object-${objectCounterRef.current}`;
    objectCounterRef.current += 1;
    duplicated.name = `${selectedObject.name} copy`;
    duplicated.position.x += 0.8;
    duplicated.position.y += 0.4;

    updateScene(
      (draft) => {
        draft.objects.push(duplicated);
        draft.selectedId = duplicated.id;
      },
      {
        status: `${selectedObject.name}を複製しました。`
      }
    );
  }

  function resetScene() {
    const nextScene = createInitialScene();
    objectCounterRef.current = 2;
    historyRef.current = [cloneScene(nextScene)];
    historyIndexRef.current = 0;
    setHistoryMeta({ index: 0, length: 1 });
    sceneRef.current = nextScene;
    setScene(nextScene);
    setStatus("最初の状態に戻しました。");
  }

  function updateSelectedObject(recipe, statusMessage) {
    if (!selectedObject) return;

    updateScene(
      (draft) => {
        const target = draft.objects.find((item) => item.id === draft.selectedId);
        if (!target) return;
        recipe(target, draft);
      },
      statusMessage
        ? {
            status: statusMessage
          }
        : {}
    );
  }

  function updateMaterial(key, value) {
    updateSelectedObject((target) => {
      target.material[key] = value;
    });
  }

  function updateCamera(key, value) {
    updateScene((draft) => {
      draft.camera[key] = value;
    });
  }

  function updateLight(key, value) {
    updateScene((draft) => {
      draft.light[key] = value;
    });
  }

  function handlePointerDown(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screen = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
    const hit = pickSceneObject(sceneRef.current, screen, canvas.width, canvas.height);

    if (hit) {
      setScene((current) => ({ ...current, selectedId: hit.id }));
    }

    if (hit && activeStep === "move") {
      const basis = getCameraBasis(sceneRef.current.camera);
      setDragState({
        kind: "object",
        objectId: hit.id,
        startX: event.clientX,
        startY: event.clientY,
        startPosition: cloneVector(hit.position),
        right: basis.right,
        up: basis.up,
        distance: sceneRef.current.camera.distance
      });
    } else {
      setDragState({
        kind: "camera",
        startX: event.clientX,
        startY: event.clientY,
        yaw: sceneRef.current.camera.yaw,
        pitch: sceneRef.current.camera.pitch
      });
    }
  }

  function handlePointerMove(event) {
    if (!dragState) return;

    if (dragState.kind === "camera") {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      const nextScene = cloneScene(sceneRef.current);
      nextScene.camera.yaw = dragState.yaw + deltaX * 0.01;
      nextScene.camera.pitch = clampFloat(dragState.pitch + deltaY * 0.008, -1.45, 1.45, dragState.pitch);
      sceneRef.current = normalizeScene(nextScene);
      setScene(sceneRef.current);
      return;
    }

    if (dragState.kind === "object") {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const scale = dragState.distance / 260;

      const offset = {
        x: dragState.right.x * deltaX * scale + dragState.up.x * -deltaY * scale,
        y: dragState.right.y * deltaX * scale + dragState.up.y * -deltaY * scale,
        z: dragState.right.z * deltaX * scale + dragState.up.z * -deltaY * scale
      };

      const nextScene = cloneScene(sceneRef.current);
      const target = nextScene.objects.find((item) => item.id === dragState.objectId);
      if (!target) return;
      target.position.x = dragState.startPosition.x + offset.x;
      target.position.y = dragState.startPosition.y + offset.y;
      target.position.z = dragState.startPosition.z + offset.z;
      sceneRef.current = normalizeScene(nextScene);
      setScene(sceneRef.current);
    }
  }

  function handlePointerUp() {
    if (!dragState) return;
    if (dragState.kind === "object" || dragState.kind === "camera") {
      applyScene(sceneRef.current, {
        status: dragState.kind === "object" ? "直接つかんで動かしました。" : "視点を動かしました。"
      });
    }
    setDragState(null);
  }

  function handleWheel(event) {
    event.preventDefault();
    const nextScene = cloneScene(sceneRef.current);
    nextScene.camera.distance = clampFloat(
      nextScene.camera.distance + event.deltaY * 0.01,
      4,
      26,
      nextScene.camera.distance
    );
    applyScene(nextScene, {
      status: "ズームを調整しました。"
    });
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = `${reader.result || ""}`;

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          const nextScene = normalizeScene(parsed);
          historyRef.current = [cloneScene(nextScene)];
          historyIndexRef.current = 0;
          setHistoryMeta({ index: 0, length: 1 });
          sceneRef.current = nextScene;
          setScene(nextScene);
          setStatus("JSON シーンを読み込みました。");
        } else if (file.name.endsWith(".obj")) {
          const mesh = parseObjMesh(text);
          const object = createCustomMeshObject(mesh, objectCounterRef.current);
          objectCounterRef.current += 1;
          updateScene(
            (draft) => {
              draft.objects.push(object);
              draft.selectedId = object.id;
            },
            {
              status: "OBJ を読み込みました。"
            }
          );
        } else {
          setStatus("JSON か OBJ を選んでください。");
        }
      } catch (error) {
        setStatus(error.message || "読み込みに失敗しました。");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  function exportSceneAsJson() {
    triggerDownload("fieldcard-3d-scene.json", JSON.stringify(sceneRef.current, null, 2), "application/json");
    setStatus("JSON を保存しました。");
  }

  function exportSceneAsObj() {
    const obj = buildSceneObj(sceneRef.current);
    triggerDownload("fieldcard-3d-scene.obj", obj, "text/plain");
    setStatus("OBJ を保存しました。");
  }

  return (
    <div className="dashboard-layout modeler-shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">3Dモデル3Dグラフィック</h1>
        </div>
      </section>

      <section className="section-grid">
        <div className="surface modeler-history-bar">
          <div className="modeler-history-meta">
            <strong>さっきの状態に戻る</strong>
            <span>{status}</span>
          </div>
          <div className="modeler-history-controls">
            <button
              type="button"
              className="button button-ghost button-small"
              onClick={() => jumpHistory(Math.max(0, historyMeta.index - 1))}
              disabled={historyMeta.index <= 0}
            >
              戻す
            </button>
            <input
              className="modeler-history-slider"
              type="range"
              min="0"
              max={Math.max(0, historyMeta.length - 1)}
              value={historyMeta.index}
              onChange={(event) => jumpHistory(Number(event.target.value))}
            />
            <button
              type="button"
              className="button button-ghost button-small"
              onClick={() => jumpHistory(Math.min(historyMeta.length - 1, historyMeta.index + 1))}
              disabled={historyMeta.index >= historyMeta.length - 1}
            >
              進める
            </button>
          </div>
        </div>

        <div className="arcade-tab-row">
          {STEP_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`signature-filter-chip ${activeStep === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveStep(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modeler-grid">
          <div className="surface modeler-stage-card">
            <canvas
              ref={canvasRef}
              width={1080}
              height={680}
              className="modeler-canvas"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onWheel={handleWheel}
            />
          </div>

          <div className="surface modeler-side-card">
            <div className="modeler-selection-strip">
              {scene.objects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`button button-ghost button-small ${scene.selectedId === item.id ? "is-active" : ""}`}
                  onClick={() => setScene((current) => ({ ...current, selectedId: item.id }))}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {activeStep === "shape" ? (
              <div className="modeler-control-stack">
                <div className="math-readout">
                  <strong>形を置く</strong>
                  <span>まずは立方体、球体、円柱のどれかを置いて、すぐ形を触れる状態にします。</span>
                </div>

                <div className="math-chip-row">
                  {PRIMITIVES.map((item) => (
                    <button key={item.type} type="button" className="button button-secondary" onClick={() => addPrimitive(item.type)}>
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="hero-actions">
                  <button type="button" className="button button-ghost" onClick={duplicateSelectedObject} disabled={!selectedObject}>
                    ふやす
                  </button>
                  <button type="button" className="button button-ghost" onClick={removeSelectedObject} disabled={!selectedObject}>
                    けす
                  </button>
                  <button type="button" className="button button-ghost" onClick={resetScene}>
                    最初から
                  </button>
                </div>

                {selectedObject ? (
                  <div className="modeler-object-card">
                    <strong>{selectedObject.name}</strong>
                    <span>{primitiveLabel(selectedObject.type)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeStep === "move" && selectedObject ? (
              <div className="modeler-control-stack">
                <div className="math-readout">
                  <strong>直接つかんで動かす</strong>
                  <span>キャンバス上の物体をドラッグすると移動します。細かい調整は下のスライダーで行えます。</span>
                </div>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="ひだり ↔ みぎ"
                    min={-6}
                    max={6}
                    step={0.1}
                    value={selectedObject.position.x}
                    onChange={(value) => updateSelectedObject((target) => (target.position.x = value))}
                  />
                  <ModelerSlider
                    label="うえ ↔ した"
                    min={-4}
                    max={4}
                    step={0.1}
                    value={selectedObject.position.y}
                    onChange={(value) => updateSelectedObject((target) => (target.position.y = value))}
                  />
                  <ModelerSlider
                    label="てまえ ↔ おく"
                    min={-6}
                    max={6}
                    step={0.1}
                    value={selectedObject.position.z}
                    onChange={(value) => updateSelectedObject((target) => (target.position.z = value))}
                  />
                </div>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="くるっと回す"
                    min={-3.14}
                    max={3.14}
                    step={0.01}
                    value={selectedObject.rotation.y}
                    onChange={(value) => updateSelectedObject((target) => (target.rotation.y = value))}
                  />
                  <ModelerSlider
                    label="たてに傾ける"
                    min={-1.57}
                    max={1.57}
                    step={0.01}
                    value={selectedObject.rotation.x}
                    onChange={(value) => updateSelectedObject((target) => (target.rotation.x = value))}
                  />
                  <ModelerSlider
                    label="大きさ"
                    min={0.4}
                    max={3}
                    step={0.05}
                    value={selectedObject.scale.x}
                    onChange={(value) =>
                      updateSelectedObject((target) => {
                        target.scale.x = value;
                        target.scale.y = value;
                        target.scale.z = value;
                      })
                    }
                  />
                </div>

                <div className="math-readout">
                  <strong>形をこねる</strong>
                  <span>専門用語は出さず、触感ベースで形を変えられるようにしています。</span>
                </div>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="にゅっと出す"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedObject.shape.extrude}
                    onChange={(value) => updateSelectedObject((target) => (target.shape.extrude = value))}
                  />
                  <ModelerSlider
                    label="カドを丸める"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedObject.shape.roundness}
                    onChange={(value) => updateSelectedObject((target) => (target.shape.roundness = value))}
                  />
                  <ModelerSlider
                    label="のびる"
                    min={0.4}
                    max={2.6}
                    step={0.05}
                    value={selectedObject.scale.y}
                    onChange={(value) => updateSelectedObject((target) => (target.scale.y = value))}
                  />
                </div>
              </div>
            ) : null}

            {activeStep === "material" && selectedObject ? (
              <div className="modeler-control-stack">
                <div className="math-readout">
                  <strong>見た目を決める</strong>
                  <span>数値ではなく、色と質感の印象で調整します。</span>
                </div>

                <label className="field">
                  <span>色をぬる</span>
                  <input
                    type="color"
                    value={selectedObject.material.color}
                    onChange={(event) => updateMaterial("color", event.target.value)}
                    className="modeler-color-input"
                  />
                </label>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="ツヤツヤ"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedObject.material.metalness}
                    onChange={(value) => updateMaterial("metalness", value)}
                  />
                  <ModelerSlider
                    label="ザラザラ"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedObject.material.roughness}
                    onChange={(value) => updateMaterial("roughness", value)}
                  />
                  <ModelerSlider
                    label="光らせる"
                    min={0}
                    max={1}
                    step={0.01}
                    value={selectedObject.material.emission}
                    onChange={(value) => updateMaterial("emission", value)}
                  />
                </div>
              </div>
            ) : null}

            {activeStep === "light" ? (
              <div className="modeler-control-stack">
                <div className="math-readout">
                  <strong>ひかりと視点</strong>
                  <span>光の向きとカメラを変えるだけで、同じ形でも印象が大きく変わります。</span>
                </div>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="太陽の向き"
                    min={-180}
                    max={180}
                    step={1}
                    value={scene.light.azimuth}
                    onChange={(value) => updateLight("azimuth", value)}
                  />
                  <ModelerSlider
                    label="太陽の高さ"
                    min={-10}
                    max={85}
                    step={1}
                    value={scene.light.elevation}
                    onChange={(value) => updateLight("elevation", value)}
                  />
                  <ModelerSlider
                    label="明るさ"
                    min={0.2}
                    max={1.8}
                    step={0.01}
                    value={scene.light.intensity}
                    onChange={(value) => updateLight("intensity", value)}
                  />
                  <ModelerSlider
                    label="全体の明るさ"
                    min={0}
                    max={0.9}
                    step={0.01}
                    value={scene.light.ambient}
                    onChange={(value) => updateLight("ambient", value)}
                  />
                </div>

                <div className="math-chip-row">
                  {CAMERA_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="button button-ghost button-small"
                      onClick={() =>
                        updateScene(
                          (draft) => {
                            draft.camera.yaw = preset.yaw;
                            draft.camera.pitch = preset.pitch;
                          },
                          { status: `${preset.label}の視点にしました。` }
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="modeler-slider-block">
                  <ModelerSlider
                    label="近づく / 離れる"
                    min={4}
                    max={26}
                    step={0.1}
                    value={scene.camera.distance}
                    onChange={(value) => updateCamera("distance", value)}
                  />
                </div>
              </div>
            ) : null}

            {activeStep === "finish" ? (
              <div className="modeler-control-stack">
                <div className="math-readout">
                  <strong>しあげ</strong>
                  <span>骨組みで見るか、色付きで見るかを切り替え、データとして持ち出せます。</span>
                </div>

                <div className="math-chip-row">
                  <button
                    type="button"
                    className={`button button-small ${scene.renderMode === "solid" ? "button-primary" : "button-ghost"}`}
                    onClick={() =>
                      updateScene(
                        (draft) => {
                          draft.renderMode = "solid";
                        },
                        { status: "色つき表示にしました。" }
                      )
                    }
                  >
                    色つき
                  </button>
                  <button
                    type="button"
                    className={`button button-small ${scene.renderMode === "wireframe" ? "button-primary" : "button-ghost"}`}
                    onClick={() =>
                      updateScene(
                        (draft) => {
                          draft.renderMode = "wireframe";
                        },
                        { status: "骨組み表示にしました。" }
                      )
                    }
                  >
                    骨組み
                  </button>
                </div>

                <div className="hero-actions">
                  <button type="button" className="button button-secondary" onClick={exportSceneAsJson}>
                    JSON保存
                  </button>
                  <button type="button" className="button button-secondary" onClick={exportSceneAsObj}>
                    OBJ書き出し
                  </button>
                  <button type="button" className="button button-ghost" onClick={() => fileInputRef.current?.click()}>
                    読み込む
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json,.obj" hidden onChange={handleImport} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ModelerSlider({ label, min, max, step, value, onChange }) {
  return (
    <label className="field modeler-slider-field">
      <div className="modeler-slider-topline">
        <span>{label}</span>
        <strong>{formatCompactNumber(value)}</strong>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function createInitialScene() {
  return normalizeScene({
    selectedId: "object-1",
    renderMode: "solid",
    camera: {
      yaw: -0.8,
      pitch: 0.48,
      distance: 10.5,
      target: { x: 0, y: 0.6, z: 0 }
    },
    light: {
      azimuth: 34,
      elevation: 42,
      intensity: 1.1,
      ambient: 0.34
    },
    objects: [createSceneObject("cube", 1, 1)]
  });
}

function normalizeScene(scene) {
  return {
    selectedId: scene.selectedId || scene.objects?.[0]?.id || null,
    renderMode: scene.renderMode || "solid",
    camera: {
      yaw: scene.camera?.yaw ?? -0.8,
      pitch: scene.camera?.pitch ?? 0.48,
      distance: scene.camera?.distance ?? 10.5,
      target: cloneVector(scene.camera?.target || { x: 0, y: 0.6, z: 0 })
    },
    light: {
      azimuth: scene.light?.azimuth ?? 34,
      elevation: scene.light?.elevation ?? 42,
      intensity: scene.light?.intensity ?? 1.1,
      ambient: scene.light?.ambient ?? 0.34
    },
    objects: (scene.objects || []).map((object, index) => normalizeObject(object, index))
  };
}

function normalizeObject(object, index) {
  const fallbackType = object.type || "cube";
  return {
    id: object.id || `object-${index + 1}`,
    type: fallbackType,
    name: object.name || `${primitiveLabel(fallbackType)} ${index + 1}`,
    position: cloneVector(object.position || { x: 0, y: 0, z: 0 }),
    rotation: cloneVector(object.rotation || { x: 0, y: 0, z: 0 }),
    scale: cloneVector(object.scale || { x: 1.2, y: 1.2, z: 1.2 }),
    shape: {
      extrude: object.shape?.extrude ?? 0.2,
      roundness: object.shape?.roundness ?? 0.12
    },
    material: {
      color: object.material?.color || primitiveColor(fallbackType),
      metalness: object.material?.metalness ?? 0.18,
      roughness: object.material?.roughness ?? 0.38,
      emission: object.material?.emission ?? 0
    },
    mesh: object.mesh
      ? {
          vertices: object.mesh.vertices.map((vertex) => cloneVector(vertex)),
          faces: object.mesh.faces.map((face) => [...face])
        }
      : null
  };
}

function cloneScene(scene) {
  return normalizeScene(scene);
}

function cloneObject(object) {
  return normalizeObject(object, 0);
}

function cloneVector(vector) {
  return {
    x: vector?.x ?? 0,
    y: vector?.y ?? 0,
    z: vector?.z ?? 0
  };
}

function createSceneObject(type, idNumber, primitiveIndex) {
  const presets = {
    cube: {
      position: { x: 0, y: 0.6, z: 0 },
      scale: { x: 1.4, y: 1.4, z: 1.4 },
      shape: { extrude: 0.25, roundness: 0.12 }
    },
    sphere: {
      position: { x: 0, y: 0.8, z: 0 },
      scale: { x: 1.4, y: 1.4, z: 1.4 },
      shape: { extrude: 0.12, roundness: 0.35 }
    },
    cylinder: {
      position: { x: 0, y: 0.8, z: 0 },
      scale: { x: 1.3, y: 1.8, z: 1.3 },
      shape: { extrude: 0.28, roundness: 0.2 }
    }
  };

  const preset = presets[type] || presets.cube;

  return normalizeObject({
    id: `object-${idNumber}`,
    type,
    name: `${primitiveLabel(type)} ${primitiveIndex}`,
    position: preset.position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: preset.scale,
    shape: preset.shape,
    material: {
      color: primitiveColor(type),
      metalness: 0.16,
      roughness: 0.38,
      emission: 0
    }
  });
}

function createCustomMeshObject(mesh, idNumber) {
  return normalizeObject({
    id: `object-${idNumber}`,
    type: "custom",
    name: `読み込みOBJ ${idNumber}`,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1.4, y: 1.4, z: 1.4 },
    shape: { extrude: 0.2, roundness: 0 },
    material: {
      color: "#8b7bff",
      metalness: 0.08,
      roughness: 0.46,
      emission: 0
    },
    mesh
  });
}

function primitiveLabel(type) {
  if (type === "cube") return "立方体";
  if (type === "sphere") return "球体";
  if (type === "cylinder") return "円柱";
  if (type === "custom") return "読み込みモデル";
  return type;
}

function primitiveColor(type) {
  if (type === "cube") return "#4f8fff";
  if (type === "sphere") return "#ff8f66";
  if (type === "cylinder") return "#66c68f";
  return "#7c88ff";
}

function drawStudioScene(context, scene) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintStudioBackground(context, canvas.width, canvas.height);

  const cameraState = buildCameraState(scene.camera, canvas.width, canvas.height);
  drawFloorGrid(context, cameraState, scene);

  const lightDirection = directionFromAngles(scene.light.azimuth, scene.light.elevation);
  const surfaces = [];

  for (const object of scene.objects) {
    const mesh = getObjectMesh(object);
    const worldVertices = mesh.vertices.map((vertex) => transformObjectVertex(vertex, object));
    const projectedVertices = worldVertices.map((vertex) => projectWorldPoint(vertex, cameraState));
    const objectCenter = averageVertices(worldVertices);
    const selectionRadius = computeProjectedRadius(projectedVertices, canvas.width, canvas.height);

    surfaces.push({
      kind: "selection",
      objectId: object.id,
      center: projectWorldPoint(objectCenter, cameraState),
      radius: selectionRadius,
      selected: object.id === scene.selectedId
    });

    for (const face of mesh.faces) {
      const worldFace = face.map((index) => worldVertices[index]);
      const projectedFace = face.map((index) => projectedVertices[index]).filter(Boolean);
      if (projectedFace.length !== face.length) continue;

      const normal = normalizeVector(faceNormal(worldFace[0], worldFace[1], worldFace[2]));
      const centroid = averageVertices(worldFace);
      const toCamera = normalizeVector(subtractVectors(cameraState.position, centroid));
      const facing = dotProduct(normal, toCamera);
      if (facing <= 0.02) continue;

      const brightness =
        scene.light.ambient +
        Math.max(0, dotProduct(normal, lightDirection)) * scene.light.intensity * (1 - object.material.roughness * 0.35);
      const fill = shadeColor(object.material.color, brightness, object.material.metalness, object.material.emission);

      surfaces.push({
        kind: "face",
        objectId: object.id,
        depth: averageDepth(projectedFace),
        points: projectedFace,
        fill,
        selected: object.id === scene.selectedId
      });
    }
  }

  surfaces
    .filter((item) => item.kind === "face")
    .sort((left, right) => right.depth - left.depth)
    .forEach((surface) => {
      drawFace(context, surface, scene.renderMode);
    });

  surfaces
    .filter((item) => item.kind === "selection" && item.center)
    .forEach((selection) => drawSelectionRing(context, selection));

  drawSceneOverlay(context, scene, canvas.width, canvas.height);
}

function paintStudioBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f6faf6");
  gradient.addColorStop(0.5, "#eef5f6");
  gradient.addColorStop(1, "#f9f2e8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawFloorGrid(context, cameraState, scene) {
  const lines = [];
  for (let index = -10; index <= 10; index += 1) {
    lines.push([
      { x: index, y: -0.01, z: -10 },
      { x: index, y: -0.01, z: 10 }
    ]);
    lines.push([
      { x: -10, y: -0.01, z: index },
      { x: 10, y: -0.01, z: index }
    ]);
  }

  context.save();
  context.strokeStyle = scene.renderMode === "wireframe" ? "rgba(15, 23, 42, 0.12)" : "rgba(15, 23, 42, 0.08)";
  context.lineWidth = 1;

  for (const [start, end] of lines) {
    const a = projectWorldPoint(start, cameraState);
    const b = projectWorldPoint(end, cameraState);
    if (!a || !b) continue;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  }
  context.restore();
}

function drawFace(context, surface, renderMode) {
  context.save();
  context.beginPath();
  surface.points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();

  if (renderMode === "wireframe") {
    context.strokeStyle = surface.selected ? "rgba(15, 23, 42, 0.95)" : "rgba(58, 83, 107, 0.9)";
    context.lineWidth = surface.selected ? 2.2 : 1.1;
    context.stroke();
  } else {
    context.fillStyle = surface.fill;
    context.fill();
    context.strokeStyle = surface.selected ? "rgba(15, 23, 42, 0.92)" : "rgba(255, 255, 255, 0.35)";
    context.lineWidth = surface.selected ? 1.8 : 0.9;
    context.stroke();
  }

  context.restore();
}

function drawSelectionRing(context, selection) {
  context.save();
  context.strokeStyle = selection.selected ? "rgba(16, 24, 40, 0.92)" : "rgba(31, 111, 120, 0.2)";
  context.lineWidth = selection.selected ? 2 : 1;
  context.setLineDash(selection.selected ? [] : [6, 8]);
  context.beginPath();
  context.arc(selection.center.x, selection.center.y, selection.radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawSceneOverlay(context, scene, width, height) {
  context.save();
  context.fillStyle = "rgba(15, 23, 42, 0.7)";
  context.font = "600 15px IBM Plex Mono, monospace";
  context.fillText(`視点: ドラッグ`, 24, 28);
  context.fillText(`ズーム: ホイール`, 24, 48);
  context.fillText(`表示: ${scene.renderMode === "solid" ? "色つき" : "骨組み"}`, 24, 68);
  context.restore();
}

function getObjectMesh(object) {
  if (object.type === "custom" && object.mesh) {
    return object.mesh;
  }

  if (object.type === "sphere") {
    return createSphereMesh(18, 12, object.shape.roundness);
  }

  if (object.type === "cylinder") {
    return createCylinderMesh(18, object.shape.extrude, object.shape.roundness);
  }

  return createCubeMesh(object.shape.extrude, object.shape.roundness);
}

function createCubeMesh(extrude = 0.2, roundness = 0.1) {
  const depth = 0.5 + extrude * 0.8;
  const base = [
    { x: -0.5, y: -0.5, z: -depth },
    { x: 0.5, y: -0.5, z: -depth },
    { x: 0.5, y: 0.5, z: -depth },
    { x: -0.5, y: 0.5, z: -depth },
    { x: -0.5, y: -0.5, z: depth },
    { x: 0.5, y: -0.5, z: depth },
    { x: 0.5, y: 0.5, z: depth },
    { x: -0.5, y: 0.5, z: depth }
  ];

  const vertices = base.map((vertex) => {
    const length = Math.hypot(vertex.x, vertex.y, vertex.z) || 1;
    const sphere = {
      x: (vertex.x / length) * 0.78,
      y: (vertex.y / length) * 0.78,
      z: (vertex.z / length) * 0.78
    };
    return mixVectors(vertex, sphere, roundness * 0.65);
  });

  const quads = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7]
  ];

  return triangulateQuads(vertices, quads);
}

function createSphereMesh(segments = 18, rings = 12, roundness = 0.3) {
  const vertices = [];
  const faces = [];
  const radius = 0.75 + roundness * 0.2;

  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = (Math.PI * ring) / rings;
    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = (Math.PI * 2 * segment) / segments;
      vertices.push({
        x: Math.sin(phi) * Math.cos(theta) * radius,
        y: Math.cos(phi) * radius,
        z: Math.sin(phi) * Math.sin(theta) * radius
      });
    }
  }

  const width = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * width + segment;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      faces.push([a, c, b], [b, c, d]);
    }
  }

  return { vertices, faces };
}

function createCylinderMesh(segments = 18, extrude = 0.2, roundness = 0.16) {
  const vertices = [];
  const faces = [];
  const radius = 0.52 + roundness * 0.16;
  const halfHeight = 0.65 + extrude * 0.75;

  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push({ x, y: -halfHeight, z });
  }
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push({ x, y: halfHeight, z });
  }

  const bottomCenter = vertices.push({ x: 0, y: -halfHeight, z: 0 }) - 1;
  const topCenter = vertices.push({ x: 0, y: halfHeight, z: 0 }) - 1;

  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    const bottomA = index;
    const bottomB = next;
    const topA = index + segments;
    const topB = next + segments;
    faces.push([bottomA, topA, topB], [bottomA, topB, bottomB]);
    faces.push([bottomCenter, bottomB, bottomA]);
    faces.push([topCenter, topA, topB]);
  }

  return { vertices, faces };
}

function triangulateQuads(vertices, quads) {
  const faces = [];
  quads.forEach((quad) => {
    faces.push([quad[0], quad[1], quad[2]]);
    faces.push([quad[0], quad[2], quad[3]]);
  });
  return { vertices, faces };
}

function transformObjectVertex(vertex, object) {
  let next = {
    x: vertex.x * object.scale.x,
    y: vertex.y * object.scale.y,
    z: vertex.z * object.scale.z
  };
  next = rotateVertex(next, object.rotation);
  return {
    x: next.x + object.position.x,
    y: next.y + object.position.y,
    z: next.z + object.position.z
  };
}

function rotateVertex(vertex, rotation) {
  let next = { ...vertex };

  next = rotateAroundX(next, rotation.x);
  next = rotateAroundY(next, rotation.y);
  next = rotateAroundZ(next, rotation.z);
  return next;
}

function rotateAroundX(vertex, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vertex.x,
    y: vertex.y * cos - vertex.z * sin,
    z: vertex.y * sin + vertex.z * cos
  };
}

function rotateAroundY(vertex, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vertex.x * cos + vertex.z * sin,
    y: vertex.y,
    z: -vertex.x * sin + vertex.z * cos
  };
}

function rotateAroundZ(vertex, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vertex.x * cos - vertex.y * sin,
    y: vertex.x * sin + vertex.y * cos,
    z: vertex.z
  };
}

function buildCameraState(camera, width, height) {
  const target = camera.target;
  const position = {
    x: target.x + camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
    y: target.y + camera.distance * Math.sin(camera.pitch),
    z: target.z + camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw)
  };

  const forward = normalizeVector(subtractVectors(target, position));
  const right = normalizeVector(crossProduct(forward, { x: 0, y: 1, z: 0 }));
  const up = normalizeVector(crossProduct(right, forward));

  return {
    width,
    height,
    target,
    position,
    forward,
    right,
    up,
    focalLength: 560
  };
}

function getCameraBasis(camera) {
  const cameraState = buildCameraState(camera, 1000, 1000);
  return {
    right: cameraState.right,
    up: cameraState.up
  };
}

function projectWorldPoint(point, cameraState) {
  const relative = subtractVectors(point, cameraState.position);
  const x = dotProduct(relative, cameraState.right);
  const y = dotProduct(relative, cameraState.up);
  const z = dotProduct(relative, cameraState.forward);

  if (z <= 0.2) {
    return null;
  }

  return {
    x: cameraState.width / 2 + (x / z) * cameraState.focalLength,
    y: cameraState.height / 2 - (y / z) * cameraState.focalLength,
    depth: z
  };
}

function computeProjectedRadius(projectedVertices, width, height) {
  const visible = projectedVertices.filter(Boolean);
  if (!visible.length) return 0;
  const center = visible.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  center.x /= visible.length;
  center.y /= visible.length;
  const maxDistance = visible.reduce((current, point) => Math.max(current, Math.hypot(point.x - center.x, point.y - center.y)), 0);
  return clampFloat(maxDistance, 18, Math.min(width, height) / 3, 26);
}

function averageVertices(vertices) {
  const total = vertices.reduce(
    (acc, vertex) => ({
      x: acc.x + vertex.x,
      y: acc.y + vertex.y,
      z: acc.z + vertex.z
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: total.x / vertices.length,
    y: total.y / vertices.length,
    z: total.z / vertices.length
  };
}

function averageDepth(points) {
  return points.reduce((total, point) => total + point.depth, 0) / points.length;
}

function faceNormal(a, b, c) {
  return crossProduct(subtractVectors(b, a), subtractVectors(c, a));
}

function subtractVectors(left, right) {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function mixVectors(left, right, amount) {
  return {
    x: left.x + (right.x - left.x) * amount,
    y: left.y + (right.y - left.y) * amount,
    z: left.z + (right.z - left.z) * amount
  };
}

function crossProduct(left, right) {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function dotProduct(left, right) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function directionFromAngles(azimuth, elevation) {
  const yaw = degreesToRadians(azimuth);
  const pitch = degreesToRadians(elevation);
  return normalizeVector({
    x: Math.cos(pitch) * Math.sin(yaw),
    y: Math.sin(pitch),
    z: Math.cos(pitch) * Math.cos(yaw)
  });
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function shadeColor(hex, brightness, metalness, emission) {
  const rgb = hexToRgb(hex);
  const glow = emission * 155;
  const mix = clampFloat(brightness, 0.08, 2.4, 1);
  const highlight = metalness * 45;

  return `rgb(${clampChannel(rgb.r * mix + highlight + glow)}, ${clampChannel(rgb.g * mix + highlight + glow * 0.55)}, ${clampChannel(
    rgb.b * mix + highlight + glow * 0.35
  )})`;
}

function hexToRgb(hex) {
  const source = `${hex || "#7c88ff"}`.replace("#", "");
  const normalized = source.length === 3 ? source.split("").map((char) => `${char}${char}`).join("") : source;
  const number = Number.parseInt(normalized, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function pickSceneObject(scene, screen, width, height) {
  const cameraState = buildCameraState(scene.camera, width, height);

  const hits = scene.objects
    .map((object) => {
      const mesh = getObjectMesh(object);
      const worldVertices = mesh.vertices.map((vertex) => transformObjectVertex(vertex, object));
      const center = projectWorldPoint(averageVertices(worldVertices), cameraState);
      if (!center) return null;
      const projectedVertices = worldVertices.map((vertex) => projectWorldPoint(vertex, cameraState));
      const radius = computeProjectedRadius(projectedVertices, width, height);
      const distance = Math.hypot(center.x - screen.x, center.y - screen.y);
      if (distance > radius) return null;
      return {
        id: object.id,
        position: object.position,
        distance
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distance - right.distance);

  return hits[0] || null;
}

function triggerDownload(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildSceneObj(scene) {
  let output = "# FieldCard 3D export\n";
  let vertexOffset = 1;

  scene.objects.forEach((object) => {
    const mesh = getObjectMesh(object);
    const worldVertices = mesh.vertices.map((vertex) => transformObjectVertex(vertex, object));
    output += `o ${object.name}\n`;
    worldVertices.forEach((vertex) => {
      output += `v ${vertex.x.toFixed(6)} ${vertex.y.toFixed(6)} ${vertex.z.toFixed(6)}\n`;
    });
    mesh.faces.forEach((face) => {
      output += `f ${face[0] + vertexOffset} ${face[1] + vertexOffset} ${face[2] + vertexOffset}\n`;
    });
    vertexOffset += worldVertices.length;
  });

  return output;
}

function parseObjMesh(source) {
  const vertices = [];
  const faces = [];

  source.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const parts = trimmed.split(/\s+/);

    if (parts[0] === "v" && parts.length >= 4) {
      vertices.push({
        x: Number(parts[1]),
        y: Number(parts[2]),
        z: Number(parts[3])
      });
    }

    if (parts[0] === "f" && parts.length >= 4) {
      const indices = parts
        .slice(1)
        .map((part) => Number(part.split("/")[0]) - 1)
        .filter((value) => Number.isInteger(value) && value >= 0);

      for (let index = 1; index < indices.length - 1; index += 1) {
        faces.push([indices[0], indices[index], indices[index + 1]]);
      }
    }
  });

  if (!vertices.length || !faces.length) {
    throw new Error("OBJ の頂点か面を読み取れませんでした。");
  }

  return {
    vertices: normalizeImportedVertices(vertices),
    faces
  };
}

function normalizeImportedVertices(vertices) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  vertices.forEach((vertex) => {
    min.x = Math.min(min.x, vertex.x);
    min.y = Math.min(min.y, vertex.y);
    min.z = Math.min(min.z, vertex.z);
    max.x = Math.max(max.x, vertex.x);
    max.y = Math.max(max.y, vertex.y);
    max.z = Math.max(max.z, vertex.z);
  });

  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2
  };
  const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) || 1;
  const scale = 1.6 / size;

  return vertices.map((vertex) => ({
    x: (vertex.x - center.x) * scale,
    y: (vertex.y - center.y) * scale,
    z: (vertex.z - center.z) * scale
  }));
}

function clampFloat(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

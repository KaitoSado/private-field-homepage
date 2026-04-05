"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Grid, Html, OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

const CAMERA_PRESETS = [
  {
    label: "Top",
    pose: {
      position: [0, 16, 0.01],
      target: [0, 0, 0]
    }
  },
  {
    label: "Front",
    pose: {
      position: [0, 5, 14],
      target: [0, 1, 0]
    }
  },
  {
    label: "Right",
    pose: {
      position: [14, 4, 0],
      target: [0, 1, 0]
    }
  },
  {
    label: "Perspective",
    pose: {
      position: [8, 6, 10],
      target: [0, 1, 0]
    }
  }
];

export function SceneViewport({
  objects,
  selectedId,
  transformMode,
  orbitEnabled,
  lighting,
  environment,
  fog,
  cameraPose,
  cameraRequest,
  onSelect,
  onTransformStart,
  onTransformEnd,
  onTransformCommit,
  onDropFiles,
  dragActive,
  onDragStateChange,
  onCameraPoseChange,
  onCameraRequestSettled,
  onRequestCameraPose,
  remoteSelections = {},
  presenceCameras = []
}) {
  return (
    <div
      className={`relative h-[72vh] min-h-[560px] overflow-hidden rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_22%),linear-gradient(180deg,#081121_0%,#101827_100%)] shadow-[0_24px_60px_rgba(20,29,40,0.12)] ${
        dragActive ? "ring-4 ring-cyan-300/40" : ""
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragStateChange(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onDragStateChange(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDragStateChange(false);
        onDropFiles(Array.from(event.dataTransfer.files || []));
      }}
    >
      <Canvas camera={{ position: cameraPose.position, fov: 45 }} shadows onPointerMissed={() => onSelect(null)}>
        <SceneViewportInner
          objects={objects}
          selectedId={selectedId}
          transformMode={transformMode}
          orbitEnabled={orbitEnabled}
          lighting={lighting}
          environment={environment}
          fog={fog}
          cameraPose={cameraPose}
          cameraRequest={cameraRequest}
          onSelect={onSelect}
          onTransformStart={onTransformStart}
          onTransformEnd={onTransformEnd}
          onTransformCommit={onTransformCommit}
          onCameraPoseChange={onCameraPoseChange}
          onCameraRequestSettled={onCameraRequestSettled}
          remoteSelections={remoteSelections}
          presenceCameras={presenceCameras}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-100 backdrop-blur">
        <div className="font-semibold">GLB / GLTF をここへドロップ</div>
        <div className="mt-1 text-slate-300">W / E / R でモード切替、Delete で削除</div>
      </div>

      <div className="absolute right-4 top-4 flex flex-wrap gap-2">
        {CAMERA_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onRequestCameraPose(preset.pose)}
            className="rounded-full border border-white/15 bg-slate-950/55 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-slate-900/70"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SceneViewportInner({
  objects,
  selectedId,
  transformMode,
  orbitEnabled,
  lighting,
  environment,
  fog,
  cameraPose,
  cameraRequest,
  onSelect,
  onTransformStart,
  onTransformEnd,
  onTransformCommit,
  onCameraPoseChange,
  onCameraRequestSettled,
  remoteSelections,
  presenceCameras
}) {
  const controlsRef = useRef(null);

  return (
    <>
      {environment.mode === "color" ? <color attach="background" args={[environment.backgroundColor]} /> : <color attach="background" args={["#0f172a"]} />}
      {fog.enabled ? <fog attach="fog" args={[fog.color, fog.near, fog.far]} /> : null}
      {environment.mode === "environment" ? <Environment background preset={environment.environmentPreset} /> : null}
      <ambientLight color={lighting.ambient.color} intensity={lighting.ambient.intensity} />
      <directionalLight
        position={lighting.directional.direction}
        color={lighting.directional.color}
        intensity={lighting.directional.intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Grid
        args={[100, 100]}
        sectionSize={4}
        cellSize={1}
        cellThickness={0.5}
        sectionThickness={1}
        cellColor="#1f3452"
        sectionColor="#365b82"
        fadeDistance={80}
        fadeStrength={1.5}
        infiniteGrid
      />
      <axesHelper args={[2]} />
      <Suspense fallback={<Html center className="rounded-full bg-white/90 px-4 py-2 text-sm text-slate-800">読み込み中…</Html>}>
        {objects.map((object) => (
          <SceneObjectNode
            key={object.id}
            object={object}
            selected={object.id === selectedId}
            remoteSelection={remoteSelections[object.id] || null}
            transformMode={transformMode}
            onSelect={onSelect}
            onTransformStart={onTransformStart}
            onTransformEnd={onTransformEnd}
            onTransformCommit={onTransformCommit}
          />
        ))}
      </Suspense>
      <PresenceCameraMarkers items={presenceCameras} />
      <OrbitControls ref={controlsRef} makeDefault enabled={orbitEnabled} target={cameraPose.target} />
      <CameraRig controlsRef={controlsRef} request={cameraRequest} onPoseChange={onCameraPoseChange} onSettled={onCameraRequestSettled} />
      <CameraPoseSync controlsRef={controlsRef} onPoseChange={onCameraPoseChange} />
    </>
  );
}

function SceneObjectNode({ object, selected, remoteSelection, transformMode, onSelect, onTransformStart, onTransformEnd, onTransformCommit }) {
  const groupRef = useRef(null);
  const { scene } = useGLTF(object.url);
  const clonedScene = useMemo(() => cloneSkinned(scene), [scene]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.fromArray(object.position);
    groupRef.current.rotation.set(object.rotation[0], object.rotation[1], object.rotation[2]);
    groupRef.current.scale.set(object.scale[0], object.scale[1], object.scale[2]);
  }, [object.position, object.rotation, object.scale]);

  const content = (
    <group
      ref={groupRef}
      name={object.name}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(object.id);
      }}
    >
      <primitive object={clonedScene} />
      {selected ? <SelectionBounds targetRef={groupRef} /> : null}
      {!selected && remoteSelection ? <RemoteSelectionBounds targetRef={groupRef} color={remoteSelection.color} /> : null}
    </group>
  );

  if (!selected) {
    return content;
  }

  return (
    <TransformControls
      mode={transformMode}
      onMouseDown={() => onTransformStart()}
      onMouseUp={() => onTransformEnd()}
      onObjectChange={() => {
        if (!groupRef.current) return;
        onTransformCommit(object.id, {
          position: groupRef.current.position.toArray(),
          rotation: [groupRef.current.rotation.x, groupRef.current.rotation.y, groupRef.current.rotation.z],
          scale: groupRef.current.scale.toArray()
        });
      }}
    >
      {content}
    </TransformControls>
  );
}

function SelectionBounds({ targetRef }) {
  const helperRef = useRef(null);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!targetRef.current) return undefined;
    const helper = new THREE.BoxHelper(targetRef.current, "#7dd3fc");
    helper.material.transparent = true;
    helper.material.opacity = 0.92;
    scene.add(helper);
    helperRef.current = helper;

    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      helper.material.dispose();
      helperRef.current = null;
    };
  }, [scene, targetRef]);

  useFrame(() => {
    helperRef.current?.update();
  });

  return null;
}

function RemoteSelectionBounds({ targetRef, color }) {
  const helperRef = useRef(null);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!targetRef.current) return undefined;
    const helper = new THREE.BoxHelper(targetRef.current, color || "#f59e0b");
    helper.material.transparent = true;
    helper.material.opacity = 0.78;
    scene.add(helper);
    helperRef.current = helper;

    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      helper.material.dispose();
      helperRef.current = null;
    };
  }, [color, scene, targetRef]);

  useFrame(() => {
    helperRef.current?.update();
  });

  return null;
}

function CameraPoseSync({ controlsRef, onPoseChange }) {
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;

    const syncPose = () => {
      onPoseChange({
        position: controls.object.position.toArray(),
        target: controls.target.toArray()
      });
    };

    controls.addEventListener("change", syncPose);
    syncPose();
    return () => controls.removeEventListener("change", syncPose);
  }, [controlsRef, onPoseChange]);

  return null;
}

function CameraRig({ controlsRef, request, onPoseChange, onSettled }) {
  const camera = useThree((state) => state.camera);
  const animationRef = useRef(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!request || !controls) return;

    animationRef.current = {
      id: request.id,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: new THREE.Vector3(...request.pose.position),
      toTarget: new THREE.Vector3(...request.pose.target),
      startedAt: performance.now(),
      duration: 420
    };
  }, [camera, controlsRef, request]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || !animationRef.current) return;

    const animation = animationRef.current;
    const elapsed = performance.now() - animation.startedAt;
    const progress = Math.min(1, elapsed / animation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(animation.fromPosition, animation.toPosition, eased);
    controls.target.lerpVectors(animation.fromTarget, animation.toTarget, eased);
    controls.update();

    if (progress >= 1) {
      onPoseChange({
        position: controls.object.position.toArray(),
        target: controls.target.toArray()
      });
      animationRef.current = null;
      onSettled();
    }
  });

  return null;
}

function PresenceCameraMarkers({ items }) {
  return (
    <>
      {items.map((item) => (
        <group key={item.userId} position={item.position}>
          <mesh>
            <boxGeometry args={[0.26, 0.18, 0.18]} />
            <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0, -0.16]}>
            <coneGeometry args={[0.12, 0.18, 12]} />
            <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.25} />
          </mesh>
          <Html position={[0, 0.36, 0]} center>
            <div className="rounded-full border border-white/20 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {item.name}
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

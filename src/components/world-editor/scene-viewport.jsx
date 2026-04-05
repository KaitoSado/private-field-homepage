"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Html, OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export function SceneViewport({
  objects,
  selectedId,
  transformMode,
  orbitEnabled,
  onSelect,
  onTransformStart,
  onTransformEnd,
  onTransformCommit,
  onDropFiles,
  dragActive,
  onDragStateChange
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
      <Canvas camera={{ position: [8, 6, 10], fov: 45 }} shadows onPointerMissed={() => onSelect(null)}>
        <color attach="background" args={["#0c1222"]} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[6, 9, 4]} intensity={1.8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
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
              transformMode={transformMode}
              onSelect={onSelect}
              onTransformStart={onTransformStart}
              onTransformEnd={onTransformEnd}
              onTransformCommit={onTransformCommit}
            />
          ))}
        </Suspense>
        <OrbitControls makeDefault enabled={orbitEnabled} />
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-100 backdrop-blur">
        <div className="font-semibold">GLB / GLTF をここへドロップ</div>
        <div className="mt-1 text-slate-300">W / E / R でモード切替、Delete で削除</div>
      </div>
    </div>
  );
}

function SceneObjectNode({ object, selected, transformMode, onSelect, onTransformStart, onTransformEnd, onTransformCommit }) {
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

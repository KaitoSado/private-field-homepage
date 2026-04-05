import { WorldEditorApp } from "@/src/components/world-editor/world-editor-app";

export const metadata = {
  title: "みんなで作るVR空間 | Apps | FieldCard Social",
  description: "GLB / GLTF を持ち寄って、ブラウザ上で3D空間を組み立てるシーンエディタ。"
};

export default function VrWorldPage() {
  return (
    <main className="shell">
      <WorldEditorApp />
    </main>
  );
}

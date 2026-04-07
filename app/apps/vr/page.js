import { VrProjectsDashboard } from "@/src/components/world-editor/vr-projects-dashboard";

export const metadata = {
  title: "みんなで作るVR空間 | Apps | New Commune",
  description: "GLB / GLTF を持ち寄って、ブラウザ上で3D空間を共同制作するプロジェクト一覧。"
};

export default function VrWorldPage() {
  return (
    <main className="shell">
      <VrProjectsDashboard />
    </main>
  );
}

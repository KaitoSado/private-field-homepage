import { PhysicsContentApp } from "@/components/physics-content-app";

export const metadata = {
  title: "物理コンテンツ | Apps | New Commune",
  description: "仕事とエネルギー、衝突、剛体、理想気体、相対論、1D量子を、見方の切替で理解する Physics Playground。"
};

export default function PhysicsPage() {
  return (
    <main className="shell">
      <PhysicsContentApp />
    </main>
  );
}

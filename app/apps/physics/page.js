import { PhysicsContentApp } from "@/components/physics-content-app";

export const metadata = {
  title: "物理コンテンツ | Apps | Commune",
  description: "放物運動、衝突、単振動、理想気体、波の反射・屈折、ローレンツ変換、1D量子井戸を、Sandbox / Guided Lab / Math Link / Theory Map でつなぐ Physics Playground。"
};

export default function PhysicsPage() {
  return (
    <main className="shell">
      <PhysicsContentApp />
    </main>
  );
}

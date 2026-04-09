import { PhysicsContentApp } from "@/components/physics-content-app";

export const metadata = {
  title: "物理コンテンツ | Apps | New Commune",
  description: "放物運動、振動、電場、幾何光学を触りながら理解する Physics Playground。"
};

export default function PhysicsPage() {
  return (
    <main className="shell">
      <PhysicsContentApp />
    </main>
  );
}

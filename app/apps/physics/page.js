import { PhysicsContentApp } from "@/components/physics-content-app";

export const metadata = {
  title: "物理コンテンツ | Apps | New Commune",
  description: "剛体、流体、電磁波、不可逆性、相転移、ローレンツ変換、量子化を、秩序の立ち上がりとして読む Physics Playground: Emergence Lab。"
};

export default function PhysicsPage() {
  return (
    <main className="shell">
      <PhysicsContentApp />
    </main>
  );
}

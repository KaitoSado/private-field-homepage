import { MathCommunityApp } from "@/components/math-community-app";

export const metadata = {
  title: "数学コミュニティ | Apps | FieldCard Social",
  description: "関数グラフ、幾何、空間図形、CAS、科学計算電卓をまとめた数学向けワークスペース。"
};

export default function MathAppsPage() {
  return (
    <main className="shell">
      <MathCommunityApp />
    </main>
  );
}

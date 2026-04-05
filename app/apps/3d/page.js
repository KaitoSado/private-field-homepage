import { ThreeDStudioApp } from "@/components/three-d-studio-app";

export const metadata = {
  title: "3Dモデル3Dグラフィック | Apps | FieldCard Social",
  description: "誰でも触れる 3D モデル / 3D グラフィックの玩具寄りスタジオ。"
};

export default function ThreeDPage() {
  return (
    <main className="shell">
      <ThreeDStudioApp />
    </main>
  );
}

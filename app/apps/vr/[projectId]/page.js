import { CollaborativeWorldEditorApp } from "@/src/components/world-editor/collaborative-world-editor-app";

export const metadata = {
  title: "共同編集 | みんなで作るVR空間 | FieldCard Social",
  description: "プロジェクト単位で3D空間を同期編集するブラウザエディタ。"
};

export default function VrProjectPage() {
  return (
    <main className="shell">
      <CollaborativeWorldEditorApp />
    </main>
  );
}

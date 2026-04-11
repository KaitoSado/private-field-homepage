import { ResearchProgressGroupsPanel } from "@/components/research-progress-groups-panel";

export const metadata = {
  title: "Research Progress | Apps | Commune",
  description: "研究室の案件ポートフォリオと週次チェックインをまとめて管理する招待制アプリ。"
};

export default function ResearchProgressGroupsPage() {
  return (
    <main className="shell">
      <ResearchProgressGroupsPanel />
    </main>
  );
}

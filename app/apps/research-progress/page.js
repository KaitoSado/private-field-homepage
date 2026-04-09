import { ResearchProgressGroupsPanel } from "@/components/research-progress-groups-panel";

export const metadata = {
  title: "Research Progress | Apps | New Commune",
  description: "招待制の研究会・ゼミ・小規模PJ向けの週次進捗チェックインアプリ。"
};

export default function ResearchProgressGroupsPage() {
  return (
    <main className="shell">
      <ResearchProgressGroupsPanel />
    </main>
  );
}

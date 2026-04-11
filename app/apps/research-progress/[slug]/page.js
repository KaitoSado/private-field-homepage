import { ResearchProgressPanel } from "@/components/research-progress-panel";

export const metadata = {
  title: "Research Progress | Apps | Commune",
  description: "研究ラインの現在地、直近締切、停滞案件を一覧で確認する招待制ダッシュボード。"
};

export default async function ResearchProgressGroupPage({ params }) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams?.slug || "").trim();

  return (
    <main className="shell">
      <ResearchProgressPanel slug={slug} />
    </main>
  );
}

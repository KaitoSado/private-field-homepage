import { ResearchProgressPanel } from "@/components/research-progress-panel";

export const metadata = {
  title: "Research Progress | Apps | New Commune",
  description: "研究会・ゼミ・PJの週次進捗を確認する招待制ダッシュボード。"
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

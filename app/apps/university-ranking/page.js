import "@/app/university-ranking.css";
import { UniversityRankingPanel } from "@/components/university-ranking-panel";

export const metadata = {
  title: "日本版・世界大学ランキング | Apps | Commune",
  description: "どの大学が一番いいか、1アカウント1回だけ投票するシンプルな大学ランキング。"
};

export const revalidate = 0;

export default function UniversityRankingPage() {
  return <UniversityRankingPanel />;
}

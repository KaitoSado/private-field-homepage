import "@/app/english-vocabulary.css";
import { EnglishChunksApp } from "@/components/english-chunks-app";

export const metadata = {
  title: "英語コンテンツ | Apps | Commune",
  description:
    "チャンクを核に、高制約文脈、シャドーイング、多文脈レビュー、理論マップで英語を定着させる English Chunks Lab。"
};

export default function EnglishPage() {
  return (
    <main className="shell">
      <EnglishChunksApp />
    </main>
  );
}

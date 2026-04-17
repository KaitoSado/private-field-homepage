import "@/app/english-vocabulary.css";
import { GermanVocabularyApp } from "@/components/german-vocabulary-app";

export const metadata = {
  title: "ドイツ語コンテンツ | Apps | Commune",
  description: "忘却曲線、フラッシュ式学習、弱点管理、性の色つけで最適化するパーソナライズドイツ単語アプリ。"
};

export default function GermanPage() {
  return (
    <main className="shell">
      <GermanVocabularyApp />
    </main>
  );
}

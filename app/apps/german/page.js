import { GermanVocabularyApp } from "@/components/german-vocabulary-app";

export const metadata = {
  title: "ドイツ語コンテンツ | Apps | Commune",
  description: "ドイツ語単語をフラッシュ式に回し、正誤・見直し・長期記憶を管理する単語暗記アプリ。"
};

export default function GermanPage() {
  return (
    <main className="shell">
      <GermanVocabularyApp />
    </main>
  );
}

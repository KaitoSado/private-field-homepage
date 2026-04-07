import { SpecialArticlesPanel } from "@/components/special-articles-panel";
import { getSpecialArticles } from "@/lib/data";

export const metadata = {
  title: "特別記事 | New Commune",
  description: "通常の記事とは別に、深くまとめた読みものや限定公開の入口。"
};

export const revalidate = 0;

export default async function SpecialArticlesPage() {
  const items = await getSpecialArticles();

  return (
    <main className="shell">
      <SpecialArticlesPanel initialItems={items} />
    </main>
  );
}

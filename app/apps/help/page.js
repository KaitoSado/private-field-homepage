import { HelpBoardPanel } from "@/components/help-board-panel";
import { getHelpBoardData } from "@/lib/data";

export const metadata = {
  title: "助け合いボード | Apps | FieldCard Social",
  description: "ノート共有、過去問交換、空きコマ同行、機材貸し借り、引っ越し手伝いなどを募集・提供できる助け合い掲示板。"
};

export const revalidate = 0;

export default async function HelpBoardPage() {
  const { items, categories, campuses } = await getHelpBoardData();

  return (
    <main className="shell">
      <HelpBoardPanel initialItems={items} initialCategories={categories} initialCampuses={campuses} />
    </main>
  );
}

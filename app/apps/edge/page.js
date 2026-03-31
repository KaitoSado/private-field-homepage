import { EdgeInfoBoard } from "@/components/edge-info-board";
import { getEdgeInfoData } from "@/lib/data";

export const metadata = {
  title: "エッジ情報 | Apps | FieldCard Social",
  description: "大学生向けの学割、無料枠、助成、地味に得する情報を持ち寄るボード。"
};

export const revalidate = 0;

export default async function EdgeInfoPage() {
  const { items, categories, campuses } = await getEdgeInfoData();

  return (
    <main className="shell">
      <EdgeInfoBoard initialItems={items} initialCategories={categories} initialCampuses={campuses} />
    </main>
  );
}

import { ClassBoardPanel } from "@/components/class-board-panel";
import { getClassBoardData } from "@/lib/data";

export const metadata = {
  title: "授業情報 | Apps | FieldCard Social",
  description: "授業情報を書き込んだり、観たりするための共有ボード。"
};

export const revalidate = 0;

export default async function ClassBoardPage() {
  const { items, campuses, terms } = await getClassBoardData();

  return (
    <main className="shell">
      <ClassBoardPanel initialItems={items} initialCampuses={campuses} initialTerms={terms} />
    </main>
  );
}

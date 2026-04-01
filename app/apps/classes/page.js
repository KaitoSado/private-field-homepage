import { ClassBoardPanel } from "@/components/class-board-panel";
import { getClassBoardData } from "@/lib/data";

export const metadata = {
  title: "教員を裁け！地獄の裏シラバス | Apps | FieldCard Social",
  description: "学部・大学院を問わず、授業ごとに反応を積み上げて教員を評価していく裏シラバス。"
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

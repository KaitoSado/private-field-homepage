import { RitualBoardPanel } from "@/components/ritual-board-panel";
import { getRitualBoardData } from "@/lib/data";

export const metadata = {
  title: "祈祷と呪詛 | New Commune",
  description: "慶應大学院生向けの、愚痴・祈り・雑談・募集をゆるく流せる共同待合室。"
};

export const revalidate = 0;

export default async function RitualBoardPage() {
  const { items, rooms } = await getRitualBoardData();

  return <RitualBoardPanel initialItems={items} initialRooms={rooms} />;
}

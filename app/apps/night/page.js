import { NightWalkBoard } from "@/components/night-walk-board";
import { getNightWalkData } from "@/lib/data";

export const metadata = {
  title: "深夜徘徊界隈 | Commune",
  description: "深夜の移動セッションをそのままコンテンツ化する、リアルタイム徘徊ログ。"
};

export default async function NightWalkPage() {
  const data = await getNightWalkData();

  return <NightWalkBoard initialSessions={data.sessions} />;
}

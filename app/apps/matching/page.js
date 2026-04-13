import { redirect } from "next/navigation";

export const metadata = {
  title: "マッチングアプリ | Apps | Commune",
  description: "ルームシェアMVPと同じマーケットプレイス基盤で展開するマッチングアプリ準備面。"
};

export default function MatchingAppPage() {
  redirect("/apps/roomshare");
}

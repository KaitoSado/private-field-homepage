import { redirect } from "next/navigation";

export const metadata = {
  title: "カーシェア | Apps | Commune",
  description: "ルームシェアMVPと同じマーケットプレイス基盤で展開するカーシェア準備面。"
};

export default function CarsharePage() {
  redirect("/apps/roomshare");
}

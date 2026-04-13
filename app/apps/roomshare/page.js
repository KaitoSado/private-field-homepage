import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "ルームシェア | Apps | Commune",
  description: "信頼が必要なマッチング型マーケットプレイス基盤で動くルームシェアMVP。"
};

export const revalidate = 0;

export default async function RoomsharePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="search" initialSearchParams={resolvedSearchParams || {}} />
    </main>
  );
}

import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "マイページ | ルームシェア | Commune"
};

export default function RoomshareMePage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="me" />
    </main>
  );
}

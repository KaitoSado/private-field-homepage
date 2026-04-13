import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "部屋を掲載 | ルームシェア | Commune"
};

export default function NewRoomListingPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="new" />
    </main>
  );
}

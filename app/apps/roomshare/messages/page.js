import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "チャット | ルームシェア | Commune"
};

export default function RoomshareMessagesPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="messages" />
    </main>
  );
}

import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "通知 | ルームシェア | Commune"
};

export default function RoomshareNotificationsPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="notifications" />
    </main>
  );
}

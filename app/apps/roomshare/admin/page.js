import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "管理 | ルームシェア | Commune"
};

export default function RoomshareAdminPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="admin" adminView="overview" />
    </main>
  );
}

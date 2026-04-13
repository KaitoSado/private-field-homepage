import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "掲載管理 | ルームシェア | Commune"
};

export default function RoomshareAdminListingsPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="admin" adminView="listings" />
    </main>
  );
}

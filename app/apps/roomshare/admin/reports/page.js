import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "通報管理 | ルームシェア | Commune"
};

export default function RoomshareAdminReportsPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="admin" adminView="reports" />
    </main>
  );
}

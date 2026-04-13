import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "問い合わせ管理 | ルームシェア | Commune"
};

export default function RoomshareAdminApplicationsPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="admin" adminView="applications" />
    </main>
  );
}

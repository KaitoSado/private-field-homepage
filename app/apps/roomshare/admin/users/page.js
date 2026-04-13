import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "ユーザー管理 | ルームシェア | Commune"
};

export default function RoomshareAdminUsersPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="admin" adminView="users" />
    </main>
  );
}

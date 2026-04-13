import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "プロフィール | ルームシェア | Commune"
};

export default function RoomshareProfilePage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="profile" />
    </main>
  );
}

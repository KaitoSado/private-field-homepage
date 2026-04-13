import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "お気に入り | ルームシェア | Commune"
};

export default function RoomshareFavoritesPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="favorites" />
    </main>
  );
}

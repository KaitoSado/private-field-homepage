import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "掲載編集 | ルームシェア | Commune"
};

export default async function EditRoomListingPage({ params }) {
  const resolvedParams = await params;
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="edit" listingId={resolvedParams.id} />
    </main>
  );
}

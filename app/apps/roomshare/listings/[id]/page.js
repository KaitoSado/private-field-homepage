import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return {
    title: `掲載詳細 | ${resolvedParams.id} | ルームシェア | Commune`
  };
}

export default async function RoomListingDetailPage({ params }) {
  const resolvedParams = await params;
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="detail" listingId={resolvedParams.id} />
    </main>
  );
}

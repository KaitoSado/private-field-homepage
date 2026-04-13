import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "チャット詳細 | ルームシェア | Commune"
};

export default async function RoomshareThreadPage({ params }) {
  const resolvedParams = await params;
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="thread" threadId={resolvedParams.threadId} />
    </main>
  );
}

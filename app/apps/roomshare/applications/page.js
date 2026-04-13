import { RoomshareMarketplaceApp } from "@/components/roomshare-marketplace-app";

export const metadata = {
  title: "問い合わせ | ルームシェア | Commune"
};

export default function RoomshareApplicationsPage() {
  return (
    <main className="shell">
      <RoomshareMarketplaceApp view="applications" />
    </main>
  );
}

import { NotificationsPanel } from "@/components/notifications-panel";

export const metadata = {
  title: "通知 | Commune"
};

export default function NotificationsPage() {
  return (
    <main className="shell narrow-shell">
      <NotificationsPanel />
    </main>
  );
}

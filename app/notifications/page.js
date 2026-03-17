import { NotificationsPanel } from "@/components/notifications-panel";

export const metadata = {
  title: "通知 | FieldCard Social"
};

export default function NotificationsPage() {
  return (
    <main className="shell narrow-shell">
      <NotificationsPanel />
    </main>
  );
}

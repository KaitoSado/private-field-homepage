import { AdminPanel } from "@/components/admin-panel";

export const metadata = {
  title: "管理画面 | New Commune"
};

export default function AdminPage() {
  return (
    <main className="shell">
      <AdminPanel />
    </main>
  );
}

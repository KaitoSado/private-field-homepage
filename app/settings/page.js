import { AccountSettingsPanel } from "@/components/account-settings-panel";

export const metadata = {
  title: "アカウント設定 | Commune"
};

export default function SettingsPage() {
  return (
    <main className="shell">
      <AccountSettingsPanel />
    </main>
  );
}

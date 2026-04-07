import { AccountSettingsPanel } from "@/components/account-settings-panel";

export const metadata = {
  title: "アカウント設定 | New Commune"
};

export default function SettingsPage() {
  return (
    <main className="shell">
      <AccountSettingsPanel />
    </main>
  );
}

import { AccountSettingsPanel } from "@/components/account-settings-panel";

export const metadata = {
  title: "アカウント設定 | FieldCard Social"
};

export default function SettingsPage() {
  return (
    <main className="shell">
      <AccountSettingsPanel />
    </main>
  );
}

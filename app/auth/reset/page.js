import { ResetPasswordPanel } from "@/components/reset-password-panel";

export const metadata = {
  title: "パスワード再設定 | Commune"
};

export default function ResetPasswordPage() {
  return (
    <main className="shell narrow-shell">
      <ResetPasswordPanel />
    </main>
  );
}

import { AuthPanel } from "@/components/auth-panel";

export const metadata = {
  title: "ログイン | Commune"
};

export default function AuthPage() {
  return (
    <main className="shell narrow-shell">
      <section className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow">Auth</p>
          <h1>ログインすると、自分のページをすぐ編集できます。</h1>
          <p>
            メールアドレスとパスワードで登録できます。ログイン後はプロフィールや記事を管理画面から更新します。
          </p>
          <p className="auth-note">
            確認メールありの設定でも、認証後はこのサービスに自動で戻るようにしてあります。
          </p>
        </div>
        <AuthPanel />
      </section>
    </main>
  );
}

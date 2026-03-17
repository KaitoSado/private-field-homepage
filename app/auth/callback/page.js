import { Suspense } from "react";
import { AuthCallbackPanel } from "@/components/auth-callback-panel";

export const metadata = {
  title: "認証確認 | FieldCard Social"
};

export default function AuthCallbackPage() {
  return (
    <main className="shell narrow-shell">
      <Suspense
        fallback={
          <section className="surface empty-state">
            <h1>認証中</h1>
            <p>確認リンクを処理しています...</p>
          </section>
        }
      >
        <AuthCallbackPanel />
      </Suspense>
    </main>
  );
}

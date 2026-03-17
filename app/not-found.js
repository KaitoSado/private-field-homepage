import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell narrow-shell">
      <section className="surface empty-state">
        <p className="eyebrow">404</p>
        <h1>ページが見つかりません</h1>
        <p>URL が間違っているか、公開されていない可能性があります。</p>
        <div className="hero-actions">
          <Link href="/" className="button button-primary">
            ホームへ戻る
          </Link>
          <Link href="/explore" className="button button-secondary">
            Explore を見る
          </Link>
          <Link href="/contact" className="button button-ghost">
            問い合わせ
          </Link>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

export const metadata = {
  title: "特別記事 | FieldCard Social",
  description: "通常の記事とは別に、深くまとめた読みものや限定公開の入口。"
};

export default function SpecialArticlesPage() {
  return (
    <main className="shell narrow-shell">
      <section className="section-grid section-head">
        <div className="surface feature-card special-articles-hero">
          <p className="eyebrow">Special access</p>
          <h1 className="page-title">特別記事</h1>
          <p>
            ここは、通常の公開記事とは別に、少し深く読ませる長文や特別な読みものを置くための面です。
            まだ入口だけですが、今後この場所に限定公開や有料記事の導線を増やしていけます。
          </p>
          <div className="hero-actions">
            <Link href="/@kaito-sado" className="button button-secondary">
              公開ページへ戻る
            </Link>
            <Link href="/apps" className="button button-ghost">
              Apps
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";

export default function GlobalError() {
  return (
    <html lang="ja">
      <body>
        <main className="shell narrow-shell">
          <section className="surface empty-state">
            <p className="eyebrow">Fatal</p>
            <h1>致命的なエラーが発生しました</h1>
            <p>ページを再読み込みするか、サポート導線から連絡してください。</p>
            <div className="hero-actions">
              <Link href="/" className="button button-primary">
                ホームへ戻る
              </Link>
              <Link href="/contact" className="button button-secondary">
                問い合わせ
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

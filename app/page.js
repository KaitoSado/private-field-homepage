import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero home-hero">
        <div className="hero-copy">
          <h1>自分のページを、今すぐ公開。記録も、情報も、協力プレーも、ここからつながる。</h1>
          <HomeAuthEntry />
          <div className="hero-actions">
            <Link href="/explore" className="button button-secondary">
              発見を見る
            </Link>
          </div>
        </div>

        <aside className="surface home-preview-panel" aria-label="公開ページプレビュー">
          <div className="home-preview-browser">
            <span />
            <span />
            <span />
            <p>
              archteia.com/<strong>@yuuki</strong>
            </p>
          </div>

          <div className="home-preview-sheet">
            <div className="home-preview-profile">
              <div className="home-preview-avatar">Y</div>
              <div className="home-preview-copy">
                <h2>ゆうき</h2>
                <p>@yuuki</p>
                <div className="home-preview-badges">
                  <span>慶應認証</span>
                  <span>SFC</span>
                </div>
              </div>
            </div>

            <p className="home-preview-bio">環境情報 / HCI / 個人開発</p>

            <div className="home-preview-tabs">
              <span className="is-active">プロフィール</span>
              <span>記事</span>
              <span>記録</span>
              <span>予定</span>
            </div>

            <div className="home-preview-blocks">
              <div className="home-preview-block">
                <strong>Links</strong>
                <div className="home-preview-links">
                  <span>GitHub</span>
                  <span>X</span>
                  <span>note</span>
                </div>
              </div>
              <div className="home-preview-block">
                <strong>最新記事</strong>
                <p>SFC の研究室選びで見たもの</p>
              </div>
            </div>

            <div className="home-preview-edit-hint">
              <span>直接編集</span>
              <p>公開ページのまま育てる</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

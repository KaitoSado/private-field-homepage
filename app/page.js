import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

const featureCards = [
  {
    number: "01",
    title: "公開ページ",
    body: "プロフィール、記事、記録、予定、リンクをひとつの公開ページで持てます。",
    items: ["@username", "直接編集", "記事と記録", "リンク集"]
  },
  {
    number: "02",
    title: "発見とつながり",
    body: "発見から人や記事に出会って、フォロー、通知、匿名質問箱でゆるくつながれます。",
    items: ["発見フィード", "フォロー", "通知", "匿名質問箱"]
  },
  {
    number: "03",
    title: "学内アプリ",
    body: "授業レビュー、助け合い、情報共有、院生向け雑談まで、学生生活の実用面が揃います。",
    items: ["裏シラバス", "助け合い", "エッジ情報", "祈祷と呪詛"]
  }
];

const appCards = [
  {
    title: "教員を裁け！地獄の裏シラバス",
    body: "授業レビュー、各種評価、判決メモ。履修選びの本音が集まります。",
    href: "/apps/classes",
    emoji: "⚖️",
    accent: "is-red",
    tags: ["授業レビュー", "評価", "判決"]
  },
  {
    title: "助け合いボード",
    body: "ノート共有、過去問交換、空きコマ同行、貸し借り、手伝い募集。",
    href: "/apps/help",
    emoji: "🤝",
    accent: "is-green",
    tags: ["ノート", "同行", "貸し借り"]
  },
  {
    title: "エッジ情報",
    body: "大学生向けのお得情報、生活情報、制度の抜け道を共有します。",
    href: "/apps/edge",
    emoji: "💡",
    accent: "is-blue",
    tags: ["お得情報", "生活", "制度"]
  },
  {
    title: "祈祷と呪詛",
    body: "院生向けの軽い吐き出し、雑談、募集。しんどさを溜め込まないための場です。",
    href: "/apps/ritual",
    emoji: "🕯️",
    accent: "is-ink",
    tags: ["院生", "雑談", "募集"]
  }
];

export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="shell home-shell">
      <section className="hero home-hero">
        <div className="hero-copy">
          <div className="home-kicker-row">
            <span className="home-status-badge">Open Beta</span>
          </div>
          <h1>自分のページを、今すぐ公開。記録も、情報も、協力プレーも、ここからつながる。</h1>
          <p className="hero-lead home-hero-lead">
            プロフィール、記事、記録、Apps がひとつにつながる、慶應 / SFC 寄りの学生ネットワークです。
          </p>
          <HomeAuthEntry />
          <div className="hero-actions">
            <Link href="#features" className="button button-secondary">
              くわしく見る
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

      <section id="features" className="home-section">
        <div className="section-copy home-section-copy">
          <h2>ページも、発見も、助け合いも。</h2>
        </div>
        <div className="home-feature-grid">
          {featureCards.map((feature) => (
            <article key={feature.number} className="surface home-feature-card">
              <span className="home-card-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <div className="home-feature-tags">
                {feature.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="apps" className="home-section">
        <div className="section-copy home-section-copy">
          <h2>「あったらいいのに」を、すぐ使える面に。</h2>
        </div>
        <div className="home-app-grid">
          {appCards.map((app) => (
            <Link key={app.title} href={app.href} className={`surface home-app-card ${app.accent}`}>
              <div className="home-app-emoji" aria-hidden="true">
                {app.emoji}
              </div>
              <h3>{app.title}</h3>
              <p>{app.body}</p>
              <div className="home-app-tags">
                {app.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface home-trust-strip">
        <div>
          <strong>慶應アカウント認証</strong>
          <p>@keio.jp / @keio.ac.jp の確認メール認証で、慶應認証バッジが付きます。</p>
        </div>
        <div>
          <strong>公開ページ中心</strong>
          <p>ダッシュボード前提ではなく、自分の公開ページをそのまま編集して育てます。</p>
        </div>
      </section>

      <section id="join" className="surface home-join-panel">
        <div className="section-copy home-section-copy">
          <h2>いま始める</h2>
          <p>まずは自分の公開ページを作って、そこから Apps とつながっていきます。</p>
        </div>
        <HomeAuthEntry />
      </section>
    </main>
  );
}

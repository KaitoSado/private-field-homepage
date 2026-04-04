import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

const featureCards = [
  {
    icon: "@" ,
    title: "公開ページ",
    body: "プロフィール、記事、記録、予定、リンクをひとつにまとめます。",
    items: ["@username", "直接編集", "記事と記録", "リンク集"]
  },
  {
    icon: "◎",
    title: "発見とつながり",
    body: "発見から人や記事を見つけて、フォローや通知でつながります。",
    items: ["発見フィード", "フォロー", "通知", "匿名質問箱"]
  },
  {
    icon: "▦",
    title: "学内アプリ",
    body: "授業レビュー、助け合い、情報共有、院生向け雑談まで揃います。",
    items: ["裏シラバス", "助け合い", "エッジ情報", "祈祷と呪詛"]
  }
];

const appCards = [
  {
    title: "教員を裁け！地獄の裏シラバス",
    body: "授業レビュー、各種評価、判決メモ。",
    href: "/apps/classes",
    emoji: "⚖️",
    accent: "is-red",
    tags: ["授業", "評価", "判決"],
    featured: true
  },
  {
    title: "助け合いボード",
    body: "ノート共有、過去問交換、同行、貸し借り。",
    href: "/apps/help",
    emoji: "🤝",
    accent: "is-green",
    tags: ["ノート", "同行", "貸し借り"]
  },
  {
    title: "エッジ情報",
    body: "お得情報、生活情報、制度メモ。",
    href: "/apps/edge",
    emoji: "💡",
    accent: "is-blue",
    tags: ["お得情報", "生活", "制度"]
  },
  {
    title: "祈祷と呪詛",
    body: "院生向けの軽い吐き出し、雑談、募集。",
    href: "/apps/ritual",
    emoji: "🕯️",
    accent: "is-ink",
    tags: ["院生", "雑談", "募集"]
  },
  {
    title: "Games",
    body: "テトリス、ブロック崩し、ミニゲーム。",
    href: "/apps/games",
    emoji: "🎮",
    accent: "is-gold",
    tags: ["テトリス", "ブロック崩し", "暇つぶし"]
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
          <div className="hero-actions">
            <HomeAuthEntry />
            <Link href="/explore" className="button button-secondary">
              発見を見る
            </Link>
          </div>
          <div className="home-inline-points">
            <span>公開ページ</span>
            <span>学内Apps</span>
            <span>慶應認証</span>
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
        <div className="home-section-copy">
          <h2>使い方はシンプルです。</h2>
        </div>
        <div className="home-feature-grid">
          {featureCards.map((feature) => (
            <article key={feature.title} className="surface home-feature-card">
              <span className="home-feature-glyph" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p className="home-feature-note">{feature.body}</p>
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
        <div className="home-section-copy">
          <h2>Apps</h2>
        </div>
        <div className="home-app-grid">
          {appCards.map((app) => (
            <Link
              key={app.title}
              href={app.href}
              className={`surface home-app-card ${app.accent} ${app.featured ? "is-featured" : ""}`}
            >
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

      <section className="home-mini-grid">
        <article className="surface home-mini-card">
          <strong>慶應認証</strong>
          <p>@keio.jp / @keio.ac.jp の確認メール認証に対応。</p>
        </article>
        <article className="surface home-mini-card">
          <strong>公開ページ起点</strong>
          <p>自分のページをそのまま編集して育てます。</p>
        </article>
        <article className="surface home-mini-card">
          <strong>Apps</strong>
          <p>授業、助け合い、情報、ゲームをまとめています。</p>
        </article>
      </section>
    </main>
  );
}

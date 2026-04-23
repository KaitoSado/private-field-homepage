import Link from "next/link";

export const metadata = {
  title: "アプリ一覧 | Commune",
  description: "アプリ一覧"
};

const plannedApps = [
  { name: "深夜徘徊界隈", href: "/apps/night", tag: "social" },
  { name: "Games", href: "/apps/games", tag: "play" },
  { name: "数学コンテンツ", href: "/apps/math", tag: "study" },
  { name: "GenerativeArtWithMath", href: "/apps/generative-art-with-math", tag: "create" },
  { name: "物理コンテンツ", href: "/apps/physics", tag: "study" },
  { name: "英語コンテンツ", href: "/apps/english", tag: "study" },
  { name: "ドイツ語コンテンツ", href: "/apps/german", tag: "study" },
  { name: "日本版・世界大学ランキング", href: "/apps/university-ranking", tag: "social" },
  { name: "株式投資アプリ", tag: "info", status: "coming soon" },
  { name: "研究室市場（Labfolio）", tag: "social", status: "coming soon" },
  { name: "Research Progress", tag: "study", status: "coming soon" },
  { name: "3Dモデル3Dグラフィック", href: "/apps/3d", tag: "create" },
  { name: "みんなで作るVR空間", href: "/apps/vr", tag: "create" },
  { name: "教員裁判！地獄の裏シラバス", href: "/apps/classes", tag: "social" },
  { name: "ルームシェア", href: "/apps/roomshare", tag: "social" },
  { name: "カーシェア", href: "/apps/carshare", tag: "social" },
  { name: "マッチングアプリ", href: "/apps/matching", tag: "social" },
  { name: "エッジ情報", href: "/apps/edge", tag: "info" },
  { name: "助け合いボード", href: "/apps/help", tag: "social" },
  { name: "祈祷と呪詛", href: "/apps/ritual", tag: "social" }
];

const privateApps = [
  { name: "管理画面", href: "/admin", status: "管理者専用" },
  { name: "運用状況", href: "/ops", status: "運営用" },
  { name: "共同ワールド管理室", href: "/apps/vr", status: "招待制" }
];

function AppsCard({ app, privateCard = false }) {
  const isComingSoon = app.status === "coming soon";
  const cardClassName = [
    "apps-card",
    privateCard ? "is-private" : `is-${app.tag}`,
    isComingSoon ? "is-coming-soon" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {app.tag ? <span className="apps-tag">{app.tag}</span> : null}
      {app.status ? <span className="apps-status">{app.status}</span> : null}
      <h2>{app.name}</h2>
      {isComingSoon ? (
        <div className="apps-coming-soon-meta">
          <p>公開前 / 準備中</p>
          <span className="apps-coming-soon-track" aria-hidden="true">
            <span />
          </span>
          <small>準備が整い次第、ここが入口になります。</small>
        </div>
      ) : null}
    </>
  );

  if (!app.href || isComingSoon) {
    return (
      <article className={cardClassName} aria-disabled="true">
        {content}
      </article>
    );
  }

  return (
    <Link href={app.href} className={cardClassName}>
      {content}
    </Link>
  );
}

export default function AppsPage() {
  return (
    <main className="shell">
      <section className="apps-hero">
        <h1>アプリ一覧</h1>
      </section>

      <section className="apps-grid">
        {plannedApps.map((app) => (
          <AppsCard key={app.name} app={app} />
        ))}
      </section>

      <section className="apps-section">
        <div className="apps-section-head">
          <h2>非公開</h2>
        </div>
        <div className="apps-grid">
          {privateApps.map((app) => (
            <AppsCard key={app.name} app={app} privateCard />
          ))}
        </div>
      </section>
    </main>
  );
}

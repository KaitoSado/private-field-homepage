import Link from "next/link";

export const metadata = {
  title: "アプリ一覧 | Commune",
  description: "アプリ一覧"
};

const plannedApps = [
  { name: "深夜徘徊界隈", href: "/apps/night", tag: "social" },
  { name: "Games", href: "/apps/games", tag: "play" },
  { name: "数学コンテンツ", href: "/apps/math", tag: "study" },
  { name: "物理コンテンツ", href: "/apps/physics", tag: "study" },
  { name: "英語コンテンツ", href: "/apps/english", tag: "study" },
  { name: "3Dモデル3Dグラフィック", href: "/apps/3d", tag: "create" },
  { name: "みんなで作るVR空間", href: "/apps/vr", tag: "create" },
  { name: "教員を裁け！地獄の裏シラバス", href: "/apps/classes", tag: "social" },
  { name: "エッジ情報", href: "/apps/edge", tag: "info" },
  { name: "助け合いボード", href: "/apps/help", tag: "social" },
  { name: "祈祷と呪詛", href: "/apps/ritual", tag: "social" }
];

const privateApps = [
  { name: "Research Progress", href: "/apps/research-progress", status: "招待制" },
  { name: "管理画面", href: "/admin", status: "管理者専用" },
  { name: "運用状況", href: "/ops", status: "運営用" },
  { name: "共同ワールド管理室", href: "/apps/vr", status: "招待制" }
];

export default function AppsPage() {
  return (
    <main className="shell">
      <section className="apps-hero">
        <h1>アプリ一覧</h1>
      </section>

      <section className="apps-grid">
        {plannedApps.map((app) => (
          <Link key={app.name} href={app.href} className={`apps-card is-${app.tag}`}>
            <span className="apps-tag">{app.tag}</span>
            <h2>{app.name}</h2>
          </Link>
        ))}
      </section>

      <section className="apps-section">
        <div className="apps-section-head">
          <h2>非公開</h2>
        </div>
        <div className="apps-grid">
          {privateApps.map((app) => (
            <Link key={app.name} href={app.href} className="apps-card is-private">
              <span className="apps-status">{app.status}</span>
              <h2>{app.name}</h2>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

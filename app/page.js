import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

const steps = [
  {
    label: "1. Public page",
    title: "/@username を持つ"
  },
  {
    label: "2. Edit in place",
    title: "公開ページのまま育てる"
  },
  {
    label: "3. Discover",
    title: "発見で出会う"
  }
];

const surfaces = [
  "プロフィールと肩書き",
  "記事と画像",
  "習慣やメモ",
  "週間の予定",
  "匿名質問箱"
];

export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FieldCard Social</p>
          <h1>自分の公開ページを、そのまま育てる。</h1>
          <HomeAuthEntry />
          <div className="hero-actions">
            <Link href="/explore" className="button button-secondary">
              発見を見る
            </Link>
          </div>
        </div>

        <div className="hero-panel surface">
          <p className="panel-label">What lives here</p>
          <ul className="check-list">
            {surfaces.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="stats-grid">
            <div className="stat-tile">
              <strong>Public first</strong>
              <span>公開ページ起点</span>
            </div>
            <div className="stat-tile">
              <strong>Direct edit</strong>
              <span>その場で編集</span>
            </div>
            <div className="stat-tile">
              <strong>Discover</strong>
              <span>発見は別面へ</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        {steps.map((step) => (
          <article key={step.label} className="surface feature-card">
            <p className="eyebrow">{step.label}</p>
            <h2>{step.title}</h2>
          </article>
        ))}
      </section>
    </main>
  );
}

import Link from "next/link";
import { HomeAuthEntry } from "@/components/home-auth-entry";

const steps = [
  {
    label: "1. Public page",
    title: "/@username を持つ",
    body: "プロフィール、記事、記録、週間の流れをひとつの公開ページにまとめます。"
  },
  {
    label: "2. Edit in place",
    title: "公開ページのまま育てる",
    body: "管理画面に閉じず、見えているページをそのまま編集して更新します。"
  },
  {
    label: "3. Discover",
    title: "Explore で出会う",
    body: "他の人のページ、公開記事、タグからコミュニティ全体を辿れます。"
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
          <p className="hero-lead">
            FieldCard Social は、プロフィール、記事、記録をひとつの公開ページにまとめるサービスです。
            発見は <Link href="/explore">発見</Link> に集約し、ログイン後は <Link href="/me">ハブ</Link>
            や <Link href="/explore">発見</Link> から自分の公開ページへ入る構成にしています。
          </p>
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
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="section-grid single-column">
        <div className="surface feature-card">
          <p className="eyebrow">Navigation</p>
          <h2>トップはロゴから。主導線は 発見・アプリ・通知・マイページ。</h2>
          <p>
            トップはロゴから戻れるようにして、主ナビは日常的に使う面だけに絞っています。
            一覧や検索は発見へ、実用面はアプリへ、自分のことはマイページへ寄せています。
          </p>
          <div className="hero-actions">
            <Link href="/me" className="button button-secondary">
              ハブへ
            </Link>
            <Link href="/explore" className="button button-ghost">
              発見を開く
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

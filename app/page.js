import Link from "next/link";

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
            発見は <Link href="/explore">Explore</Link> に集約し、ログイン後は <Link href="/me">My Page</Link>
            から自分の公開ページへ入る構成にしています。
          </p>
          <div className="hero-actions">
            <Link href="/auth" className="button button-primary">
              無料ではじめる
            </Link>
            <Link href="/explore" className="button button-secondary">
              Explore を見る
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
              <strong>Explore</strong>
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
          <h2>Home は説明、Explore は発見、My Page は自分用の入口。</h2>
          <p>
            Home ではサービスの考え方だけを案内し、一覧や検索は Explore に寄せています。
            ログイン後は My Page から、自分の公開ページ、通知、設定へ移動できます。
          </p>
          <div className="hero-actions">
            <Link href="/me" className="button button-secondary">
              My Page へ
            </Link>
            <Link href="/explore" className="button button-ghost">
              Explore を開く
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Apps | FieldCard Social",
  description: "FieldCard Social から使えるアプリや追加サービスの入口。"
};

const plannedApps = [
  {
    name: "Games",
    status: "Live",
    body: "すぐ遊べるミニゲームをまとめた小さいゲームハブです。気分転換や動作確認にも使えます。",
    href: "/apps/games"
  },
  {
    name: "教員を裁け！地獄の裏シラバス",
    status: "Live",
    body: "今学期は散々でしたね。今度はあなたが教員を評価する番です。授業ごとの反応を積み上げて、厳しく裁いていきましょう。",
    href: "/apps/classes"
  },
  {
    name: "エッジ情報",
    status: "Live",
    body: "大学生向けの割引、無料枠、助成、学割、抜け道っぽい便利情報を集める掲示板です。知っていると地味に得する情報を持ち寄れます。",
    href: "/apps/edge"
  },
  {
    name: "助け合いボード",
    status: "Live",
    body: "ノート共有、過去問交換、空きコマ同行、機材貸し借り、引っ越し手伝いなどを募集・提供できる助け合い掲示板です。",
    href: "/apps/help"
  },
  {
    name: "祈祷と呪詛",
    status: "Live",
    body: "慶應大学院生向けの、愚痴・祈り・雑談・募集をゆるく流せる共同待合室です。",
    href: "/apps/ritual"
  }
];

export default function AppsPage() {
  return (
    <main className="shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <p className="eyebrow">Apps</p>
          <h1 className="page-title">FieldCard にぶら下がるアプリの入口</h1>
          <p>
            ここには、公開ページとつながりながら独立して使える小さいサービスをまとめています。
            大学生活の実用アプリを中心に、必要な面をここから増やしていきます。
          </p>
        </div>
        <div className="surface feature-card">
          <p className="eyebrow">Next</p>
          <h2>プロフィールの外側に、使える面を増やす。</h2>
          <p>裏シラバス、エッジ情報、助け合い、ゲームのように、公開ページとは別の実用面をここに積み上げていきます。</p>
        </div>
      </section>

      <section className="card-grid">
        {plannedApps.map((app) => (
          <article key={app.name} className="surface feature-card">
            <div className="post-card-head">
              <span>{app.name}</span>
              <span>{app.status}</span>
            </div>
            <h2>{app.name}</h2>
            <p>{app.body}</p>
            {app.href ? (
              <div className="hero-actions">
                <Link href={app.href} className="button button-secondary">
                  開く
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="section-grid single-column">
        <div className="surface feature-card">
          <p className="eyebrow">Jump back</p>
          <h2>公開ページや Explore に戻る</h2>
          <div className="hero-actions">
            <Link href="/explore" className="button button-secondary">
              Explore
            </Link>
            <Link href="/me" className="button button-ghost">
              ハブ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

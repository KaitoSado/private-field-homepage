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
    name: "Question Box",
    status: "Live",
    body: "公開ページに匿名質問箱を置いて、受信と回答を管理します。"
  },
  {
    name: "Profile Tools",
    status: "Planned",
    body: "公開ページの編集を補助する、小さいツール群をここへ足していきます。"
  },
  {
    name: "Experiments",
    status: "Planned",
    body: "試作中の小さいサービスや、ページと連動する実験をここから公開します。"
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
            ここには、公開ページとつながる小さいサービスや補助ツールを増やしていく予定です。
            まだ少ないですが、今後この面を起点に広げられるようにしてあります。
          </p>
        </div>
        <div className="surface feature-card">
          <p className="eyebrow">Next</p>
          <h2>プロフィールの外側に、使える面を増やす。</h2>
          <p>今は質問箱が中心ですが、今後はメモ、実験、連携サービスの入口として育てていけます。</p>
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

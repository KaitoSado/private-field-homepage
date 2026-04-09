import Link from "next/link";

export const metadata = {
  title: "アプリ一覧 | New Commune",
  description: "アプリ一覧"
};

const plannedApps = [
  {
    name: "深夜徘徊界隈",
    body: "深夜の移動セッションをそのままログにし、いま歩いている気配をゆるく共有するリアルタイム徘徊面です。",
    href: "/apps/night",
    color: "lavender"
  },
  {
    name: "Games",
    body: "賽の河原を含む、すぐ遊べるミニゲームをまとめた小さいゲームハブです。気分転換にも、妙な緊張感を味わうにも使えます。",
    href: "/apps/games",
    color: "lemon"
  },
  {
    name: "数学コンテンツ",
    body: "関数グラフ、幾何、空間図形、数式処理、科学計算をまとめたオールインワン数学ワークスペースです。",
    href: "/apps/math",
    color: "sky"
  },
  {
    name: "物理コンテンツ",
    body: "放物運動、衝突、単振動、理想気体、波の反射・屈折、ローレンツ変換、1D量子井戸を、触る・見る・式とつなぐ・理論で見る Physics Playground です。",
    href: "/apps/physics",
    color: "lemon"
  },
  {
    name: "3Dモデル3Dグラフィック",
    body: "立方体や球体を置いて、触って、色と光を変えて遊べる、玩具寄りの 3D スタジオです。",
    href: "/apps/3d",
    color: "mint"
  },
  {
    name: "みんなで作るVR空間",
    body: "外から持ち込んだ GLB / GLTF を並べて、空間を組み上げていくブラウザ3Dシーンエディタです。",
    href: "/apps/vr",
    color: "rose"
  },
  {
    name: "教員を裁け！地獄の裏シラバス",
    body: "今学期は散々でしたね。今度はあなたが教員を評価する番です。授業ごとの反応を積み上げて、厳しく裁いていきましょう。",
    href: "/apps/classes",
    color: "rose"
  },
  {
    name: "エッジ情報",
    body: "大学生向けの割引、無料枠、助成、学割、抜け道っぽい便利情報を集める掲示板です。",
    href: "/apps/edge",
    color: "lemon"
  },
  {
    name: "助け合いボード",
    body: "ノート共有、過去問交換、空きコマ同行、機材貸し借り、引っ越し手伝いなどを募集・提供できる助け合い掲示板です。",
    href: "/apps/help",
    color: "mint"
  },
  {
    name: "祈祷と呪詛",
    body: "慶應大学院生向けの、愚痴・祈り・雑談・募集をゆるく流せる共同待合室です。",
    href: "/apps/ritual",
    color: "lavender"
  }
];

const privateApps = [
  {
    name: "リサーチプログレス",
    body: "研究計画、研究費申請、ポスター、論文投稿までの研究ラインを一覧化し、研究室全体の現在地と停滞を把握する招待制ダッシュボードです。",
    status: "招待制",
    color: "mint",
    href: "/apps/research-progress"
  },
  {
    name: "管理画面",
    body: "通報確認、投稿対応、権限まわりの処理を行う管理者専用の内部画面です。",
    status: "管理者専用",
    color: "rose",
    href: "/admin"
  },
  {
    name: "運用状況",
    body: "環境変数、telemetry、エラー件数など、最低限の運用状態を確認するための内部ツールです。",
    status: "運営用",
    color: "sky",
    href: "/ops"
  },
  {
    name: "共同ワールド管理室",
    body: "招待制の VR プロジェクトを立ち上げて、少人数で空間制作や内部テストを進めるための入口です。",
    status: "招待制",
    color: "lavender",
    href: "/apps/vr"
  }
];

export default function AppsPage() {
  return (
    <main className="shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">アプリ一覧</h1>
        </div>
      </section>

      <section className="apps-color-grid">
        {plannedApps.map((app) => (
          <Link key={app.name} href={app.href} className={`apps-color-card candy-${app.color}`}>
            <h2>{app.name}</h2>
            <p>{app.body}</p>
          </Link>
        ))}
      </section>

      <section className="apps-subsection">
        <div className="apps-subsection-copy">
          <p className="eyebrow">Internal / Invite Only</p>
          <h2>非公開アプリ一覧</h2>
          <p>一般公開していない、招待制または運営用のアプリです。</p>
        </div>

        <div className="apps-color-grid">
          {privateApps.map((app) => (
            app.href ? (
              <Link key={app.name} href={app.href} className={`apps-color-card apps-private-card apps-private-link candy-${app.color}`}>
                <div className="apps-private-meta">
                  <span className="apps-private-status">{app.status}</span>
                </div>
                <h2>{app.name}</h2>
                <p>{app.body}</p>
              </Link>
            ) : (
              <article key={app.name} className={`apps-color-card apps-private-card candy-${app.color}`}>
                <div className="apps-private-meta">
                  <span className="apps-private-status">{app.status}</span>
                </div>
                <h2>{app.name}</h2>
                <p>{app.body}</p>
              </article>
            )
          ))}
        </div>
      </section>
    </main>
  );
}

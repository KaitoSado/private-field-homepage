import Link from "next/link";

export const metadata = {
  title: "アプリ一覧 | New Commune",
  description: "アプリ一覧"
};

const plannedApps = [
  {
    name: "深夜徘徊界隈",
    body: "深夜の移動セッションをそのままログにし、いま歩いている気配をゆるく共有するリアルタイム徘徊面です。",
    href: "/apps/night"
  },
  {
    name: "Games",
    body: "すぐ遊べるミニゲームをまとめた小さいゲームハブです。気分転換や動作確認にも使えます。",
    href: "/apps/games"
  },
  {
    name: "数学コミュニティ",
    body: "関数グラフ、幾何、空間図形、数式処理、科学計算をまとめたオールインワン数学ワークスペースです。",
    href: "/apps/math"
  },
  {
    name: "3Dモデル3Dグラフィック",
    body: "立方体や球体を置いて、触って、色と光を変えて遊べる、玩具寄りの 3D スタジオです。",
    href: "/apps/3d"
  },
  {
    name: "みんなで作るVR空間",
    body: "外から持ち込んだ GLB / GLTF を並べて、空間を組み上げていくブラウザ3Dシーンエディタです。",
    href: "/apps/vr"
  },
  {
    name: "教員を裁け！地獄の裏シラバス",
    body: "今学期は散々でしたね。今度はあなたが教員を評価する番です。授業ごとの反応を積み上げて、厳しく裁いていきましょう。",
    href: "/apps/classes"
  },
  {
    name: "エッジ情報",
    body: "大学生向けの割引、無料枠、助成、学割、抜け道っぽい便利情報を集める掲示板です。知っていると地味に得する情報を持ち寄れます。",
    href: "/apps/edge"
  },
  {
    name: "助け合いボード",
    body: "ノート共有、過去問交換、空きコマ同行、機材貸し借り、引っ越し手伝いなどを募集・提供できる助け合い掲示板です。",
    href: "/apps/help"
  },
  {
    name: "祈祷と呪詛",
    body: "慶應大学院生向けの、愚痴・祈り・雑談・募集をゆるく流せる共同待合室です。",
    href: "/apps/ritual"
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

      <section className="card-grid">
        {plannedApps.map((app) => (
          <article key={app.name} className="surface feature-card">
            <h2>{app.name}</h2>
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
    </main>
  );
}

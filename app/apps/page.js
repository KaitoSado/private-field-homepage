import Link from "next/link";

export const metadata = {
  title: "アプリ一覧 | New Commune",
  description: "アプリ一覧"
};

const COLORS = ["lavender", "sky", "mint", "lemon", "rose"];

const plannedApps = [
  {
    name: "深夜徘徊界隈",
    body: "深夜の移動セッションをそのままログにし、いま歩いている気配をゆるく共有するリアルタイム徘徊面です。",
    href: "/apps/night",
    color: "lavender"
  },
  {
    name: "Games",
    body: "すぐ遊べるミニゲームをまとめた小さいゲームハブです。気分転換や動作確認にも使えます。",
    href: "/apps/games",
    color: "lemon"
  },
  {
    name: "数学コミュニティ",
    body: "関数グラフ、幾何、空間図形、数式処理、科学計算をまとめたオールインワン数学ワークスペースです。",
    href: "/apps/math",
    color: "sky"
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
    </main>
  );
}

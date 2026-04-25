import Link from "next/link";
import { AppsDirectory } from "@/components/apps-directory";

export const metadata = {
  title: "アプリ一覧 | Commune",
  description: "Commune Apps"
};

const apps = [
  {
    name: "裏シラバス",
    formalName: "教員裁判！地獄の裏シラバス",
    href: "/apps/classes",
    category: "social",
    status: "live",
    summary: "授業メモと評判。",
    signal: "授業"
  },
  {
    name: "エッジ情報",
    href: "/apps/edge",
    category: "info",
    status: "live",
    summary: "制度、抜け道、便利メモ。",
    signal: "情報"
  },
  {
    name: "助け合いボード",
    href: "/apps/help",
    category: "social",
    status: "live",
    summary: "困りごとと手伝えること。",
    signal: "相互扶助"
  },
  {
    name: "ルームシェア",
    href: "/apps/roomshare",
    category: "social",
    status: "live",
    summary: "住まい探し。問い合わせつき。",
    signal: "住まい"
  },
  {
    name: "大学ランキング",
    formalName: "日本版・世界大学ランキング",
    href: "/apps/university-ranking",
    category: "social",
    status: "live",
    summary: "大学に一票。",
    signal: "投票"
  },
  {
    name: "英語コンテンツ",
    href: "/apps/english",
    category: "study",
    status: "live",
    summary: "単語、熟語、復習。",
    signal: "語学"
  },
  {
    name: "ドイツ語コンテンツ",
    href: "/apps/german",
    category: "study",
    status: "live",
    summary: "冠詞、性、復習ログ。",
    signal: "語学"
  },
  {
    name: "物理コンテンツ",
    href: "/apps/physics",
    category: "study",
    status: "live",
    summary: "式、シミュレーション、理論マップ。",
    signal: "実験"
  },
  {
    name: "数学コンテンツ",
    href: "/apps/math",
    category: "study",
    status: "live",
    summary: "数学の見方と問題。",
    signal: "数学"
  },
  {
    name: "Games",
    href: "/apps/games",
    category: "play",
    status: "live",
    summary: "小さなゲーム置き場。",
    signal: "遊び"
  },
  {
    name: "深夜徘徊界隈",
    href: "/apps/night",
    category: "play",
    status: "live",
    summary: "夜の散歩、寄り道、気配。",
    signal: "夜"
  },
  {
    name: "GenerativeArtWithMath",
    href: "/apps/generative-art-with-math",
    category: "create",
    status: "live",
    summary: "数学で描いたもの。",
    signal: "制作"
  },
  {
    name: "3Dモデル3Dグラフィック",
    href: "/apps/3d",
    category: "create",
    status: "live",
    summary: "3Dモデルとグラフィック。",
    signal: "3D"
  },
  {
    name: "みんなで作るVR空間",
    href: "/apps/vr",
    category: "create",
    status: "live",
    summary: "共同VR空間。",
    signal: "空間"
  },
  {
    name: "祈祷と呪詛",
    href: "/apps/ritual",
    category: "play",
    status: "live",
    summary: "祈り、呪い、遊び。",
    signal: "儀式"
  },
  {
    name: "Research Progress",
    category: "study",
    status: "soon",
    summary: "研究ラインと週次メモ。",
    signal: "研究"
  },
  {
    name: "研究室市場",
    formalName: "研究室市場（Labfolio）",
    category: "social",
    status: "soon",
    summary: "研究室、テーマ、人、募集。",
    signal: "研究室"
  },
  {
    name: "株式投資アプリ",
    category: "info",
    status: "soon",
    summary: "銘柄メモと記録。",
    signal: "投資"
  },
  {
    name: "カーシェア",
    href: "/apps/carshare",
    category: "social",
    status: "preview",
    summary: "車、予約、受け渡し。",
    signal: "移動"
  },
  {
    name: "マッチングアプリ",
    href: "/apps/matching",
    category: "social",
    status: "preview",
    summary: "いいね、チャット、通報。",
    signal: "出会い"
  }
];

const operations = [
  {
    name: "管理画面",
    href: "/admin",
    category: "ops",
    status: "ops",
    summary: "通報、ユーザー、公開状態。",
    signal: "管理"
  },
  {
    name: "運用状況",
    href: "/ops",
    category: "ops",
    status: "ops",
    summary: "データと動作。",
    signal: "運用"
  },
  {
    name: "共同ワールド管理室",
    href: "/apps/vr",
    category: "ops",
    status: "ops",
    summary: "招待制ワールド。",
    signal: "招待制"
  }
];

export default function AppsPage() {
  const liveCount = apps.filter((app) => app.status === "live").length;
  const soonCount = apps.filter((app) => app.status === "soon" || app.status === "preview").length;

  return (
    <main className="shell apps-library-shell">
      <section className="apps-library-hero">
        <div>
          <p className="apps-library-kicker">Apps</p>
          <h1>学内アプリ棚</h1>
          <p>公開中、準備中、運営用。</p>
        </div>
        <aside className="apps-library-index" aria-label="アプリの状態">
          <span>
            <strong>{liveCount}</strong>
            公開中
          </span>
          <span>
            <strong>{soonCount}</strong>
            準備中
          </span>
          <span>
            <strong>{operations.length}</strong>
            管理用
          </span>
        </aside>
      </section>

      <AppsDirectory apps={apps} operations={operations} />

      <div className="apps-library-return">
        <Link href="/explore">公開ページ</Link>
      </div>
    </main>
  );
}

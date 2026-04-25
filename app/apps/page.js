import Link from "next/link";
import { AppsDirectory } from "@/components/apps-directory";

export const metadata = {
  title: "アプリ一覧 | Commune",
  description: "New Commune の学内アプリ棚"
};

const apps = [
  {
    name: "裏シラバス",
    formalName: "教員裁判！地獄の裏シラバス",
    href: "/apps/classes",
    category: "social",
    status: "live",
    summary: "授業の情報を集め、学生同士で判断材料を残す場所。",
    signal: "授業"
  },
  {
    name: "エッジ情報",
    href: "/apps/edge",
    category: "info",
    status: "live",
    summary: "学内の小さな発見、制度、抜け道、便利情報を共有する棚。",
    signal: "情報"
  },
  {
    name: "助け合いボード",
    href: "/apps/help",
    category: "social",
    status: "live",
    summary: "困りごとを出し、手伝える人が拾うための学内ボード。",
    signal: "相互扶助"
  },
  {
    name: "ルームシェア",
    href: "/apps/roomshare",
    category: "social",
    status: "live",
    summary: "学生同士の住まい探しを、問い合わせとチャットまで通す。",
    signal: "住まい"
  },
  {
    name: "大学ランキング",
    formalName: "日本版・世界大学ランキング",
    href: "/apps/university-ranking",
    category: "social",
    status: "live",
    summary: "一アカウント一票で、大学への直感的な評価を集める実験。",
    signal: "投票"
  },
  {
    name: "英語コンテンツ",
    href: "/apps/english",
    category: "study",
    status: "live",
    summary: "単語、熟語、復習ステージを回す学習アプリ。",
    signal: "語学"
  },
  {
    name: "ドイツ語コンテンツ",
    href: "/apps/german",
    category: "study",
    status: "live",
    summary: "冠詞、性、復習ログまで含めたドイツ語の暗記導線。",
    signal: "語学"
  },
  {
    name: "物理コンテンツ",
    href: "/apps/physics",
    category: "study",
    status: "live",
    summary: "物理の式、シミュレーション、理論マップを行き来する実験室。",
    signal: "実験"
  },
  {
    name: "数学コンテンツ",
    href: "/apps/math",
    category: "study",
    status: "live",
    summary: "数学の見方や問題への入口をまとめる学習面。",
    signal: "数学"
  },
  {
    name: "Games",
    href: "/apps/games",
    category: "play",
    status: "live",
    summary: "Commune の中でそのまま遊べる小さなゲーム置き場。",
    signal: "遊び"
  },
  {
    name: "深夜徘徊界隈",
    href: "/apps/night",
    category: "play",
    status: "live",
    summary: "夜の散歩、寄り道、気配を記録する少し外れた遊び場。",
    signal: "夜"
  },
  {
    name: "GenerativeArtWithMath",
    href: "/apps/generative-art-with-math",
    category: "create",
    status: "live",
    summary: "数学から生成した作品と、制作過程を並べるギャラリー。",
    signal: "制作"
  },
  {
    name: "3Dモデル3Dグラフィック",
    href: "/apps/3d",
    category: "create",
    status: "live",
    summary: "3D表現やモデルを扱う制作系の入口。",
    signal: "3D"
  },
  {
    name: "みんなで作るVR空間",
    href: "/apps/vr",
    category: "create",
    status: "live",
    summary: "共同で空間を作るためのVRプロジェクト置き場。",
    signal: "空間"
  },
  {
    name: "祈祷と呪詛",
    href: "/apps/ritual",
    category: "play",
    status: "live",
    summary: "まじめな学内ツールの横に置く、儀式的な遊びの面。",
    signal: "儀式"
  },
  {
    name: "Research Progress",
    category: "study",
    status: "soon",
    summary: "研究会やゼミの進捗、週次チェックイン、研究ラインを扱う予定。",
    signal: "研究"
  },
  {
    name: "研究室市場",
    formalName: "研究室市場（Labfolio）",
    category: "social",
    status: "soon",
    summary: "研究室、テーマ、人、募集の見え方を整える準備中の市場。",
    signal: "研究室"
  },
  {
    name: "株式投資アプリ",
    category: "info",
    status: "soon",
    summary: "学生が投資の記録や銘柄メモを扱うための実験的な棚。",
    signal: "投資"
  },
  {
    name: "カーシェア",
    href: "/apps/carshare",
    category: "social",
    status: "preview",
    summary: "車両掲載、予約申請、受け渡しまでを想定した準備室。",
    signal: "移動"
  },
  {
    name: "マッチングアプリ",
    href: "/apps/matching",
    category: "social",
    status: "preview",
    summary: "相互いいね、チャット、通報までを見据えた準備室。",
    signal: "出会い"
  }
];

const operations = [
  {
    name: "管理画面",
    href: "/admin",
    category: "ops",
    status: "ops",
    summary: "通報、ユーザー、公開状態を確認する運営用の入口。",
    signal: "管理"
  },
  {
    name: "運用状況",
    href: "/ops",
    category: "ops",
    status: "ops",
    summary: "データや動作を点検するための運用ログ。",
    signal: "運用"
  },
  {
    name: "共同ワールド管理室",
    href: "/apps/vr",
    category: "ops",
    status: "ops",
    summary: "招待制の空間管理をまとめる準備中の管理棚。",
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
          <p className="apps-library-kicker">学内アプリ棚</p>
          <h1>学生の生活、研究、制作のための道具置き場。</h1>
          <p>
            New Commune の Apps は、きれいに並んだ製品一覧ではなく、必要な時に取り出せる学内の小さな道具箱です。
          </p>
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
        <Link href="/explore">人の公開ページを見る</Link>
      </div>
    </main>
  );
}

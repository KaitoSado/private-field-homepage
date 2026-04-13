import Link from "next/link";

export const metadata = {
  title: "カーシェア | Apps | Commune",
  description: "ルームシェアMVPと同じマーケットプレイス基盤で展開するカーシェア準備面。"
};

export default function CarsharePage() {
  return (
    <main className="shell">
      <section className="marketplace-hero">
        <div>
          <p className="eyebrow">Trust Marketplace</p>
          <h1>カーシェア</h1>
          <p>車両、予約申請、免許確認、チェックリスト、事故報告、保険と決済の運用フローを同じ基盤へ載せていきます。</p>
        </div>
        <Link href="/apps/roomshare" className="button button-primary">
          ルームシェアMVPを見る
        </Link>
      </section>

      <section className="marketplace-admin-grid">
        <div className="surface marketplace-stat">
          <span>Ready</span>
          <strong>CarDetail</strong>
          <p>メーカー、車種、年式、受け渡し場所、免許確認ステータスを保存できます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Next</span>
          <strong>予約</strong>
          <p>Application を予約申請として使い、承認後に MessageThread を開始します。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Care</span>
          <strong>安全運用</strong>
          <p>本人確認、通報、ブロック、管理者対応ログを最初から共通化しています。</p>
        </div>
      </section>
    </main>
  );
}

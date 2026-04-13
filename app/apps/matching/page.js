import Link from "next/link";

export const metadata = {
  title: "マッチングアプリ | Apps | Commune",
  description: "ルームシェアMVPと同じマーケットプレイス基盤で展開するマッチングアプリ準備面。"
};

export default function MatchingAppPage() {
  return (
    <main className="shell">
      <section className="marketplace-hero">
        <div>
          <p className="eyebrow">Trust Marketplace</p>
          <h1>マッチングアプリ</h1>
          <p>プロフィール、いいね、相互いいね、Match、マッチ成立後チャット、ブロック、通報を同じ信頼基盤で扱います。</p>
        </div>
        <Link href="/apps/roomshare" className="button button-primary">
          ルームシェアMVPを見る
        </Link>
      </section>

      <section className="marketplace-admin-grid">
        <div className="surface marketplace-stat">
          <span>Ready</span>
          <strong>DatingProfile</strong>
          <p>年齢、性別、興味、目的、写真、希望条件を分離して保存できます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Rule</span>
          <strong>Mutual Like</strong>
          <p>相互いいねで Match を作り、成立後だけ MessageThread を開きます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Safety</span>
          <strong>Moderation</strong>
          <p>通報、ブロック、管理画面、管理者対応ログを共通で使います。</p>
        </div>
      </section>
    </main>
  );
}

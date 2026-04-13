export const metadata = {
  title: "マッチングアプリ | Apps | Commune",
  description: "プロフィール、いいね、相互いいね、マッチ後チャット、通報、ブロックを扱うマッチングアプリ準備面。"
};

const profileCards = [
  {
    name: "研究室帰りに話せる人",
    area: "湘南藤沢",
    intent: "雑談 / ごはん / 勉強仲間",
    detail: "相互いいね後だけチャット"
  },
  {
    name: "週末に映画へ行ける人",
    area: "都内・神奈川",
    intent: "趣味友 / 週末予定",
    detail: "通報とブロックを常設"
  }
];

const moderationItems = ["相互いいね", "Match", "チャット制限", "本人確認", "通報", "ブロック"];

export default function MatchingAppPage() {
  return (
    <main className="shell">
      <section className="marketplace-hero">
        <div>
          <p className="eyebrow">Matching</p>
          <h1>マッチングアプリ</h1>
          <p>プロフィールと希望条件を起点に、相互いいねが成立した相手だけと安全に会話できます。</p>
        </div>
        <div className="marketplace-hero-actions">
          <span className="marketplace-status-pill is-pending">準備中</span>
          <span className="marketplace-status-pill is-verified">共通基盤あり</span>
        </div>
      </section>

      <section className="marketplace-admin-grid">
        <div className="surface marketplace-stat">
          <span>Profile</span>
          <strong>DatingProfile</strong>
          <p>年齢、性別、興味、目的、写真、希望条件を通常プロフィールから分離します。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Like</span>
          <strong>相互いいね</strong>
          <p>双方のいいねで Match を作り、成立後だけ MessageThread を開きます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Chat</span>
          <strong>制限付き会話</strong>
          <p>マッチ相手だけが閲覧・送信でき、ブロック済みユーザー間の送信を止めます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Safety</span>
          <strong>通報と管理</strong>
          <p>Report、Block、AdminAction を使い、問題対応の履歴を残します。</p>
        </div>
      </section>

      <section className="marketplace-layout">
        <aside className="surface marketplace-filter">
          <h2>希望条件</h2>
          <label>
            エリア
            <input value="湘南藤沢・都内" readOnly />
          </label>
          <label>
            目的
            <input value="友達・趣味・恋愛" readOnly />
          </label>
          <label>
            会話開始
            <input value="相互いいね後のみ" readOnly />
          </label>
          <p className="marketplace-status">プロフィール公開、いいね、マッチ成立、チャット開始の順で開きます。</p>
        </aside>

        <div className="marketplace-results">
          {profileCards.map((profile) => (
            <article key={profile.name} className="surface marketplace-listing-card">
              <div className="marketplace-listing-image is-empty">MATCH</div>
              <div className="marketplace-card-body">
                <div className="marketplace-card-head">
                  <span className="marketplace-status-pill is-pending">Preview</span>
                  <strong>{profile.area}</strong>
                </div>
                <h2>{profile.name}</h2>
                <p>{profile.intent}</p>
                <div className="marketplace-meta-row">
                  <span>{profile.detail}</span>
                  <span>本人確認ステータス</span>
                  <span>ブロック可</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface marketplace-edit-form">
        <div>
          <p className="eyebrow">Matching Rules</p>
          <h2>会話を始める条件</h2>
        </div>
        <div className="marketplace-meta-row">
          {moderationItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <p className="marketplace-note">
          相互いいねが成立していない相手とはチャットを開かず、通報とブロックはプロフィールとメッセージの両方から扱います。
        </p>
      </section>
    </main>
  );
}

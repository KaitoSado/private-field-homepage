export const metadata = {
  title: "カーシェア | Apps | Commune",
  description: "車両掲載、予約申請、免許確認、受け渡し、事故報告までを扱うカーシェア準備面。"
};

const sampleCars = [
  {
    title: "湘南台駅 5分のコンパクトカー",
    area: "湘南台 / 藤沢",
    price: "4,800円 / 日",
    spec: "5人乗り / AT / 免許確認必須"
  },
  {
    title: "週末だけ貸せる軽ワゴン",
    area: "辻堂 / 茅ヶ崎",
    price: "3,200円 / 日",
    spec: "4人乗り / 荷物多め / 受け渡し相談"
  }
];

const safetyItems = ["本人確認", "免許証確認", "利用前チェック", "利用後チェック", "傷・事故報告", "管理者対応ログ"];

export default function CarsharePage() {
  return (
    <main className="shell">
      <section className="marketplace-hero">
        <div>
          <p className="eyebrow">Carshare</p>
          <h1>カーシェア</h1>
          <p>車を貸したい人と借りたい人を、予約申請、本人確認、免許確認、受け渡し記録まで含めてつなぎます。</p>
        </div>
        <div className="marketplace-hero-actions">
          <span className="marketplace-status-pill is-pending">準備中</span>
          <span className="marketplace-status-pill is-verified">共通基盤あり</span>
        </div>
      </section>

      <section className="marketplace-admin-grid">
        <div className="surface marketplace-stat">
          <span>Vehicle</span>
          <strong>CarDetail</strong>
          <p>メーカー、車種、年式、乗車定員、受け渡し場所、利用可能日時を分離して扱います。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Request</span>
          <strong>予約申請</strong>
          <p>Application を予約申請として使い、承認後に MessageThread を開きます。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Trust</span>
          <strong>免許確認</strong>
          <p>IdentityVerification で本人確認と免許証確認の状態を管理します。</p>
        </div>
        <div className="surface marketplace-stat">
          <span>Ops</span>
          <strong>事故対応</strong>
          <p>通報、ブロック、管理者対応ログを共通の運用面で追えるようにします。</p>
        </div>
      </section>

      <section className="marketplace-layout">
        <aside className="surface marketplace-filter">
          <h2>探す条件</h2>
          <label>
            受け渡しエリア
            <input value="湘南台・藤沢" readOnly />
          </label>
          <label>
            利用日
            <input value="週末 / 半日 / 1日" readOnly />
          </label>
          <label>
            確認ステータス
            <input value="本人確認・免許確認済み" readOnly />
          </label>
          <p className="marketplace-status">実予約と決済は未接続です。まずは掲載、予約申請、確認フローから開きます。</p>
        </aside>

        <div className="marketplace-results">
          {sampleCars.map((car) => (
            <article key={car.title} className="surface marketplace-listing-card">
              <div className="marketplace-listing-image is-empty">CAR</div>
              <div className="marketplace-card-body">
                <div className="marketplace-card-head">
                  <span className="marketplace-status-pill is-pending">Preview</span>
                  <strong>{car.price}</strong>
                </div>
                <h2>{car.title}</h2>
                <p>{car.spec}</p>
                <div className="marketplace-meta-row">
                  <span>{car.area}</span>
                  <span>予約承認制</span>
                  <span>デポジット準備</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface marketplace-edit-form">
        <div>
          <p className="eyebrow">Safety Flow</p>
          <h2>カーシェアで先に固めること</h2>
        </div>
        <div className="marketplace-meta-row">
          {safetyItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <p className="marketplace-note">
          保険、実決済、キャンセル料、事故時の責任分界は、公開前に運用ルールを固定します。
        </p>
      </section>
    </main>
  );
}

export const metadata = {
  title: "データ保持ポリシー | New Commune"
};

export default function RetentionPage() {
  return (
    <main className="shell narrow-shell">
      <section className="surface legal-page">
        <p className="eyebrow">Retention</p>
        <h1>データ保持ポリシー</h1>
        <p>アカウント、プロフィール、投稿、通知、通報、運用ログはサービス提供と安全確保のために保持されます。</p>
        <h2>公開データ</h2>
        <p>公開設定のプロフィールと投稿は、非公開化または削除されるまで表示対象になります。</p>
        <h2>運用ログ</h2>
        <p>ページビュー、エラーログ、abuse イベントは障害対応と不正利用対策のため一定期間保持されます。</p>
        <h2>削除対応</h2>
        <p>法的義務や不正対策上必要な場合を除き、退会・削除申請に応じて関連データの削除または匿名化を検討します。</p>
      </section>
    </main>
  );
}

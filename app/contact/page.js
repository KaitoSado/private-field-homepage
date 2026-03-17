const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

export const metadata = {
  title: "お問い合わせ | FieldCard Social"
};

export default function ContactPage() {
  return (
    <main className="shell narrow-shell">
      <section className="surface legal-page">
        <p className="eyebrow">Contact</p>
        <h1>お問い合わせ</h1>
        {supportEmail ? (
          <p>
            運営への連絡は <a href={`mailto:${supportEmail}`}>{supportEmail}</a> までお願いします。
          </p>
        ) : (
          <p>`NEXT_PUBLIC_SUPPORT_EMAIL` を設定すると、このページに運営連絡先を表示できます。</p>
        )}
        <h2>想定用途</h2>
        <p>不具合報告、権利侵害申告、アカウント停止に関する連絡、その他運営への問い合わせ。</p>
      </section>
    </main>
  );
}

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const metadata = {
  title: "運用状況 | New Commune"
};

export default async function OpsPage() {
  const supabase = getSupabaseAdminClient();
  const statuses = [
    { label: "Supabase URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { label: "Supabase anon key", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { label: "Service role key", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { label: "Support email", ok: Boolean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) },
    { label: "Site URL", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
    { label: "Storage CDN buckets", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET && process.env.NEXT_PUBLIC_SUPABASE_POST_MEDIA_BUCKET) }
  ];

  let metrics = {
    pageViews24h: 0,
    errors24h: 0,
    abuse24h: 0
  };

  if (supabase) {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: pageViews24h }, { count: errors24h }, { count: abuse24h }] = await Promise.all([
      supabase.from("telemetry_page_views").select("*", { head: true, count: "exact" }).gte("created_at", sinceIso),
      supabase.from("telemetry_errors").select("*", { head: true, count: "exact" }).gte("created_at", sinceIso),
      supabase.from("abuse_events").select("*", { head: true, count: "exact" }).gte("created_at", sinceIso)
    ]);
    metrics = {
      pageViews24h: pageViews24h || 0,
      errors24h: errors24h || 0,
      abuse24h: abuse24h || 0
    };
  }

  return (
    <main className="shell">
      <section className="surface dashboard-hero">
        <div>
          <p className="eyebrow">Ops</p>
          <h1>運用状況</h1>
          <p>メール、監視、CDN、telemetry の最低限の設定状態を確認するためのページです。</p>
        </div>
      </section>

      <section className="section-grid admin-grid">
        {statuses.map((item) => (
          <article key={item.label} className="surface feature-card">
            <p className="eyebrow">{item.ok ? "OK" : "Missing"}</p>
            <h2>{item.label}</h2>
            <p>{item.ok ? "設定済み" : "未設定"}</p>
          </article>
        ))}
      </section>

      <section className="section-grid admin-grid">
        <article className="surface feature-card">
          <p className="eyebrow">Traffic 24h</p>
          <h2>{metrics.pageViews24h}</h2>
          <p>アクセス解析の記録数</p>
        </article>
        <article className="surface feature-card">
          <p className="eyebrow">Errors 24h</p>
          <h2>{metrics.errors24h}</h2>
          <p>監視対象エラー数</p>
        </article>
        <article className="surface feature-card">
          <p className="eyebrow">Abuse 24h</p>
          <h2>{metrics.abuse24h}</h2>
          <p>abuse 検知ログ数</p>
        </article>
      </section>
    </main>
  );
}

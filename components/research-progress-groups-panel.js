"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { formatResearchWeekLabel, getResearchRoleLabel } from "@/lib/research-progress";

const emptyForm = {
  name: "",
  description: ""
};

export function ResearchProgressGroupsPanel() {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [weekStart, setWeekStart] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!active) return;
      setSession(currentSession);
      if (currentSession?.user) {
        await loadGroups(currentSession.access_token);
      } else {
        setLoading(false);
      }
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.access_token) {
        await loadGroups(nextSession.access_token);
      } else {
        setGroups([]);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function loadGroups(accessToken) {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/research-progress", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "研究グループ一覧を読み込めませんでした。");
      }

      setGroups(payload.groups || []);
      setWeekStart(payload.week_start || "");
    } catch (error) {
      setStatus(error.message || "研究グループ一覧を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();
    if (!session?.access_token) {
      setStatus("グループ作成にはログインが必要です。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/research-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(form)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "研究グループを作成できませんでした。");
      }

      setForm(emptyForm);
      router.push(payload.href || `/apps/research-progress/${payload.group.slug}`);
      router.refresh();
    } catch (error) {
      setStatus(error.message || "研究グループを作成できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="surface empty-state">
        <h1>Research Progress を準備中です</h1>
        <p>Supabase 設定が入るとグループ一覧と週次チェックインが使えます。</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="surface empty-state">
        <h1>研究グループを読み込んでいます</h1>
      </section>
    );
  }

  if (!session?.user) {
    return (
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <h1>Research Progress</h1>
          <p>招待制の研究会・ゼミ・小規模PJ向けの進捗チェックインアプリです。</p>
        </div>
        <div className="hero-actions">
          <Link href="/auth?next=/apps/research-progress" className="button button-primary">
            ログインして使う
          </Link>
          <Link href="/apps" className="button button-secondary">
            アプリ一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="research-progress-shell">
      <section className="surface research-progress-hero">
        <div className="research-progress-hero-copy">
          <p className="eyebrow">Research Progress</p>
          <h1>研究会の危険箇所を 30 秒で把握する</h1>
          <p>
            研究計画からポスター、論文投稿までのラインと、週次チェックインを同じ場所で見ます。研究室のポートフォリオ管理と日々のフォローを一体化した MVP です。
          </p>
          {weekStart ? <p className="research-progress-meta-line">対象週: {formatResearchWeekLabel(weekStart)} 週</p> : null}
        </div>
      </section>

      <section className="research-progress-groups-layout">
        <div className="research-progress-groups-list">
          <div className="research-progress-section-head">
            <div>
              <h2>所属グループ</h2>
              <p>自分が参加している研究会・ゼミ・PJだけが表示されます。</p>
            </div>
          </div>

          {groups.length ? (
            <div className="research-progress-group-grid">
              {groups.map((group) => (
                <Link key={group.id} href={`/apps/research-progress/${group.slug}`} className="surface research-progress-group-card">
                  <div className="research-progress-card-head">
                    <strong>{group.name}</strong>
                    <span className="research-progress-chip">{getResearchRoleLabel(group.my_role)}</span>
                  </div>
                  <p>{group.description || "週次チェックインと介入支援のためのグループです。"}</p>
                  <dl className="research-progress-mini-stats">
                    <div>
                      <dt>案件</dt>
                      <dd>{group.pipeline_summary?.active_count || 0}</dd>
                    </div>
                    <div>
                      <dt>直近締切</dt>
                      <dd>{group.pipeline_summary?.due_soon_count || 0}</dd>
                    </div>
                    <div>
                      <dt>停滞</dt>
                      <dd>{group.pipeline_summary?.blocked_count || 0}</dd>
                    </div>
                    <div>
                      <dt>未提出</dt>
                      <dd>{group.summary?.missing_count || 0}</dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          ) : (
            <div className="surface empty-state">
              <h3>まだ所属グループがありません</h3>
              <p>まずは主催用のグループを 1 つ作るか、owner に追加してもらってください。</p>
            </div>
          )}
        </div>

        <aside className="surface research-progress-create-card">
          <div className="research-progress-section-head">
            <div>
              <h2>新しいグループを作る</h2>
              <p>最初の owner として自分が登録されます。招待リンクではなく username 指定で追加する運用です。</p>
            </div>
          </div>

          <form className="research-progress-form" onSubmit={handleCreateGroup}>
            <label>
              <span>グループ名</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例: HCI 研究会"
                maxLength={120}
              />
            </label>
            <label>
              <span>説明</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="何を扱う研究会か、週次ミーティングの単位か、簡単に書く。"
                rows={5}
                maxLength={400}
              />
            </label>
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? "作成中..." : "グループを作成"}
            </button>
          </form>

          {status ? <p className="form-status">{status}</p> : null}
        </aside>
      </section>
    </div>
  );
}

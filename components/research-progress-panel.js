"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  RESEARCH_BLOCKER_TYPE_OPTIONS,
  RESEARCH_STATUS_OPTIONS,
  compareResearchWeek,
  formatResearchWeekLabel,
  getResearchBlockerLabel,
  getResearchRoleLabel,
  getResearchStatusClass,
  getResearchStatusLabel,
  getResearchStatusPriority,
  getResearchWeekStart,
  shiftResearchWeekStart
} from "@/lib/research-progress";

function buildEmptyForm(weekStart) {
  return {
    groupSlug: "",
    weekStart,
    topicTitle: "",
    status: "review_needed",
    summaryText: "",
    doneText: "",
    nextText: "",
    blockersText: "",
    helpNeededText: "",
    needsHelp: false,
    wantsReviewInMeeting: false,
    blockerType: "none"
  };
}

function buildFormFromUpdate(update, groupSlug, weekStart) {
  if (!update) {
    return {
      ...buildEmptyForm(weekStart),
      groupSlug
    };
  }

  return {
    groupSlug,
    weekStart,
    topicTitle: update.topic_title || "",
    status: update.status || "review_needed",
    summaryText: update.summary_text || "",
    doneText: update.done_text || "",
    nextText: update.next_text || "",
    blockersText: update.blockers_text || "",
    helpNeededText: update.help_needed_text || "",
    needsHelp: Boolean(update.needs_help),
    wantsReviewInMeeting: Boolean(update.wants_review_in_meeting),
    blockerType: update.blocker_type || "none"
  };
}

export function ResearchProgressPanel({ slug }) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [weekStart, setWeekStart] = useState(getResearchWeekStart());
  const [form, setForm] = useState(() => buildEmptyForm(getResearchWeekStart()));
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    status: "",
    needsHelpOnly: false,
    missingOnly: false,
    meetingOnly: false
  });
  const [historyView, setHistoryView] = useState("week");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewSavingId, setReviewSavingId] = useState("");
  const [memberForm, setMemberForm] = useState({
    username: "",
    role: "member"
  });
  const [memberStatus, setMemberStatus] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const deferredQuery = useDeferredValue(filters.query);

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
      if (!currentSession?.access_token) {
        setLoading(false);
      }
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.access_token) {
        setDashboard(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.access_token) return;
    loadDashboard(session.access_token, weekStart);
  }, [session?.access_token, slug, weekStart]);

  useEffect(() => {
    if (!dashboard) return;
    setWeekStart(dashboard.week_start || getResearchWeekStart());
    setForm(buildFormFromUpdate(dashboard.my_update, slug, dashboard.week_start || getResearchWeekStart()));
    setReviewDrafts(
      Object.fromEntries((dashboard.updates || []).map((item) => [item.id, item.reviewer_note || ""]))
    );
  }, [dashboard, slug]);

  async function loadDashboard(accessToken, targetWeekStart) {
    setLoading(true);
    setStatus("");

    try {
      const params = new URLSearchParams({
        slug,
        weekStart: targetWeekStart
      });
      const response = await fetch(`/api/research-progress?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "研究進捗を読み込めませんでした。");
      }

      setDashboard(payload);
      setWeekStart(payload.week_start || targetWeekStart);
    } catch (error) {
      setDashboard(null);
      setStatus(error.message || "研究進捗を読み込めませんでした。");
    } finally {
      setLoading(false);
    }
  }

  async function handleWeekChange(nextWeekStart) {
    setWeekStart(nextWeekStart);
  }

  async function handleSubmitUpdate(event) {
    event.preventDefault();
    if (!session?.access_token) {
      setStatus("週報を保存するにはログインが必要です。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/research-updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...form,
          groupSlug: slug,
          weekStart
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "週報を保存できませんでした。");
      }

      setStatus("週報を保存しました。");
      await loadDashboard(session.access_token, weekStart);
    } catch (error) {
      setStatus(error.message || "週報を保存できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveReview(updateId) {
    if (!session?.access_token) {
      setReviewStatus("レビュー保存にはログインが必要です。");
      return;
    }

    setReviewSavingId(updateId);
    setReviewStatus("");

    try {
      const response = await fetch("/api/research-updates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          updateId,
          reviewerNote: reviewDrafts[updateId] || ""
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "レビューノートを保存できませんでした。");
      }

      setReviewStatus("レビューノートを保存しました。");
      await loadDashboard(session.access_token, weekStart);
    } catch (error) {
      setReviewStatus(error.message || "レビューノートを保存できませんでした。");
    } finally {
      setReviewSavingId("");
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();
    if (!session?.access_token) {
      setMemberStatus("メンバー追加にはログインが必要です。");
      return;
    }

    setMemberSubmitting(true);
    setMemberStatus("");

    try {
      const response = await fetch("/api/research-progress", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          groupSlug: slug,
          username: memberForm.username,
          role: memberForm.role
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "メンバーを追加できませんでした。");
      }

      setMemberForm({
        username: "",
        role: "member"
      });
      setMemberStatus("メンバーを追加しました。");
      await loadDashboard(session.access_token, weekStart);
    } catch (error) {
      setMemberStatus(error.message || "メンバーを追加できませんでした。");
    } finally {
      setMemberSubmitting(false);
    }
  }

  const rows = useMemo(() => {
    const currentRows = dashboard?.rows || [];
    const query = deferredQuery.trim().toLowerCase();

    return currentRows
      .filter((row) => {
        const profile = row.member?.profile || {};
        const statusKey = row.is_missing ? "missing" : row.update?.status || "";
        if (filters.status && statusKey !== filters.status) return false;
        if (filters.needsHelpOnly && !row.update?.needs_help) return false;
        if (filters.missingOnly && !row.is_missing) return false;
        if (
          filters.meetingOnly &&
          !row.update?.wants_review_in_meeting &&
          !row.update?.needs_help &&
          !["blocked", "review_needed"].includes(row.update?.status || "")
        ) {
          return false;
        }

        if (!query) return true;

        const haystack = [
          profile.display_name,
          profile.username,
          row.update?.topic_title,
          row.update?.summary_text,
          row.update?.blockers_text,
          row.update?.help_needed_text,
          row.update?.reviewer_note
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => {
        const priorityDiff =
          getResearchStatusPriority(left.update?.status, left.is_missing) -
          getResearchStatusPriority(right.update?.status, right.is_missing);
        if (priorityDiff !== 0) return priorityDiff;

        const helpDiff = Number(Boolean(right.update?.needs_help)) - Number(Boolean(left.update?.needs_help));
        if (helpDiff !== 0) return helpDiff;

        const meetingDiff = Number(Boolean(right.update?.wants_review_in_meeting)) - Number(Boolean(left.update?.wants_review_in_meeting));
        if (meetingDiff !== 0) return meetingDiff;

        const streakDiff = (right.missing_streak || right.risk_streak || 0) - (left.missing_streak || left.risk_streak || 0);
        if (streakDiff !== 0) return streakDiff;

        const leftTime = new Date(left.update?.updated_at || left.last_seen?.updated_at || 0).getTime();
        const rightTime = new Date(right.update?.updated_at || right.last_seen?.updated_at || 0).getTime();
        return rightTime - leftTime;
      });
  }, [dashboard?.rows, deferredQuery, filters.meetingOnly, filters.missingOnly, filters.needsHelpOnly, filters.status]);

  const historyByWeek = useMemo(() => {
    const grouped = new Map();
    for (const item of dashboard?.history || []) {
      const list = grouped.get(item.week_start) || [];
      list.push(item);
      grouped.set(item.week_start, list);
    }
    return [...grouped.entries()].sort((left, right) => compareResearchWeek(right[0], left[0]));
  }, [dashboard?.history]);

  const historyByMember = useMemo(() => {
    const grouped = new Map();
    for (const item of dashboard?.history || []) {
      const key = item.author?.id || item.author_id;
      const list = grouped.get(key) || [];
      list.push(item);
      grouped.set(key, list);
    }

    return [...grouped.entries()]
      .map((entry) => ({
        key: entry[0],
        author: entry[1][0]?.author,
        items: entry[1].sort((left, right) => compareResearchWeek(right.week_start, left.week_start))
      }))
      .sort((left, right) => {
        const leftName = left.author?.display_name || left.author?.username || "";
        const rightName = right.author?.display_name || right.author?.username || "";
        return leftName.localeCompare(rightName, "ja");
      });
  }, [dashboard?.history]);

  const canEdit = dashboard?.group?.my_role && dashboard.group.my_role !== "viewer";
  const canReview = dashboard?.group?.my_role === "owner";
  const currentWeekStart = dashboard?.current_week_start || getResearchWeekStart();
  const canGoNextWeek = compareResearchWeek(weekStart, currentWeekStart) < 0;

  if (!hasSupabaseConfig) {
    return (
      <section className="surface empty-state">
        <h1>Research Progress を準備中です</h1>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="surface empty-state">
        <h1>研究進捗を読み込んでいます</h1>
      </section>
    );
  }

  if (!session?.user) {
    return (
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <h1>ログインしてください</h1>
          <p>このアプリは招待制の研究グループメンバーだけが閲覧できます。</p>
        </div>
        <div className="hero-actions">
          <Link href={`/auth?next=/apps/research-progress/${slug}`} className="button button-primary">
            ログインして開く
          </Link>
          <Link href="/apps/research-progress" className="button button-secondary">
            グループ一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  if (!dashboard) {
    return (
      <section className="surface empty-state">
        <h1>Research Progress</h1>
        <p>{status || "このグループを読み込めませんでした。"}</p>
        <div className="hero-actions">
          <Link href="/apps/research-progress" className="button button-secondary">
            グループ一覧へ戻る
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
          <h1>{dashboard.group.name}</h1>
          <p>{dashboard.group.description || "週次チェックインとレビューのための招待制グループです。"}</p>
          <div className="research-progress-hero-meta">
            <span className="research-progress-chip">{getResearchRoleLabel(dashboard.group.my_role)}</span>
            <span className="research-progress-meta-line">週: {formatResearchWeekLabel(weekStart)}</span>
          </div>
        </div>
        <div className="research-progress-week-nav">
          <button type="button" className="button button-secondary" onClick={() => void handleWeekChange(shiftResearchWeekStart(weekStart, -1))}>
            前の週
          </button>
          <button type="button" className="button button-secondary" onClick={() => void handleWeekChange(currentWeekStart)} disabled={weekStart === currentWeekStart}>
            今週
          </button>
          <button type="button" className="button button-secondary" onClick={() => void handleWeekChange(shiftResearchWeekStart(weekStart, 1))} disabled={!canGoNextWeek}>
            次の週
          </button>
        </div>
      </section>

      <section className="research-progress-summary-grid">
        <article className="surface research-progress-summary-card">
          <span>提出済</span>
          <strong>{dashboard.summary.submitted_count}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>未提出</span>
          <strong>{dashboard.summary.missing_count}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>停滞</span>
          <strong>{dashboard.summary.blocked_count}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>注意</span>
          <strong>{dashboard.summary.at_risk_count}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>help</span>
          <strong>{dashboard.summary.needs_help_count}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>会議候補</span>
          <strong>{dashboard.summary.meeting_candidate_count}</strong>
        </article>
      </section>

      <section className="research-progress-main-grid">
        <section className="surface research-progress-form-card">
          <div className="research-progress-section-head">
            <div>
              <h2>自分の週報</h2>
              <p>
                {dashboard.my_update
                  ? `更新済み: ${new Date(dashboard.my_update.updated_at).toLocaleString("ja-JP")}`
                  : "まだこの週の提出がありません。3分で出せる量に絞っています。"}
              </p>
            </div>
            {dashboard.my_update?.submitted_late ? <span className="research-progress-chip is-warning">遅れて提出</span> : null}
          </div>

          {canEdit ? (
            <form className="research-progress-form" onSubmit={handleSubmitUpdate}>
              <div className="research-progress-form-row">
                <label>
                  <span>状態</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                        needsHelp: event.target.value === "blocked" ? true : current.needsHelp,
                        blockerType: event.target.value === "on_track" ? "none" : current.blockerType
                      }))
                    }
                  >
                    {RESEARCH_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getResearchStatusLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>テーマ名</span>
                  <input
                    value={form.topicTitle}
                    onChange={(event) => setForm((current) => ({ ...current, topicTitle: event.target.value }))}
                    placeholder="例: 先行研究整理 / 実験計画"
                    maxLength={120}
                  />
                </label>
              </div>

              <label>
                <span>今週の一言要約</span>
                <input
                  value={form.summaryText}
                  onChange={(event) => setForm((current) => ({ ...current, summaryText: event.target.value }))}
                  placeholder="今週どうだったかを一文で。"
                  maxLength={180}
                  required
                />
              </label>

              <label>
                <span>今週やったこと</span>
                <textarea
                  value={form.doneText}
                  onChange={(event) => setForm((current) => ({ ...current, doneText: event.target.value }))}
                  placeholder="読み進めた論文、書いたコード、進めた分析など。"
                  rows={4}
                />
              </label>

              <label>
                <span>次の一歩</span>
                <textarea
                  value={form.nextText}
                  onChange={(event) => setForm((current) => ({ ...current, nextText: event.target.value }))}
                  placeholder="次回までにやる最小単位を 1 つ書く。"
                  rows={3}
                  required
                />
              </label>

              <div className="research-progress-form-row">
                <label>
                  <span>詰まりの種類</span>
                  <select
                    value={form.blockerType}
                    onChange={(event) => setForm((current) => ({ ...current, blockerType: event.target.value }))}
                    disabled={form.status === "on_track"}
                  >
                    {RESEARCH_BLOCKER_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getResearchBlockerLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="research-progress-toggle">
                  <input
                    type="checkbox"
                    checked={form.needsHelp}
                    onChange={(event) => setForm((current) => ({ ...current, needsHelp: event.target.checked }))}
                  />
                  <span>help が必要</span>
                </label>
              </div>

              <label>
                <span>詰まり</span>
                <textarea
                  value={form.blockersText}
                  onChange={(event) => setForm((current) => ({ ...current, blockersText: event.target.value }))}
                  placeholder="止まっている理由、迷っている点、依存待ちなど。"
                  rows={3}
                />
              </label>

              <label>
                <span>相談したいこと</span>
                <textarea
                  value={form.helpNeededText}
                  onChange={(event) => setForm((current) => ({ ...current, helpNeededText: event.target.value }))}
                  placeholder="主催や他メンバーに相談したいこと。"
                  rows={3}
                />
              </label>

              <label className="research-progress-toggle">
                <input
                  type="checkbox"
                  checked={form.wantsReviewInMeeting}
                  onChange={(event) => setForm((current) => ({ ...current, wantsReviewInMeeting: event.target.checked }))}
                />
                <span>次回会議で扱いたい</span>
              </label>

              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "保存中..." : "週報を保存"}
              </button>
            </form>
          ) : (
            <div className="research-progress-note-box">
              <p>viewer 権限のため、自分の週報作成はできません。</p>
            </div>
          )}

          {status ? <p className="form-status">{status}</p> : null}
        </section>

        <aside className="research-progress-side-stack">
          <section className="surface research-progress-callout-card">
            <div className="research-progress-section-head">
              <div>
                <h2>今週の要注意</h2>
                <p>blocked / help / 会議候補だけを先に拾います。</p>
              </div>
            </div>
            {dashboard.meeting_candidates.length ? (
              <div className="research-progress-queue">
                {dashboard.meeting_candidates.map((item) => (
                  <article key={item.id} className="research-progress-queue-item">
                    <div className="research-progress-card-head">
                      <strong>{item.author?.display_name || item.author?.username || "member"}</strong>
                      <span className={getResearchStatusClass(item.status)}>{getResearchStatusLabel(item.status)}</span>
                    </div>
                    <p>{item.summary_text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">今週は会議候補がありません。</p>
            )}
          </section>

          {canReview ? (
            <section className="surface research-progress-member-card">
              <div className="research-progress-section-head">
                <div>
                  <h2>メンバー追加</h2>
                  <p>既存アカウントの username でグループへ追加します。</p>
                </div>
              </div>
              <form className="research-progress-form" onSubmit={handleAddMember}>
                <label>
                  <span>username</span>
                  <input
                    value={memberForm.username}
                    onChange={(event) => setMemberForm((current) => ({ ...current, username: event.target.value }))}
                    placeholder="kaito-sado"
                  />
                </label>
                <label>
                  <span>権限</span>
                  <select
                    value={memberForm.role}
                    onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </select>
                </label>
                <button type="submit" className="button button-secondary" disabled={memberSubmitting}>
                  {memberSubmitting ? "追加中..." : "メンバーを追加"}
                </button>
              </form>
              {memberStatus ? <p className="form-status">{memberStatus}</p> : null}
            </section>
          ) : null}
        </aside>
      </section>

      <section className="surface research-progress-board-card">
        <div className="research-progress-section-head">
          <div>
            <h2>今週の進捗一覧</h2>
            <p>未提出、停滞、help 要請、会議候補をここで絞り込みます。</p>
          </div>
        </div>

        <div className="research-progress-filter-row">
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="名前 / summary / blocker で検索"
          />
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">全状態</option>
            <option value="missing">未提出</option>
            {RESEARCH_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {getResearchStatusLabel(option)}
              </option>
            ))}
          </select>
          <label className="research-progress-inline-toggle">
            <input
              type="checkbox"
              checked={filters.needsHelpOnly}
              onChange={(event) => setFilters((current) => ({ ...current, needsHelpOnly: event.target.checked }))}
            />
            <span>helpのみ</span>
          </label>
          <label className="research-progress-inline-toggle">
            <input
              type="checkbox"
              checked={filters.meetingOnly}
              onChange={(event) => setFilters((current) => ({ ...current, meetingOnly: event.target.checked }))}
            />
            <span>会議候補のみ</span>
          </label>
          <label className="research-progress-inline-toggle">
            <input
              type="checkbox"
              checked={filters.missingOnly}
              onChange={(event) => setFilters((current) => ({ ...current, missingOnly: event.target.checked }))}
            />
            <span>未提出のみ</span>
          </label>
        </div>

        <div className="research-progress-table-wrap">
          <table className="research-progress-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>topic</th>
                <th>状態</th>
                <th>summary</th>
                <th>signal</th>
                <th>更新</th>
                {canReview ? <th>review</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const profile = row.member.profile || {};
                const update = row.update;
                return (
                  <tr key={row.member.id}>
                    <td>
                      <strong>{profile.display_name || profile.username || "member"}</strong>
                      <span>@{profile.username || "user"}</span>
                      <small>{getResearchRoleLabel(row.member.role)}</small>
                    </td>
                    <td>{update?.topic_title || "未設定"}</td>
                    <td>
                      <span className={getResearchStatusClass(update?.status, row.is_missing)}>
                        {row.is_missing ? "未提出" : getResearchStatusLabel(update?.status)}
                      </span>
                    </td>
                    <td>
                      {row.is_missing ? (
                        <span className="research-progress-muted-inline">この週の提出はまだありません。</span>
                      ) : (
                        <div className="research-progress-cell-stack">
                          <strong>{update.summary_text}</strong>
                          {update.blockers_text ? <p>詰まり: {update.blockers_text}</p> : null}
                          {update.help_needed_text ? <p>相談: {update.help_needed_text}</p> : null}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="research-progress-cell-stack">
                        {update?.needs_help ? <span className="research-progress-chip is-warning">help</span> : null}
                        {update?.wants_review_in_meeting ? <span className="research-progress-chip">会議</span> : null}
                        {row.missing_streak > 1 ? <span className="research-progress-chip is-danger">{row.missing_streak}週未提出</span> : null}
                        {row.risk_streak > 1 ? <span className="research-progress-chip is-warning">{row.risk_streak}週連続要注意</span> : null}
                      </div>
                    </td>
                    <td>
                      {update?.updated_at ? (
                        <div className="research-progress-cell-stack">
                          <span>{new Date(update.updated_at).toLocaleDateString("ja-JP")}</span>
                          {update.submitted_late ? <small>遅れて提出</small> : null}
                        </div>
                      ) : row.last_seen?.updated_at ? (
                        <div className="research-progress-cell-stack">
                          <span>{new Date(row.last_seen.updated_at).toLocaleDateString("ja-JP")}</span>
                          <small>前回提出あり</small>
                        </div>
                      ) : (
                        "未提出"
                      )}
                    </td>
                    {canReview ? (
                      <td>
                        {update ? (
                          <div className="research-progress-review-box">
                            <textarea
                              value={reviewDrafts[update.id] || ""}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [update.id]: event.target.value
                                }))
                              }
                              rows={3}
                              placeholder="介入メモや次回確認点を書く"
                            />
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              disabled={reviewSavingId === update.id}
                              onClick={() => void handleSaveReview(update.id)}
                            >
                              {reviewSavingId === update.id ? "保存中..." : "保存"}
                            </button>
                          </div>
                        ) : (
                          <span className="research-progress-muted-inline">未提出者は個別フォロー</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {reviewStatus ? <p className="form-status">{reviewStatus}</p> : null}
      </section>

      <section className="surface research-progress-history-card">
        <div className="research-progress-section-head">
          <div>
            <h2>履歴</h2>
            <p>週別とメンバー別で、どこで止まりやすいかを追います。</p>
          </div>
          <div className="research-progress-tab-row">
            <button
              type="button"
              className={`signature-filter-chip ${historyView === "week" ? "is-active" : ""}`}
              onClick={() => setHistoryView("week")}
            >
              週別
            </button>
            <button
              type="button"
              className={`signature-filter-chip ${historyView === "member" ? "is-active" : ""}`}
              onClick={() => setHistoryView("member")}
            >
              メンバー別
            </button>
          </div>
        </div>

        {historyView === "week" ? (
          <div className="research-progress-history-list">
            {historyByWeek.length ? (
              historyByWeek.map(([historyWeek, items]) => (
                <article key={historyWeek} className="research-progress-history-block">
                  <div className="research-progress-card-head">
                    <strong>{formatResearchWeekLabel(historyWeek)} 週</strong>
                    <span className="research-progress-chip">{items.length}件</span>
                  </div>
                  <div className="research-progress-history-items">
                    {items.map((item) => (
                      <div key={item.id} className="research-progress-history-item">
                        <span className={getResearchStatusClass(item.status)}>{getResearchStatusLabel(item.status)}</span>
                        <strong>{item.author?.display_name || item.author?.username || "member"}</strong>
                        <p>{item.summary_text}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">過去履歴はまだありません。</p>
            )}
          </div>
        ) : (
          <div className="research-progress-history-list">
            {historyByMember.length ? (
              historyByMember.map((entry) => (
                <article key={entry.key} className="research-progress-history-block">
                  <div className="research-progress-card-head">
                    <strong>{entry.author?.display_name || entry.author?.username || "member"}</strong>
                    <span className="research-progress-chip">{entry.items.length}週</span>
                  </div>
                  <div className="research-progress-history-items">
                    {entry.items.map((item) => (
                      <div key={item.id} className="research-progress-history-item">
                        <span>{formatResearchWeekLabel(item.week_start)}</span>
                        <span className={getResearchStatusClass(item.status)}>{getResearchStatusLabel(item.status)}</span>
                        <p>{item.summary_text}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <p className="muted">過去履歴はまだありません。</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

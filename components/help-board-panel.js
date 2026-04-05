"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { KeioBadge } from "@/components/keio-badge";

const CATEGORIES = ["ノート共有", "過去問交換", "空きコマ同行", "機材貸し借り", "引っ越し手伝い", "その他"];
const MODE_OPTIONS = ["お願い", "提供"];

const emptyForm = {
  title: "",
  category: "ノート共有",
  help_mode: "お願い",
  campus: "",
  reward_points: "0",
  body: ""
};

export function HelpBoardPanel({ initialItems, initialCategories, initialCampuses }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [editingDraft, setEditingDraft] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [economy, setEconomy] = useState(null);
  const [reviewedRequestIds, setReviewedRequestIds] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(currentSession);
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user?.id) {
      setEconomy(null);
      setReviewedRequestIds([]);
      return;
    }

    loadEconomySummary();
    loadFeedbackState();
  }, [session?.user?.id]);

  const categories = useMemo(() => uniq([...CATEGORIES, ...initialCategories, ...items.map((item) => item.category).filter(Boolean)]), [initialCategories, items]);
  const campuses = useMemo(() => uniq([...initialCampuses, ...items.map((item) => item.campus).filter(Boolean)]), [initialCampuses, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (campusFilter && item.campus !== campusFilter) return false;
      if (modeFilter && item.help_mode !== modeFilter) return false;

      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return true;

      return [item.title, item.category, item.help_mode, item.campus, item.body, item.profiles?.display_name, item.profiles?.username]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categoryFilter, campusFilter, items, modeFilter, query]);

  async function submitRequest(event) {
    event.preventDefault();
    if (!session?.user) {
      setStatus("書き込むにはログインが必要です。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/help-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "助け合い投稿の保存に失敗しました。");
      }

      setItems((current) => [result.item, ...current]);
      setForm(emptyForm);
      await loadEconomySummary();
      setStatus("助け合い投稿を追加しました。");
    } catch (error) {
      setStatus(error.message || "助け合い投稿の保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEditing(itemId) {
    if (!session?.user) return;

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/help-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify({ id: itemId, ...editingDraft })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "助け合い投稿の更新に失敗しました。");
      }

      setItems((current) => current.map((item) => (item.id === itemId ? result.item : item)));
      setEditingId("");
      setEditingDraft(emptyForm);
      setStatus("助け合い投稿を更新しました。");
    } catch (error) {
      setStatus(error.message || "助け合い投稿の更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setEditingDraft({
      title: item.title || "",
      category: item.category || CATEGORIES[0],
      help_mode: item.help_mode || MODE_OPTIONS[0],
      campus: item.campus || "",
      reward_points: `${item.reward_points || 0}`,
      body: item.body || ""
    });
    setStatus("自分の募集を編集中です。");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditingField(key, value) {
    setEditingDraft((current) => ({ ...current, [key]: value }));
  }

  async function loadEconomySummary() {
    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!currentSession?.user?.id) return;

      const { data, error } = await supabase.rpc("refresh_economy_account", {
        p_user_id: currentSession.user.id
      });

      if (error) {
        throw error;
      }

      const summaryRow = Array.isArray(data) ? data[0] : data;
      setEconomy(summaryRow || null);
    } catch (error) {
      setStatus(error.message || "ポイント状況を読み込めませんでした。");
    }
  }

  async function loadFeedbackState() {
    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!currentSession?.user?.id) return;

      const { data, error } = await supabase
        .from("help_request_feedback")
        .select("help_request_id")
        .eq("from_user_id", currentSession.user.id);

      if (error) {
        throw error;
      }

      setReviewedRequestIds((data || []).map((item) => item.help_request_id));
    } catch (error) {
      setStatus(error.message || "相互評価の状態を読み込めませんでした。");
    }
  }

  async function submitAction(itemId, action) {
    if (!session?.user) {
      setStatus("操作にはログインが必要です。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/help-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify({ id: itemId, action })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "助け合い投稿の更新に失敗しました。");
      }

      setItems((current) => current.map((item) => (item.id === itemId ? result.item : item)));

      if (action === "complete" || action === "stop" || action === "feedback") {
        await loadEconomySummary();
      }

      if (action === "feedback") {
        setReviewedRequestIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
      }

      if (action === "claim") {
        setStatus("募集を引き受けました。");
      } else if (action === "complete") {
        setStatus("助け合いを完了して、報酬ptを支払いました。");
      } else if (action === "stop") {
        setStatus("募集を停止しました。必要なら報酬ptは返金されています。");
      } else if (action === "feedback") {
        setStatus("相手にありがとう評価を送りました。");
      }
    } catch (error) {
      setStatus(error.message || "助け合い投稿の更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head class-board-hero">
        <div className="section-copy">
          <h1 className="page-title">助け合いボード</h1>
        </div>

        <div className="class-board-hero-stats" aria-label="助け合いボードの集計">
          <div className="stat-tile">
            <strong>{items.length}</strong>
            <span>募集の総数</span>
          </div>
          <div className="stat-tile">
            <strong>{categories.length}</strong>
            <span>カテゴリ</span>
          </div>
          <div className="stat-tile">
            <strong>{campuses.length || "—"}</strong>
            <span>対応キャンパス</span>
          </div>
        </div>
      </section>

      <section className="section-grid edge-board-main">
        <div className="edge-board-column">
          <div className="surface search-panel class-filter-panel">
            <div className="section-copy">
              <h2>募集を探す</h2>
            </div>

            {economy ? (
              <div className="economy-status-strip" aria-label="ポイント状況">
                <div className="economy-chip">
                  <strong>{economy.point_balance}</strong>
                  <span>保有pt</span>
                </div>
                <div className="economy-chip">
                  <strong>{economy.reputation_title}</strong>
                  <span>称号</span>
                </div>
              </div>
            ) : null}

            <div className="class-form-grid">
              <label className="field">
                <span>検索</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル、カテゴリ、本文" />
              </label>
              <label className="field">
                <span>カテゴリ</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="">すべて</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>種別</span>
                <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}>
                  <option value="">すべて</option>
                  {MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>キャンパス</span>
                <select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)}>
                  <option value="">すべて</option>
                  {campuses.map((campus) => (
                    <option key={campus} value={campus}>
                      {campus}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="stack-list edge-tip-list">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <article key={item.id} className="surface edge-tip-card">
                  {editingId === item.id ? (
                    <div className="form-stack class-inline-editor">
                      <div className="class-form-grid">
                        <label className="field">
                          <span>タイトル</span>
                          <input value={editingDraft.title} onChange={(event) => updateEditingField("title", event.target.value)} />
                        </label>
                        <label className="field">
                          <span>カテゴリ</span>
                          <select value={editingDraft.category} onChange={(event) => updateEditingField("category", event.target.value)}>
                            {CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>種別</span>
                          <select value={editingDraft.help_mode} onChange={(event) => updateEditingField("help_mode", event.target.value)}>
                            {MODE_OPTIONS.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>キャンパス</span>
                          <input value={editingDraft.campus} onChange={(event) => updateEditingField("campus", event.target.value)} />
                        </label>
                      </div>
                      <label className="field">
                        <span>内容</span>
                        <textarea rows="4" value={editingDraft.body} onChange={(event) => updateEditingField("body", event.target.value)} />
                      </label>
                      <p className="muted">報酬ptは投稿時に預ける方式です。変更したい時はいったん停止して出し直してください。</p>
                      <div className="hero-actions">
                        <button type="button" className="button button-primary" disabled={submitting} onClick={() => saveEditing(item.id)}>
                          {submitting ? "保存中..." : "保存"}
                        </button>
                        <button type="button" className="button button-ghost" onClick={() => setEditingId("")}>
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="class-course-head">
                        <div className="class-course-copy">
                          <div className="class-course-topline">
                            <span className={`pill ${item.help_mode === "提供" ? "published" : ""}`}>{item.help_mode}</span>
                            <span className="pill">{item.category || "その他"}</span>
                            <span className="pill">{item.status || "募集中"}</span>
                            {item.reward_points ? <span className="pill">{item.reward_points}pt</span> : null}
                            {item.campus ? <span className="pill">{item.campus}</span> : null}
                          </div>
                          <h3>{item.title}</h3>
                        </div>
                      </div>

                      <p className="class-note-body">{item.body}</p>
                      {item.accepted_helper ? (
                        <div className="class-reaction-head">
                          <div className="help-board-author">
                            <strong>{item.status === "完了" ? "担当" : "引受"}</strong>
                            <span>@{item.accepted_helper.username || item.accepted_helper.display_name || "guest"}</span>
                            <KeioBadge profile={item.accepted_helper} compact />
                          </div>
                          {item.status === "完了" && item.completed_at ? <span className="muted">{formatDate(item.completed_at)}</span> : null}
                        </div>
                      ) : null}
                      <div className="class-reaction-head">
                        <div className="help-board-author">
                          <strong>@{item.profiles?.username || item.profiles?.display_name || "guest"}</strong>
                          <KeioBadge profile={item.profiles} compact />
                        </div>
                        <span className="muted">{formatDate(item.updated_at || item.created_at)}</span>
                      </div>
                      {session?.user?.id === item.author_id ? (
                        <div className="hero-actions">
                          {item.status === "成立" ? (
                            <button type="button" className="button button-primary button-small" disabled={submitting} onClick={() => submitAction(item.id, "complete")}>
                              {submitting ? "処理中..." : "完了して支払う"}
                            </button>
                          ) : null}
                          {item.status !== "完了" ? (
                            <button type="button" className="button button-ghost button-small" disabled={submitting} onClick={() => submitAction(item.id, "stop")}>
                              {item.reward_escrowed ? "停止して返金" : "停止"}
                            </button>
                          ) : null}
                          <button type="button" className="button button-ghost button-small" onClick={() => startEditing(item)}>
                            編集
                          </button>
                        </div>
                      ) : null}
                      {session?.user?.id && session.user.id !== item.author_id && item.help_mode === "お願い" && item.status === "募集中" ? (
                        <div className="hero-actions">
                          <button type="button" className="button button-primary button-small" disabled={submitting} onClick={() => submitAction(item.id, "claim")}>
                            {submitting ? "処理中..." : "引き受ける"}
                          </button>
                        </div>
                      ) : null}
                      {session?.user?.id &&
                      item.status === "完了" &&
                      (session.user.id === item.author_id || session.user.id === item.accepted_helper_id) ? (
                        <div className="hero-actions">
                          {reviewedRequestIds.includes(item.id) ? (
                            <span className="muted">相互評価済み</span>
                          ) : (
                            <button type="button" className="button button-ghost button-small" disabled={submitting} onClick={() => submitAction(item.id, "feedback")}>
                              {submitting ? "処理中..." : "ありがとうを送る"}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </article>
              ))
            ) : (
              <div className="surface empty-state">
                <h3>まだ募集がありません</h3>
              </div>
            )}
          </div>
        </div>

        <div className="edge-board-column">
          <form className="surface search-panel form-stack edge-write-panel" onSubmit={submitRequest}>
            <div className="section-copy">
              <h2>助け合いを出す</h2>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>タイトル</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="現代社会理論のノートを見せてほしい" required />
              </label>
              <label className="field">
                <span>カテゴリ</span>
                <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>種別</span>
                <select value={form.help_mode} onChange={(event) => updateField("help_mode", event.target.value)}>
                  {MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>キャンパス</span>
                <input value={form.campus} onChange={(event) => updateField("campus", event.target.value)} placeholder="三田 / 日吉 / 湘南藤沢" />
              </label>
              <label className="field">
                <span>報酬pt</span>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={form.reward_points}
                  onChange={(event) => updateField("reward_points", event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            <label className="field">
              <span>内容</span>
              <textarea
                rows="6"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="何が必要か、いつ頃か、どんな条件かを短く具体的に。"
                required
              />
            </label>
            <p className="muted">お願いを出す時は、設定した報酬ptを先に預けます。提供募集では 0pt のまま使ってください。</p>

            <div className="hero-actions">
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "保存中..." : "書き込む"}
              </button>
              {!session?.user ? <span className="muted">投稿にはログインが必要です。</span> : null}
            </div>
            {status ? <p className="muted">{status}</p> : null}
          </form>
        </div>
      </section>
    </div>
  );
}

function uniq(values) {
  return [...new Set(values)];
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

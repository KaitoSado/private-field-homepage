"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { KeioBadge } from "@/components/keio-badge";

const CATEGORIES = ["ノート共有", "過去問交換", "空きコマ同行", "機材貸し借り", "引っ越し手伝い", "その他"];
const MODE_OPTIONS = ["お願い", "提供"];
const STATUS_OPTIONS = ["募集中", "成立", "停止中"];

const emptyForm = {
  title: "",
  category: "ノート共有",
  help_mode: "お願い",
  campus: "",
  status: "募集中",
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
      status: item.status || STATUS_OPTIONS[0],
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

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head class-board-hero">
        <div className="section-copy">
          <p className="eyebrow">Mutual Aid</p>
          <h1 className="page-title">助け合いボード</h1>
          <p>
            ノート共有、過去問交換、空きコマ同行、機材貸し借り、引っ越し手伝い。学内でちょっと助けてほしいこと、
            逆に提供できることをここに出してつなげます。
          </p>
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
              <p className="eyebrow">Browse</p>
              <h2>募集を探す</h2>
            </div>

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
                        <label className="field">
                          <span>状態</span>
                          <select value={editingDraft.status} onChange={(event) => updateEditingField("status", event.target.value)}>
                            {STATUS_OPTIONS.map((nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>
                                {nextStatus}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="field">
                        <span>内容</span>
                        <textarea rows="4" value={editingDraft.body} onChange={(event) => updateEditingField("body", event.target.value)} />
                      </label>
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
                            {item.campus ? <span className="pill">{item.campus}</span> : null}
                          </div>
                          <h3>{item.title}</h3>
                        </div>
                      </div>

                      <p className="class-note-body">{item.body}</p>
                      <div className="class-reaction-head">
                        <div className="help-board-author">
                          <strong>@{item.profiles?.username || item.profiles?.display_name || "guest"}</strong>
                          <KeioBadge profile={item.profiles} compact />
                        </div>
                        <span className="muted">{formatDate(item.updated_at || item.created_at)}</span>
                      </div>
                      {session?.user?.id === item.author_id ? (
                        <div className="hero-actions">
                          <button type="button" className="button button-ghost button-small" onClick={() => startEditing(item)}>
                            編集
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </article>
              ))
            ) : (
              <div className="surface empty-state">
                <h3>まだ募集がありません</h3>
                <p>最初の助け合い募集を書いて、この面を動かしてください。</p>
              </div>
            )}
          </div>
        </div>

        <div className="edge-board-column">
          <form className="surface search-panel form-stack edge-write-panel" onSubmit={submitRequest}>
            <div className="section-copy">
              <p className="eyebrow">Post</p>
              <h2>助け合いを出す</h2>
              <p className="muted">お願いでも提供でも出せます。学内向けの助け合いを、短く具体的に書いてください。</p>
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

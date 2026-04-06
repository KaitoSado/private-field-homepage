"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const CATEGORIES = ["学割", "無料", "助成", "食費", "交通", "ソフト", "住まい", "学内", "バイト", "その他"];

const emptyForm = {
  title: "",
  category: "学割",
  campus: "",
  link_url: "",
  body: ""
};

export function EdgeInfoBoard({ initialItems, initialCategories, initialCampuses }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [economy, setEconomy] = useState(null);
  const [votedTipIds, setVotedTipIds] = useState([]);
  const [votingTargetId, setVotingTargetId] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");

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
      setVotedTipIds([]);
      return;
    }

    loadEconomySummary();
  }, [session?.user?.id]);

  const categories = useMemo(() => uniq([...CATEGORIES, ...initialCategories, ...items.map((item) => item.category).filter(Boolean)]), [initialCategories, items]);
  const campuses = useMemo(() => uniq([...initialCampuses, ...items.map((item) => item.campus).filter(Boolean)]), [initialCampuses, items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (campusFilter && item.campus !== campusFilter) return false;

      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return true;

      return [item.title, item.category, item.campus, item.body, item.profiles?.display_name, item.profiles?.username]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categoryFilter, campusFilter, items, query]);

  async function submitTip(event) {
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

      const response = await fetch("/api/edge-tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "エッジ情報の保存に失敗しました。");
      }

      setItems((current) => [result.item, ...current]);
      setForm(emptyForm);
      setStatus("エッジ情報を追加しました。");
    } catch (error) {
      setStatus(error.message || "エッジ情報の保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadEconomySummary() {
    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!currentSession?.user?.id) return;

      const [{ data: refreshed, error: refreshError }, { data: votes, error: votesError }] = await Promise.all([
        supabase.rpc("refresh_economy_account", {
          p_user_id: currentSession.user.id
        }),
        supabase
          .from("helpful_votes")
          .select("target_type, target_id")
          .eq("voter_id", currentSession.user.id)
      ]);

      if (refreshError) {
        throw refreshError;
      }

      if (votesError) {
        throw votesError;
      }

      const summaryRow = Array.isArray(refreshed) ? refreshed[0] : refreshed;
      setEconomy(summaryRow || null);
      setVotedTipIds((votes || []).filter((vote) => vote.target_type === "edge_tip").map((vote) => vote.target_id));
    } catch (error) {
      setStatus(error.message || "ポイント状況を読み込めませんでした。");
    }
  }

  async function submitHelpfulVote(itemId) {
    if (!session?.user) {
      setStatus("役に立った投票にはログインが必要です。");
      return;
    }

    setVotingTargetId(itemId);
    setStatus("");

    try {
      const { data: result, error } = await supabase.rpc("cast_helpful_vote", {
        p_voter_id: session.user.id,
        p_target_type: "edge_tip",
        p_target_id: itemId
      });

      if (error) {
        const message = error.message || "役に立った投票に失敗しました。";

        if (message.includes("already voted")) {
          throw new Error("この投稿にはすでに投票しています。");
        }

        if (message.includes("no evaluation credits")) {
          throw new Error("今週の評価ポイントを使い切りました。");
        }

        if (message.includes("cannot vote for own content")) {
          throw new Error("自分の投稿には投票できません。");
        }

        if (message.includes("target not found")) {
          throw new Error("投票対象が見つかりません。");
        }

        throw new Error(message);
      }

      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                helpful_count: result.helpful_count ?? (item.helpful_count || 0) + 1
              }
            : item
        )
      );
      setEconomy(result.summary || null);
      setVotedTipIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
      setStatus(
        `役立ち票を1票送りました。投稿者に +${result.points_awarded || 0}pt / 貢献度+1 が加算されます。`
      );
    } catch (error) {
      setStatus(error.message || "役に立った投票に失敗しました。");
    } finally {
      setVotingTargetId("");
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head edge-board-hero">
        <div className="section-copy">
          <h1 className="page-title">大学生にとって地味に得する情報を集める</h1>
        </div>

        <div className="class-board-hero-stats edge-board-hero-stats" aria-label="エッジ情報の集計">
          <div className="stat-tile">
            <strong>{items.length}</strong>
            <span>集まった情報</span>
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
          <div className="surface search-panel edge-filter-panel">
            <div className="section-copy">
              <h2>エッジ情報を探す</h2>
            </div>

            {economy ? (
              <div className="economy-status-strip" aria-label="ポイント状況">
                <div className="economy-chip">
                  <strong>{economy.point_balance}</strong>
                  <span>保有pt</span>
                </div>
                <div className="economy-chip">
                  <strong>{economy.evaluation_credits}</strong>
                  <span>今週の評価票</span>
                </div>
                <div className="economy-chip">
                  <strong>{economy.reputation_title}</strong>
                  <span>称号</span>
                </div>
              </div>
            ) : null}

            {status && !economy ? <p className="muted">{status}</p> : null}

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
                  <div className="class-course-head">
                    <div className="class-course-copy">
                      <div className="class-course-topline">
                        <span className="pill published">{item.category || "その他"}</span>
                        {item.campus ? <span className="pill">{item.campus}</span> : null}
                      </div>
                      <h3>{item.title}</h3>
                    </div>

                    <div className="class-course-actions">
                      {item.link_url ? (
                        <Link href={item.link_url} className="button button-secondary" target="_blank" rel="noreferrer">
                          リンクを見る
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <p className="class-note-body">{item.body}</p>
                  <div className="helpful-action-row">
                    <span className="helpful-count-pill">{item.helpful_count || 0} 役に立った</span>
                    {session?.user?.id && session.user.id !== item.author_id ? (
                      <button
                        type="button"
                        className="button button-ghost button-small helpful-button"
                        disabled={votingTargetId === item.id || votedTipIds.includes(item.id) || economy?.evaluation_credits === 0}
                        onClick={() => submitHelpfulVote(item.id)}
                      >
                        {votedTipIds.includes(item.id) ? "投票済み" : votingTargetId === item.id ? "送信中..." : "役に立った"}
                      </button>
                    ) : null}
                  </div>
                  <div className="class-reaction-head">
                    <strong>@{item.profiles?.username || item.profiles?.display_name || "guest"}</strong>
                    <span className="muted">{formatDate(item.updated_at || item.created_at)}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="surface empty-state">
                <h3>まだ情報がありません</h3>
              </div>
            )}
          </div>
        </div>

        <div className="edge-board-column">
          <form className="surface search-panel form-stack edge-write-panel" onSubmit={submitTip}>
            <div className="section-copy">
              <h2>エッジ情報を書く</h2>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>タイトル</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Adobe が学生なら無料で使える" required />
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
                <span>キャンパス</span>
                <input value={form.campus} onChange={(event) => updateField("campus", event.target.value)} placeholder="三田 / 日吉 / 矢上" />
              </label>
              <label className="field">
                <span>リンク</span>
                <input value={form.link_url} onChange={(event) => updateField("link_url", event.target.value)} placeholder="https://..." />
              </label>
            </div>

            <label className="field">
              <span>内容</span>
              <textarea
                rows="10"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                maxLength={12000}
                placeholder="どういう条件で使えるか、どこから申し込むか、注意点があれば短く。"
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

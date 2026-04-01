"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const emptyForm = {
  title: "",
  excerpt: "",
  body: "",
  price_label: ""
};

export function SpecialArticlesPanel({
  initialItems,
  ownerProfile = null,
  backHref = "/apps",
  detailHrefBase = "/special-articles"
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canManageScopedArticles = ownerProfile ? session?.user?.id === ownerProfile.id : Boolean(session?.user);

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

  async function submitArticle(event) {
    event.preventDefault();
      if (!canManageScopedArticles) {
      setStatus("特別記事を書くにはログインが必要です。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/special-articles", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "特別記事の保存に失敗しました。");
      }

      setItems((current) => {
        if (editingId) {
          return current.map((item) => (item.id === editingId ? result.item : item));
        }
        return [result.item, ...current];
      });
      setForm(emptyForm);
      setEditingId("");
      setStatus(editingId ? "特別記事を更新しました。" : "特別記事を追加しました。");
    } catch (error) {
      setStatus(error.message || (editingId ? "特別記事の更新に失敗しました。" : "特別記事の保存に失敗しました。"));
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function beginEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      excerpt: item.excerpt || "",
      body: item.body || "",
      price_label: item.price_label || ""
    });
    setStatus("");
  }

  function resetComposer() {
    setEditingId("");
    setForm(emptyForm);
    setStatus("");
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head">
        <div className="surface feature-card special-articles-hero">
          <h1 className="page-title">特別記事</h1>
          <div className="hero-actions">
            <Link href={backHref} className="button button-secondary">
              戻る
            </Link>
            <Link href="/apps" className="button button-ghost">
              Apps
            </Link>
          </div>
        </div>
      </section>

      <section className="section-grid class-board-main">
        <div className="class-board-column">
          <div className="section-copy">
            <h2>特別記事の一覧</h2>
          </div>
          <div className="card-grid special-article-grid">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="special-article-item">
                  <Link
                    href={`${detailHrefBase}/${item.id}`}
                    className="surface feature-card signature-post-card-special special-article-card"
                  >
                    <div className="post-card-head">
                      <span>{formatDate(item.updated_at || item.created_at)}</span>
                      <span>{item.price_label || "Long-form"}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.excerpt || getPreview(item.body)}</p>
                    <div className="inline-meta special-article-card-meta">
                      <span>@{item.profiles?.username || item.profiles?.display_name || "author"}</span>
                      <span>続きを読む</span>
                    </div>
                  </Link>
                  {canManageScopedArticles && session?.user?.id === item.author_id ? (
                    <div className="special-article-card-actions">
                      <button type="button" className="button button-ghost" onClick={() => beginEdit(item)}>
                        編集
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="surface empty-state">
                <h3>まだ特別記事がありません</h3>
              </div>
            )}
          </div>
        </div>

        <div className="class-board-column">
          {ownerProfile && !canManageScopedArticles ? (
            <div className="surface search-panel form-stack class-write-panel">
              <div className="section-copy">
                <h2>閲覧中</h2>
              </div>
              <p className="status-text">このページでは {ownerProfile.display_name || ownerProfile.username} の特別記事だけを読めます。</p>
            </div>
          ) : (
            <form className="surface search-panel form-stack class-write-panel" onSubmit={submitArticle}>
              <div className="section-copy">
                <h2>{editingId ? "特別記事を編集" : "特別記事を書く"}</h2>
              </div>

              <label className="field">
                <span>タイトル</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
              </label>

              <label className="field">
                <span>見出し用の短い説明</span>
                <textarea
                  rows="3"
                  value={form.excerpt}
                  onChange={(event) => updateField("excerpt", event.target.value)}
                  placeholder="一覧で見せる短い紹介"
                />
              </label>

              <label className="field">
                <span>補足ラベル</span>
                <input
                  value={form.price_label}
                  onChange={(event) => updateField("price_label", event.target.value)}
                  placeholder="連載 / 補遺 / 長文"
                />
              </label>

              <label className="field">
                <span>本文</span>
                <textarea
                  rows="12"
                  value={form.body}
                  onChange={(event) => updateField("body", event.target.value)}
                  placeholder="ここに特別記事の本文を書きます"
                  required
                />
              </label>

              <div className="hero-actions">
                <button type="submit" className="button button-primary" disabled={submitting}>
                  {submitting ? "保存中..." : editingId ? "変更を保存する" : "特別記事を追加する"}
                </button>
                {editingId ? (
                  <button type="button" className="button button-secondary" onClick={resetComposer}>
                    キャンセル
                  </button>
                ) : null}
              </div>
              <p className={`status-text ${status ? "status-success" : ""}`}>
                {status ||
                  (canManageScopedArticles
                    ? "このページの特別記事を編集できます。"
                    : session?.user
                      ? "ログイン中です。そのまま書き込めます。"
                      : "閲覧は誰でもできます。書くにはログインしてください。")}
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function getPreview(text, limit = 180) {
  const source = `${text || ""}`.trim();
  if (!source) return "";
  if (source.length <= limit) return source;
  return `${source.slice(0, limit).trimEnd()}…`;
}

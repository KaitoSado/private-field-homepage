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

export function SpecialArticlesPanel({ initialItems }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!session?.user) {
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "特別記事の保存に失敗しました。");
      }

      setItems((current) => [result.item, ...current]);
      setForm(emptyForm);
      setStatus("特別記事を追加しました。");
    } catch (error) {
      setStatus(error.message || "特別記事の保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head">
        <div className="surface feature-card special-articles-hero">
          <p className="eyebrow">Long-form collection</p>
          <h1 className="page-title">特別記事</h1>
          <p>
            通常の記事とは少し距離を置いて、深くまとめた長文や読みものを置く面です。
            まとまった記録や長めのテキストをここに蓄積していけます。
          </p>
          <div className="hero-actions">
            <Link href="/@kaito-sado" className="button button-secondary">
              公開ページへ戻る
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
            <p className="eyebrow">Collection</p>
            <h2>特別記事の一覧</h2>
          </div>
          <div className="card-grid special-article-grid">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={`/special-articles/${item.id}`}
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
              ))
            ) : (
              <div className="surface empty-state">
                <h3>まだ特別記事がありません</h3>
                <p>最初の1本を書いて、この面を動かし始めてください。</p>
              </div>
            )}
          </div>
        </div>

        <div className="class-board-column">
          <form className="surface search-panel form-stack class-write-panel" onSubmit={submitArticle}>
            <div className="section-copy">
              <p className="eyebrow">Write</p>
              <h2>特別記事を書く</h2>
              <p className="muted">通常記事より長めの読みものや、限定感のあるテキストをここに追加します。</p>
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
                {submitting ? "保存中..." : "特別記事を追加する"}
              </button>
            </div>
            <p className={`status-text ${status ? "status-success" : ""}`}>
              {status || (session?.user ? "ログイン中です。そのまま書き込めます。" : "閲覧は誰でもできます。書くにはログインしてください。")}
            </p>
          </form>
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

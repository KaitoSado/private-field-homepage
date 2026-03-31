"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const emptyForm = {
  course_name: "",
  instructor: "",
  campus: "",
  term_label: "",
  weekday: "",
  period_label: "",
  body: ""
};

const weekdays = ["", "月", "火", "水", "木", "金", "土", "日"];

export function ClassBoardPanel({ initialItems, initialCampuses, initialTerms }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [weekdayFilter, setWeekdayFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");

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

  const campuses = useMemo(() => uniq([...initialCampuses, ...items.map((item) => item.campus).filter(Boolean)]), [initialCampuses, items]);
  const terms = useMemo(() => uniq([...initialTerms, ...items.map((item) => item.term_label).filter(Boolean)]), [initialTerms, items]);

  const filteredItems = items.filter((item) => {
    if (weekdayFilter && item.weekday !== weekdayFilter) return false;
    if (campusFilter && item.campus !== campusFilter) return false;
    if (termFilter && item.term_label !== termFilter) return false;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    const haystack = [
      item.course_name,
      item.instructor,
      item.campus,
      item.term_label,
      item.weekday,
      item.period_label,
      item.body,
      item.profiles?.display_name,
      item.profiles?.username
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  async function submitNote(event) {
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

      const response = await fetch("/api/class-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "授業情報の保存に失敗しました。");
      }

      setItems((current) => [result.item, ...current]);
      setForm(emptyForm);
      setStatus("授業情報を追加しました。");
    } catch (error) {
      setStatus(error.message || "授業情報の保存に失敗しました。");
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
        <div className="section-copy">
          <p className="eyebrow">Class Board</p>
          <h1 className="page-title">授業情報を書き込んだり、観たりする</h1>
          <p>
            授業名、担当、曜日、時限、キャンパス、受けてみた感想をざっくり残せる共有ボードです。
            まずはゆるいメモとして溜めていけるようにしています。
          </p>
        </div>
        <form className="surface search-panel form-stack" onSubmit={submitNote}>
          <div className="class-form-grid">
            <label className="field">
              <span>授業名</span>
              <input value={form.course_name} onChange={(event) => updateField("course_name", event.target.value)} required />
            </label>
            <label className="field">
              <span>担当</span>
              <input value={form.instructor} onChange={(event) => updateField("instructor", event.target.value)} />
            </label>
            <label className="field">
              <span>学期</span>
              <input
                value={form.term_label}
                onChange={(event) => updateField("term_label", event.target.value)}
                placeholder="2026 春"
              />
            </label>
            <label className="field">
              <span>曜日</span>
              <select value={form.weekday} onChange={(event) => updateField("weekday", event.target.value)}>
                {weekdays.map((day) => (
                  <option key={day || "none"} value={day}>
                    {day || "未設定"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>時限</span>
              <input
                value={form.period_label}
                onChange={(event) => updateField("period_label", event.target.value)}
                placeholder="2限 / 5限"
              />
            </label>
            <label className="field">
              <span>キャンパス</span>
              <input value={form.campus} onChange={(event) => updateField("campus", event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>メモ</span>
            <textarea
              rows="5"
              value={form.body}
              onChange={(event) => updateField("body", event.target.value)}
              placeholder="授業の雰囲気、課題量、面白かった点、注意点など"
              required
            />
          </label>

          <div className="hero-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? "保存中..." : "授業情報を書く"}
            </button>
          </div>
          <p className={`status-text ${status ? "status-success" : ""}`}>
            {status || (session?.user ? "ログイン中です。そのまま書き込めます。" : "閲覧は誰でもできます。書き込むにはログインしてください。")}
          </p>
        </form>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <p className="eyebrow">Browse</p>
          <h2>授業情報を見る</h2>
        </div>
        <div className="surface search-panel class-filter-panel">
          <div className="class-form-grid">
            <label className="field">
              <span>検索</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="授業名、担当、メモ" />
            </label>
            <label className="field">
              <span>曜日</span>
              <select value={weekdayFilter} onChange={(event) => setWeekdayFilter(event.target.value)}>
                {weekdays.map((day) => (
                  <option key={day || "all"} value={day}>
                    {day || "すべて"}
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
            <label className="field">
              <span>学期</span>
              <select value={termFilter} onChange={(event) => setTermFilter(event.target.value)}>
                <option value="">すべて</option>
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="stack-list class-note-list">
          {filteredItems.length ? (
            filteredItems.map((item) => (
              <article key={item.id} className="surface class-note-card">
                <div className="class-note-head">
                  <div>
                    <h3>{item.course_name}</h3>
                    <p className="muted">
                      {item.instructor || "担当未設定"}
                      {item.profiles?.username ? ` · by @${item.profiles.username}` : ""}
                    </p>
                  </div>
                  <div className="inline-meta">
                    {item.term_label ? <span>{item.term_label}</span> : null}
                    {item.weekday ? <span>{item.weekday}</span> : null}
                    {item.period_label ? <span>{item.period_label}</span> : null}
                    {item.campus ? <span>{item.campus}</span> : null}
                  </div>
                </div>
                <p className="class-note-body">{item.body}</p>
                <div className="inline-meta">
                  <span>{formatDate(item.updated_at || item.created_at)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="surface empty-state">
              <h3>まだ授業情報がありません</h3>
              <p>最初の1件を書いて、このアプリを動かし始めてください。</p>
            </div>
          )}
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
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

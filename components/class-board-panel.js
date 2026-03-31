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
  const [expandedCourse, setExpandedCourse] = useState("");

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

  const groupedCourses = useMemo(() => {
    const groups = new Map();

    for (const item of items) {
      const normalizedCourseName = `${item.course_name || ""}`.trim();
      if (!normalizedCourseName) continue;

      const key = normalizedCourseName.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          courseName: normalizedCourseName,
          items: []
        });
      }

      groups.get(key).items.push(item);
    }

    return [...groups.values()]
      .map((group) => {
        const sortedItems = [...group.items].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
        const latest = sortedItems[0];
        const instructors = uniq(sortedItems.map((item) => item.instructor).filter(Boolean));
        const campusesForCourse = uniq(sortedItems.map((item) => item.campus).filter(Boolean));
        const termsForCourse = uniq(sortedItems.map((item) => item.term_label).filter(Boolean));
        const weekdaysForCourse = uniq(sortedItems.map((item) => item.weekday).filter(Boolean));
        const periods = uniq(sortedItems.map((item) => item.period_label).filter(Boolean));

        return {
          ...group,
          items: sortedItems,
          latest,
          instructors,
          campuses: campusesForCourse,
          terms: termsForCourse,
          weekdays: weekdaysForCourse,
          periods
        };
      })
      .sort((a, b) => new Date(b.latest?.updated_at || b.latest?.created_at || 0) - new Date(a.latest?.updated_at || a.latest?.created_at || 0));
  }, [items]);

  const filteredCourses = groupedCourses.filter((course) => {
    if (weekdayFilter && !course.weekdays.includes(weekdayFilter)) return false;
    if (campusFilter && !course.campuses.includes(campusFilter)) return false;
    if (termFilter && !course.terms.includes(termFilter)) return false;

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    const haystack = [
      course.courseName,
      course.instructors.join(" "),
      course.campuses.join(" "),
      course.terms.join(" "),
      course.weekdays.join(" "),
      course.periods.join(" "),
      ...course.items.map((item) => [item.body, item.profiles?.display_name, item.profiles?.username].join(" "))
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
      setExpandedCourse(`${result.item.course_name || ""}`.trim().toLowerCase());
      setForm(emptyForm);
      setStatus("授業への反応を追加しました。");
    } catch (error) {
      setStatus(error.message || "授業情報の保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startReply(course) {
    setForm((current) => ({
      ...current,
      course_name: course.courseName,
      instructor: current.instructor || course.instructors[0] || "",
      campus: current.campus || course.campuses[0] || "",
      term_label: current.term_label || course.terms[0] || "",
      weekday: current.weekday || course.weekdays[0] || "",
      period_label: current.period_label || course.periods[0] || ""
    }));
    setExpandedCourse(course.key);
    setStatus(`「${course.courseName}」への反応を書く準備ができました。`);
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head class-board-hero">
        <div className="section-copy">
          <p className="eyebrow">Class Board</p>
          <h1 className="page-title">授業名から、みんなの反応を見る</h1>
          <p>
            まず授業ごとの面があって、その中に受講した人の感想やメモが積み上がっていく形にしています。
            ドイツ語や現代社会理論のように、同じ授業に対する反応をまとめて追えるボードです。
          </p>
        </div>

        <div className="surface class-board-hero-panel">
          <div className="class-board-stat-grid">
            <div className="stat-tile">
              <strong>{groupedCourses.length}</strong>
              <span>授業スレッド</span>
            </div>
            <div className="stat-tile">
              <strong>{items.length}</strong>
              <span>反応の総数</span>
            </div>
            <div className="stat-tile">
              <strong>{campuses.length || "—"}</strong>
              <span>キャンパス</span>
            </div>
          </div>

          <div className="class-board-hero-copy">
            <p className="eyebrow">How it works</p>
            <p>授業名で面を見つけて、その授業に対する雰囲気、負荷、面白さ、注意点を短く重ねていきます。</p>
          </div>
        </div>
      </section>

      <section className="section-grid class-board-main">
        <div className="class-board-column">
          <div className="surface search-panel class-filter-panel">
            <div className="section-copy">
              <p className="eyebrow">Browse</p>
              <h2>授業から探す</h2>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>検索</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="授業名、担当、感想" />
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

          <div className="stack-list class-course-list">
            {filteredCourses.length ? (
              filteredCourses.map((course) => {
                const isExpanded = expandedCourse === course.key;
                const previewItems = isExpanded ? course.items : course.items.slice(0, 2);

                return (
                  <article key={course.key} className="surface class-course-card">
                    <div className="class-course-head">
                      <div className="class-course-copy">
                        <div className="class-course-topline">
                          <span className="pill published">{course.items.length} reactions</span>
                          {course.latest?.updated_at || course.latest?.created_at ? (
                            <span className="muted">last updated {formatDate(course.latest.updated_at || course.latest.created_at)}</span>
                          ) : null}
                        </div>
                        <h3>{course.courseName}</h3>
                        <p className="muted">
                          {course.instructors[0] || "担当未設定"}
                          {course.instructors.length > 1 ? ` ほか ${course.instructors.length - 1}` : ""}
                        </p>
                      </div>

                      <div className="class-course-actions">
                        <button type="button" className="button button-ghost" onClick={() => startReply(course)}>
                          この授業に書く
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setExpandedCourse(isExpanded ? "" : course.key)}
                        >
                          {isExpanded ? "閉じる" : "反応を見る"}
                        </button>
                      </div>
                    </div>

                    <div className="inline-meta class-course-meta">
                      {course.terms[0] ? <span>{course.terms[0]}</span> : null}
                      {course.weekdays[0] ? <span>{course.weekdays.join(" / ")}</span> : null}
                      {course.periods[0] ? <span>{course.periods.join(" / ")}</span> : null}
                      {course.campuses[0] ? <span>{course.campuses.join(" / ")}</span> : null}
                    </div>

                    <div className="stack-list class-reaction-list">
                      {previewItems.map((item) => (
                        <div key={item.id} className="class-reaction-card">
                          <div className="class-reaction-head">
                            <strong>@{item.profiles?.username || item.profiles?.display_name || "guest"}</strong>
                            <span className="muted">{formatDate(item.updated_at || item.created_at)}</span>
                          </div>
                          <p className="class-note-body">{item.body}</p>
                        </div>
                      ))}
                    </div>

                    {!isExpanded && course.items.length > 2 ? (
                      <button type="button" className="button button-ghost class-expand-button" onClick={() => setExpandedCourse(course.key)}>
                        さらに {course.items.length - 2} 件の反応を見る
                      </button>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="surface empty-state">
                <h3>条件に合う授業がありません</h3>
                <p>検索条件をゆるめるか、最初の反応を書いてスレッドを作ってください。</p>
              </div>
            )}
          </div>
        </div>

        <div className="class-board-column">
          <form className="surface search-panel form-stack class-write-panel" onSubmit={submitNote}>
            <div className="section-copy">
              <p className="eyebrow">Write</p>
              <h2>授業への反応を書く</h2>
              <p className="muted">すでにある授業にも、新しい授業にもそのまま書き込めます。</p>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>授業名</span>
                <input
                  list="class-course-options"
                  value={form.course_name}
                  onChange={(event) => updateField("course_name", event.target.value)}
                  placeholder="ドイツ語 / 現代社会理論"
                  required
                />
                <datalist id="class-course-options">
                  {groupedCourses.map((course) => (
                    <option key={course.key} value={course.courseName} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>担当</span>
                <input value={form.instructor} onChange={(event) => updateField("instructor", event.target.value)} />
              </label>
              <label className="field">
                <span>学期</span>
                <input value={form.term_label} onChange={(event) => updateField("term_label", event.target.value)} placeholder="2026 春" />
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
                <input value={form.period_label} onChange={(event) => updateField("period_label", event.target.value)} placeholder="2限 / 5限" />
              </label>
              <label className="field">
                <span>キャンパス</span>
                <input value={form.campus} onChange={(event) => updateField("campus", event.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>反応</span>
              <textarea
                rows="6"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="授業の雰囲気、課題量、発表の有無、面白かった点、受ける前に知りたかったこと"
                required
              />
            </label>

            <div className="hero-actions">
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "保存中..." : "反応を追加する"}
              </button>
            </div>
            <p className={`status-text ${status ? "status-success" : ""}`}>
              {status || (session?.user ? "ログイン中です。そのまま書き込めます。" : "閲覧は誰でもできます。書き込むにはログインしてください。")}
            </p>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const emptyForm = {
  course_name: "",
  course_scope: "",
  instructor: "",
  campus: "",
  term_label: "",
  weekday: "",
  period_label: "",
  easy_score: "",
  s_score: "",
  evaluation_type: "",
  attendance_policy: "",
  assignment_load: "",
  quality_score: "",
  verdict_grade: "",
  body: ""
};

const weekdays = ["", "月", "火", "水", "木", "金", "土", "日"];
const scopeOptions = ["", "学部", "大学院", "共通"];
const scoreOptions = ["", "1", "2", "3", "4", "5"];
const evaluationOptions = ["", "試験", "レポート", "試験+レポート", "発表", "その他"];
const attendanceOptions = ["", "あり", "なし", "ときどき"];
const verdictOptions = ["", "S", "A", "B", "C", "D"];

export function ClassBoardPanel({ initialItems, initialCampuses, initialTerms }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingNoteId, setEditingNoteId] = useState("");
  const [editingDraft, setEditingDraft] = useState(emptyForm);
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
        const scopes = uniq(sortedItems.map((item) => item.course_scope).filter(Boolean));
        const campusesForCourse = uniq(sortedItems.map((item) => item.campus).filter(Boolean));
        const termsForCourse = uniq(sortedItems.map((item) => item.term_label).filter(Boolean));
        const weekdaysForCourse = uniq(sortedItems.map((item) => item.weekday).filter(Boolean));
        const periods = uniq(sortedItems.map((item) => item.period_label).filter(Boolean));

        return {
          ...group,
          items: sortedItems,
          latest,
          instructors,
          scopes,
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

  function updateEditingField(key, value) {
    setEditingDraft((current) => ({ ...current, [key]: value }));
  }

  function startReply(course) {
    setForm((current) => ({
      ...current,
      course_name: course.courseName,
      course_scope: current.course_scope || course.scopes[0] || "",
      instructor: current.instructor || course.instructors[0] || "",
      campus: current.campus || course.campuses[0] || "",
      term_label: current.term_label || course.terms[0] || "",
      weekday: current.weekday || course.weekdays[0] || "",
      period_label: current.period_label || course.periods[0] || "",
      easy_score: current.easy_score || "",
      s_score: current.s_score || "",
      evaluation_type: current.evaluation_type || "",
      attendance_policy: current.attendance_policy || "",
      assignment_load: current.assignment_load || "",
      quality_score: current.quality_score || "",
      verdict_grade: current.verdict_grade || ""
    }));
    setExpandedCourse(course.key);
    setStatus(`「${course.courseName}」への反応を書く準備ができました。`);
  }

  function startEditing(item) {
    setEditingNoteId(item.id);
    setEditingDraft({
      course_name: item.course_name || "",
      course_scope: item.course_scope || "",
      instructor: item.instructor || "",
      campus: item.campus || "",
      term_label: item.term_label || "",
      weekday: item.weekday || "",
      period_label: item.period_label || "",
      easy_score: item.easy_score ? String(item.easy_score) : "",
      s_score: item.s_score ? String(item.s_score) : "",
      evaluation_type: item.evaluation_type || "",
      attendance_policy: item.attendance_policy || "",
      assignment_load: item.assignment_load ? String(item.assignment_load) : "",
      quality_score: item.quality_score ? String(item.quality_score) : "",
      verdict_grade: item.verdict_grade || "",
      body: item.body || ""
    });
    setExpandedCourse(`${item.course_name || ""}`.trim().toLowerCase());
    setStatus("自分の反応を編集中です。");
  }

  function cancelEditing() {
    setEditingNoteId("");
    setEditingDraft(emptyForm);
    setStatus("");
  }

  async function saveEditingNote(noteId) {
    if (!session?.user) return;

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/class-notes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify({ id: noteId, ...editingDraft })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "授業情報の更新に失敗しました。");
      }

      setItems((current) => current.map((item) => (item.id === noteId ? result.item : item)));
      setEditingNoteId("");
      setEditingDraft(emptyForm);
      setStatus("反応を更新しました。");
    } catch (error) {
      setStatus(error.message || "授業情報の更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head class-board-hero">
        <div className="section-copy">
          <h1 className="page-title">教員を裁け！地獄の裏シラバス</h1>
        </div>

        <div className="class-board-hero-stats" aria-label="授業情報の集計">
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
      </section>

      <section className="section-grid class-board-main">
        <div className="class-board-column">
          <div className="surface search-panel class-filter-panel">
            <div className="section-copy">
              <h2>被告の授業を探す</h2>
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

                return (
                  <article key={course.key} className="surface class-course-card">
                    <div className="class-course-head">
                      <div className="class-course-copy">
                        <div className="class-course-topline">
                          <span className="pill published">{course.items.length} reactions</span>
                          {course.scopes[0] ? <span className="pill">{course.scopes.join(" / ")}</span> : null}
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
                      {course.weekdays[0] ? <span>{course.weekdays.join(" / ")}</span> : null}
                      {course.periods[0] ? <span>{course.periods.join(" / ")}</span> : null}
                      {course.campuses[0] ? <span>{course.campuses[0]}</span> : null}
                    </div>

                    {isExpanded ? (
                      <div className="stack-list class-reaction-list">
                        {course.items.map((item) => (
                          <div key={item.id} className="class-reaction-card">
                            {editingNoteId === item.id ? (
                              <div className="form-stack class-inline-editor">
                                <div className="class-form-grid">
                                  <label className="field">
                                    <span>授業名</span>
                                    <input value={editingDraft.course_name} onChange={(event) => updateEditingField("course_name", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>区分</span>
                                    <select value={editingDraft.course_scope} onChange={(event) => updateEditingField("course_scope", event.target.value)}>
                                      {scopeOptions.map((scope) => (
                                        <option key={scope || "none"} value={scope}>
                                          {scope || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>担当</span>
                                    <input value={editingDraft.instructor} onChange={(event) => updateEditingField("instructor", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>学期</span>
                                    <input value={editingDraft.term_label} onChange={(event) => updateEditingField("term_label", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>曜日</span>
                                    <select value={editingDraft.weekday} onChange={(event) => updateEditingField("weekday", event.target.value)}>
                                      {weekdays.map((day) => (
                                        <option key={day || "none"} value={day}>
                                          {day || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>時限</span>
                                    <input value={editingDraft.period_label} onChange={(event) => updateEditingField("period_label", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>キャンパス</span>
                                    <input value={editingDraft.campus} onChange={(event) => updateEditingField("campus", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>楽単度</span>
                                    <select value={editingDraft.easy_score} onChange={(event) => updateEditingField("easy_score", event.target.value)}>
                                      {scoreOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>S単度</span>
                                    <select value={editingDraft.s_score} onChange={(event) => updateEditingField("s_score", event.target.value)}>
                                      {scoreOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>試験/レポ</span>
                                    <select value={editingDraft.evaluation_type} onChange={(event) => updateEditingField("evaluation_type", event.target.value)}>
                                      {evaluationOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>出欠</span>
                                    <select value={editingDraft.attendance_policy} onChange={(event) => updateEditingField("attendance_policy", event.target.value)}>
                                      {attendanceOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>課題量</span>
                                    <select value={editingDraft.assignment_load} onChange={(event) => updateEditingField("assignment_load", event.target.value)}>
                                      {scoreOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>授業の質</span>
                                    <select value={editingDraft.quality_score} onChange={(event) => updateEditingField("quality_score", event.target.value)}>
                                      {scoreOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>判決</span>
                                    <select value={editingDraft.verdict_grade} onChange={(event) => updateEditingField("verdict_grade", event.target.value)}>
                                      {verdictOptions.map((option) => (
                                        <option key={option || "none"} value={option}>
                                          {option || "未設定"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                                <label className="field">
                                  <span>反応</span>
                                  <textarea rows="4" value={editingDraft.body} onChange={(event) => updateEditingField("body", event.target.value)} />
                                </label>
                                <div className="hero-actions">
                                  <button type="button" className="button button-primary" disabled={submitting} onClick={() => saveEditingNote(item.id)}>
                                    {submitting ? "保存中..." : "保存"}
                                  </button>
                                  <button type="button" className="button button-ghost" onClick={cancelEditing}>
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="class-reaction-head">
                                  <strong>@{item.profiles?.username || item.profiles?.display_name || "guest"}</strong>
                                  <span className="muted">{formatDate(item.updated_at || item.created_at)}</span>
                                </div>
                                <div className="class-score-strip">
                                  {renderTextPill("区分", item.course_scope)}
                                  {renderScorePill("楽単度", item.easy_score)}
                                  {renderScorePill("S単度", item.s_score)}
                                  {renderTextPill("試験/レポ", item.evaluation_type)}
                                  {renderTextPill("出欠", item.attendance_policy)}
                                  {renderScorePill("課題量", item.assignment_load)}
                                  {renderScorePill("授業の質", item.quality_score)}
                                  {renderTextPill("判決", item.verdict_grade)}
                                </div>
                                <p className="class-note-body">{item.body}</p>
                                {session?.user?.id === item.author_id ? (
                                  <div className="hero-actions">
                                    <button type="button" className="button button-ghost button-small" onClick={() => startEditing(item)}>
                                      編集
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!isExpanded && course.items.length > 0 ? (
                      <button type="button" className="button button-ghost class-expand-button" onClick={() => setExpandedCourse(course.key)}>
                        反応を見る
                      </button>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="surface empty-state">
                <h3>条件に合う授業がありません</h3>
              </div>
            )}
          </div>
        </div>

        <div className="class-board-column">
          <form className="surface search-panel form-stack class-write-panel" onSubmit={submitNote}>
            <div className="section-copy">
              <h2>判決を書く</h2>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>授業名</span>
                <input
                  list="class-course-options"
                  value={form.course_name}
                  onChange={(event) => updateField("course_name", event.target.value)}
                  placeholder="ドイツ語 / 現代社会理論 / 量子情報特論"
                  required
                />
                <datalist id="class-course-options">
                  {groupedCourses.map((course) => (
                    <option key={course.key} value={course.courseName} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>区分</span>
                <select value={form.course_scope} onChange={(event) => updateField("course_scope", event.target.value)}>
                  {scopeOptions.map((scope) => (
                    <option key={scope || "none"} value={scope}>
                      {scope || "未設定"}
                    </option>
                  ))}
                </select>
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
              <label className="field">
                <span>楽単度</span>
                <select value={form.easy_score} onChange={(event) => updateField("easy_score", event.target.value)}>
                  {scoreOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>S単度</span>
                <select value={form.s_score} onChange={(event) => updateField("s_score", event.target.value)}>
                  {scoreOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>試験/レポ</span>
                <select value={form.evaluation_type} onChange={(event) => updateField("evaluation_type", event.target.value)}>
                  {evaluationOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>出欠</span>
                <select value={form.attendance_policy} onChange={(event) => updateField("attendance_policy", event.target.value)}>
                  {attendanceOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>課題量</span>
                <select value={form.assignment_load} onChange={(event) => updateField("assignment_load", event.target.value)}>
                  {scoreOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>授業の質</span>
                <select value={form.quality_score} onChange={(event) => updateField("quality_score", event.target.value)}>
                  {scoreOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>判決</span>
                <select value={form.verdict_grade} onChange={(event) => updateField("verdict_grade", event.target.value)}>
                  {verdictOptions.map((option) => (
                    <option key={option || "none"} value={option}>
                      {option || "未設定"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>判決メモ</span>
              <textarea
                rows="6"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="授業の雰囲気、負荷、発表の有無、地獄度、救いの有無など"
                required
              />
            </label>

            <div className="hero-actions">
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "記録中..." : "判決を追加する"}
              </button>
            </div>
            <p className={`status-text ${status ? "status-success" : ""}`}>
              {status || (session?.user ? "ログイン中です。そのまま裁けます。" : "閲覧は誰でもできます。裁くにはログインしてください。")}
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

function renderScorePill(label, value) {
  if (!value) return null;
  return (
    <span className="class-score-pill" key={label}>
      <strong>{label}</strong>
      <span>{value}/5</span>
    </span>
  );
}

function renderTextPill(label, value) {
  if (!value) return null;
  return (
    <span className="class-score-pill" key={label}>
      <strong>{label}</strong>
      <span>{value}</span>
    </span>
  );
}

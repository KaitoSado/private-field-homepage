"use client";

import { useEffect, useMemo, useState } from "react";
import { KeioBadge } from "@/components/keio-badge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const ROOM_OPTIONS = [
  { value: "呪詛ログ", copy: "研究、指導、生活、就活。しんどさをそのまま吐き出す場所。" },
  { value: "祈祷室", copy: "発表前、締切前、面接前。祈ってほしいことを置く場所。" },
  { value: "院生ロビー", copy: "雑談、近況、ゆるい相談。とりあえず誰かとつながる場所。" },
  { value: "一緒に見る", copy: "アニメ、映画、ゲーム、作業通話の募集を書く場所。" },
  { value: "生存確認", copy: "起きた、ご飯食べた、帰宅した、くらいの軽い記録。" }
];

const VIBE_OPTIONS = ["吐き出したい", "祈ってほしい", "雑談したい", "募集したい", "生存報告"];

const emptyForm = {
  room: ROOM_OPTIONS[0].value,
  vibe: VIBE_OPTIONS[0],
  title: "",
  timing_label: "",
  body: ""
};

export function RitualBoardPanel({ initialItems, initialRooms }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [editingDraft, setEditingDraft] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [vibeFilter, setVibeFilter] = useState("");

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

  const rooms = useMemo(
    () => uniq([...ROOM_OPTIONS.map((room) => room.value), ...initialRooms, ...items.map((item) => item.room).filter(Boolean)]),
    [initialRooms, items]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (roomFilter && item.room !== roomFilter) return false;
      if (vibeFilter && item.vibe !== vibeFilter) return false;

      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return true;

      return [item.title, item.room, item.vibe, item.timing_label, item.body, item.profiles?.display_name, item.profiles?.username]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [items, query, roomFilter, vibeFilter]);

  async function submitPost(event) {
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

      const response = await fetch("/api/ritual-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "書き込みに失敗しました。");
      }

      setItems((current) => [result.item, ...current]);
      setForm(emptyForm);
      setStatus("書き込みを追加しました。");
    } catch (error) {
      setStatus(error.message || "書き込みに失敗しました。");
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

      const response = await fetch("/api/ritual-posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify({ id: itemId, ...editingDraft })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "更新に失敗しました。");
      }

      setItems((current) => current.map((item) => (item.id === itemId ? result.item : item)));
      setEditingId("");
      setEditingDraft(emptyForm);
      setStatus("書き込みを更新しました。");
    } catch (error) {
      setStatus(error.message || "更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setEditingDraft({
      room: item.room || ROOM_OPTIONS[0].value,
      vibe: item.vibe || VIBE_OPTIONS[0],
      title: item.title || "",
      timing_label: item.timing_label || "",
      body: item.body || ""
    });
    setStatus("自分の書き込みを編集中です。");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditingField(key, value) {
    setEditingDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head ritual-board-hero">
        <div className="section-copy">
          <p className="eyebrow">Grad sanctuary</p>
          <h1 className="page-title">祈祷と呪詛</h1>
          <p>
            慶應大学院生のための、半分避難所で半分ロビーな待合室です。愚痴る、祈ってもらう、雑談する、
            一緒にアニメやゲームを見る人を募る、生存確認だけ置く。重すぎず軽すぎず、気配をつなぐ場として使えます。
          </p>
        </div>

        <div className="class-board-hero-stats ritual-board-hero-stats" aria-label="祈祷と呪詛の集計">
          <div className="stat-tile">
            <strong>{items.length}</strong>
            <span>流れている気配</span>
          </div>
          <div className="stat-tile">
            <strong>{rooms.length}</strong>
            <span>部屋</span>
          </div>
          <div className="stat-tile">
            <strong>{VIBE_OPTIONS.length}</strong>
            <span>空気感</span>
          </div>
        </div>
      </section>

      <section className="surface ritual-room-strip">
        {ROOM_OPTIONS.map((room) => (
          <article key={room.value} className={`ritual-room-card ${roomFilter === room.value ? "is-active" : ""}`}>
            <button type="button" className="ritual-room-toggle" onClick={() => setRoomFilter((current) => (current === room.value ? "" : room.value))}>
              <strong>{room.value}</strong>
              <span>{room.copy}</span>
            </button>
          </article>
        ))}
      </section>

      <section className="section-grid edge-board-main">
        <div className="edge-board-column">
          <div className="surface search-panel class-filter-panel">
            <div className="section-copy">
              <p className="eyebrow">Browse</p>
              <h2>場の流れを見る</h2>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>検索</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="タイトル、部屋、本文" />
              </label>
              <label className="field">
                <span>部屋</span>
                <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
                  <option value="">すべて</option>
                  {rooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>空気感</span>
                <select value={vibeFilter} onChange={(event) => setVibeFilter(event.target.value)}>
                  <option value="">すべて</option>
                  {VIBE_OPTIONS.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="stack-list edge-tip-list">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <article key={item.id} className="surface edge-tip-card ritual-feed-card">
                  {editingId === item.id ? (
                    <div className="form-stack class-inline-editor">
                      <div className="class-form-grid">
                        <label className="field">
                          <span>部屋</span>
                          <select value={editingDraft.room} onChange={(event) => updateEditingField("room", event.target.value)}>
                            {ROOM_OPTIONS.map((room) => (
                              <option key={room.value} value={room.value}>
                                {room.value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>空気感</span>
                          <select value={editingDraft.vibe} onChange={(event) => updateEditingField("vibe", event.target.value)}>
                            {VIBE_OPTIONS.map((vibe) => (
                              <option key={vibe} value={vibe}>
                                {vibe}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>タイトル</span>
                          <input value={editingDraft.title} onChange={(event) => updateEditingField("title", event.target.value)} />
                        </label>
                        <label className="field">
                          <span>タイミング</span>
                          <input value={editingDraft.timing_label} onChange={(event) => updateEditingField("timing_label", event.target.value)} placeholder="今夜21時 / 今週きつい / 発表前" />
                        </label>
                      </div>
                      <label className="field">
                        <span>内容</span>
                        <textarea rows="5" value={editingDraft.body} onChange={(event) => updateEditingField("body", event.target.value)} />
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
                            <span className="pill published">{item.room || "呪詛ログ"}</span>
                            <span className="pill">{item.vibe || "吐き出したい"}</span>
                            {item.timing_label ? <span className="pill">{item.timing_label}</span> : null}
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
                <h3>まだ書き込みがありません</h3>
                <p>最初の気配を置いて、この場を動かし始めてください。</p>
              </div>
            )}
          </div>
        </div>

        <div className="edge-board-column">
          <form className="surface search-panel form-stack edge-write-panel" onSubmit={submitPost}>
            <div className="section-copy">
              <p className="eyebrow">Post</p>
              <h2>場に気配を置く</h2>
              <p className="muted">重くなりすぎず、でも薄すぎない。今のしんどさや募集を短く書いて流します。</p>
            </div>

            <div className="class-form-grid">
              <label className="field">
                <span>部屋</span>
                <select value={form.room} onChange={(event) => updateField("room", event.target.value)}>
                  {ROOM_OPTIONS.map((room) => (
                    <option key={room.value} value={room.value}>
                      {room.value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>空気感</span>
                <select value={form.vibe} onChange={(event) => updateField("vibe", event.target.value)}>
                  {VIBE_OPTIONS.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>タイトル</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="発表前で胃が痛い / 今夜アニメ見る人" required />
              </label>
              <label className="field">
                <span>タイミング</span>
                <input value={form.timing_label} onChange={(event) => updateField("timing_label", event.target.value)} placeholder="今夜21時 / 今日しんどい / 締切前" />
              </label>
            </div>

            <label className="field">
              <span>内容</span>
              <textarea
                rows="7"
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                placeholder="研究、指導、生活、雑談、募集。今ここに置きたいことを書いてください。"
                required
              />
            </label>

            <div className="hero-actions">
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? "送信中..." : "場に流す"}
              </button>
            </div>
            <p className={`status-text ${status ? "status-success" : ""}`}>
              {status || (session?.user ? "ログイン中です。そのまま書き込めます。" : "書き込むにはログインしてください。")}
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
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

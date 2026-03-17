"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AvatarMark } from "@/components/avatar-mark";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function NotificationsPanel() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("読み込み中...");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!supabase) {
      setStatus("Supabase の環境変数が未設定です。");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);

      if (!currentSession) {
        setStatus("ログインしてください。");
        setLoading(false);
        return;
      }

      await loadNotifications(currentSession.user.id);
      if (mounted) {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function loadNotifications(userId) {
    if (!supabase) return;

    const { data: rows, error } = await supabase
      .from("notifications")
      .select("id, actor_id, post_id, comment_id, type, read_at, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      setStatus(error.message);
      return;
    }

    const actorIds = [...new Set((rows || []).map((row) => row.actor_id).filter(Boolean))];
    const postIds = [...new Set((rows || []).map((row) => row.post_id).filter(Boolean))];

    const [{ data: actors }, { data: posts }] = await Promise.all([
      actorIds.length
        ? supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", actorIds)
        : Promise.resolve({ data: [] }),
      postIds.length
        ? supabase.from("posts").select("id, slug, title, profiles!posts_author_id_fkey(username)").in("id", postIds)
        : Promise.resolve({ data: [] })
    ]);

    const actorMap = new Map((actors || []).map((actor) => [actor.id, actor]));
    const postMap = new Map((posts || []).map((post) => [post.id, post]));

    const normalized = (rows || []).map((row) => ({
        ...row,
        actor: actorMap.get(row.actor_id) || null,
        post: postMap.get(row.post_id) || null
      }));
    const { items, duplicates } = dedupeNotifications(normalized);
    setNotifications(items);
    setStatus(duplicates ? `${duplicates} 件の重複通知を圧縮して表示しています。` : "通知を更新しました。");
  }

  async function markAllAsRead() {
    if (!supabase || !session) return;
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);

    if (error) {
      setStatus(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at || new Date().toISOString()
      }))
    );
    setStatus("未読通知を既読にしました。");
  }

  async function toggleRead(notification) {
    if (!supabase) return;
    const nextValue = notification.read_at ? null : new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: nextValue }).eq("id", notification.id);
    if (error) {
      setStatus(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read_at: nextValue } : item))
    );
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="surface empty-state">
        <h1>環境変数が未設定です</h1>
        <p>Supabase の URL と anon key を設定してください。</p>
      </section>
    );
  }

  if (loading) {
    return <section className="surface empty-state">読み込み中...</section>;
  }

  if (!session) {
    return (
      <section className="surface empty-state">
        <h1>通知を見るにはログインが必要です</h1>
        <Link href="/auth" className="button button-primary">
          ログインへ
        </Link>
      </section>
    );
  }

  const visibleNotifications =
    filter === "unread" ? notifications.filter((item) => !item.read_at) : notifications;

  return (
    <div className="stack-list">
      <section className="surface dashboard-hero">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>通知</h1>
          <p>{status}</p>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className={`button ${filter === "unread" ? "button-primary" : "button-secondary"}`}
            onClick={() => setFilter((current) => (current === "unread" ? "all" : "unread"))}
          >
            {filter === "unread" ? "すべて表示" : "未読のみ"}
          </button>
          <button type="button" className="button button-secondary" onClick={markAllAsRead}>
            すべて既読にする
          </button>
          <Link href="/dashboard" className="button button-ghost">
            ダッシュボード
          </Link>
        </div>
      </section>

      {visibleNotifications.length ? (
        visibleNotifications.map((item) => (
          <article key={item.id} className={`surface notification-card ${item.read_at ? "is-read" : "is-unread"}`}>
            <div className="comment-head">
              <AvatarMark profile={item.actor} size="sm" />
              <div>
                <strong>{buildNotificationTitle(item)}</strong>
                <p className="muted">{formatDate(item.created_at)}</p>
              </div>
            </div>
            {item.post ? (
              <Link href={`/@${item.post.profiles.username}/${item.post.slug}`} className="inline-link">
                {item.post.title}
              </Link>
            ) : null}
            <div className="secondary-actions">
              <button type="button" className="button button-ghost" onClick={() => toggleRead(item)}>
                {item.read_at ? "未読に戻す" : "既読にする"}
              </button>
            </div>
          </article>
        ))
      ) : (
        <section className="surface empty-state">
          <h2>通知はまだありません</h2>
          <p>フォロー、いいね、コメントなどが来るとここに並びます。</p>
        </section>
      )}
    </div>
  );
}

function dedupeNotifications(items) {
  const seen = new Set();
  let duplicates = 0;
  const deduped = [];

  for (const item of items) {
    const key = [item.type, item.actor_id, item.post_id || "", item.comment_id || "", formatDateKey(item.created_at)].join(":");
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return { items: deduped, duplicates };
}

function formatDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
}

function buildNotificationTitle(item) {
  const actorName = item.actor?.display_name || item.actor?.username || "誰か";
  switch (item.type) {
    case "follow":
      return `${actorName} があなたをフォローしました`;
    case "like":
      return `${actorName} があなたの投稿にいいねしました`;
    case "repost":
      return `${actorName} があなたの投稿をリポストしました`;
    case "comment":
      return `${actorName} があなたの投稿にコメントしました`;
    default:
      return `${actorName} からの通知`;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

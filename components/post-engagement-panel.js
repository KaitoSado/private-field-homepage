"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AvatarMark } from "@/components/avatar-mark";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import { COMMENT_BODY_LIMIT } from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function PostEngagementPanel({ postId, authorId, allowComments, initialStats, initialComments }) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [stats, setStats] = useState(initialStats);
  const [comments, setComments] = useState(initialComments);
  const [draftComment, setDraftComment] = useState("");
  const [state, setState] = useState({
    liked: false,
    bookmarked: false,
    reposted: false,
    loading: true,
    sendingComment: false
  });

  useEffect(() => {
    if (!supabase) {
      setState((current) => ({ ...current, loading: false }));
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
        setState((current) => ({ ...current, loading: false }));
        return;
      }

      const [{ data: likeRow }, { data: bookmarkRow }, { data: repostRow }, { data: profileRow }] = await Promise.all([
        supabase.from("post_likes").select("user_id").eq("user_id", currentSession.user.id).eq("post_id", postId).maybeSingle(),
        supabase.from("post_bookmarks").select("user_id").eq("user_id", currentSession.user.id).eq("post_id", postId).maybeSingle(),
        supabase.from("post_reposts").select("user_id").eq("user_id", currentSession.user.id).eq("post_id", postId).maybeSingle(),
        supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", currentSession.user.id).maybeSingle()
      ]);

      if (!mounted) return;

      setViewerProfile(profileRow || null);
      setState({
        liked: Boolean(likeRow),
        bookmarked: Boolean(bookmarkRow),
        reposted: Boolean(repostRow),
        loading: false,
        sendingComment: false
      });
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [postId, supabase]);

  async function toggleReaction(table, key) {
    if (!supabase || !session) return;
    const type = key === "liked" ? "like" : key === "reposted" ? "repost" : "bookmark";
    const limit = checkRateLimit(`reaction-${type}`, { windowMs: 60 * 1000, max: 20 });

    if (!state[key] && !limit.allowed) {
      await reportAbuseClient({
        profileId: session.user.id,
        kind: "reaction_rate_limited",
        description: `${type} reaction rate limited`,
        metadata: { postId, count: limit.count }
      });
      return;
    }

    if (state[key]) {
      await supabase.from(table).delete().eq("user_id", session.user.id).eq("post_id", postId);
      if (type !== "bookmark" && session.user.id !== authorId) {
        await supabase
          .from("notifications")
          .delete()
          .eq("actor_id", session.user.id)
          .eq("recipient_id", authorId)
          .eq("post_id", postId)
          .eq("type", type);
      }
      setState((current) => ({ ...current, [key]: false }));
      if (key !== "bookmarked") {
        setStats((current) => ({ ...current, [`${key === "liked" ? "like" : "repost"}_count`]: Math.max(0, current[`${key === "liked" ? "like" : "repost"}_count`] - 1) }));
      }
      return;
    }

    const { error } = await supabase.from(table).insert({ user_id: session.user.id, post_id: postId });
    if (error) return;
    markRateLimitAction(`reaction-${type}`);
    if (type !== "bookmark" && session.user.id !== authorId) {
      const conflictTarget = type === "like" || type === "repost" ? "recipient_id,actor_id,post_id,type" : undefined;
      await supabase.from("notifications").upsert(
        {
          actor_id: session.user.id,
          recipient_id: authorId,
          post_id: postId,
          type
        },
        conflictTarget ? { onConflict: conflictTarget } : undefined
      );
    }

    setState((current) => ({ ...current, [key]: true }));
    if (key !== "bookmarked") {
      setStats((current) => ({ ...current, [`${key === "liked" ? "like" : "repost"}_count`]: current[`${key === "liked" ? "like" : "repost"}_count`] + 1 }));
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    if (!supabase || !session || !allowComments || !draftComment.trim()) return;

    const limit = checkRateLimit("comment-create", { windowMs: 60 * 1000, max: 3 });
    if (!limit.allowed) {
      await reportAbuseClient({
        profileId: session.user.id,
        kind: "comment_rate_limited",
        description: "comment create rate limited",
        alert: true,
        metadata: {
          postId,
          count: limit.count
        }
      });
      return;
    }

    setState((current) => ({ ...current, sendingComment: true }));
    const { data, error } = await supabase
      .from("post_comments")
      .insert({
        post_id: postId,
        user_id: session.user.id,
        body: draftComment.trim()
      })
      .select("id, body, created_at")
      .single();

    if (error) {
      void fetch("/api/telemetry/abuse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profileId: session.user.id,
          kind: "comment_insert_failed",
          description: error.message,
          metadata: {
            postId
          }
        })
      }).catch(() => undefined);
      setState((current) => ({ ...current, sendingComment: false }));
      return;
    }

    markRateLimitAction("comment-create");
    if (session.user.id !== authorId) {
      await supabase.from("notifications").insert({
        actor_id: session.user.id,
        recipient_id: authorId,
        post_id: postId,
        comment_id: data.id,
        type: "comment"
      });
    }

    setComments((current) => [
      ...current,
      {
        ...data,
        profiles: viewerProfile
      }
    ]);
    setStats((current) => ({ ...current, comment_count: current.comment_count + 1 }));
    setDraftComment("");
    setState((current) => ({ ...current, sendingComment: false }));
  }

  const canReact = session && session.user.id !== authorId;

  return (
    <section className="surface engagement-panel">
      <div className="engagement-actions">
        <button
          type="button"
          className={`reaction-button ${state.liked ? "active" : ""}`}
          onClick={() => toggleReaction("post_likes", "liked")}
          disabled={!canReact || state.loading}
        >
          いいね {stats.like_count}
        </button>
        <button
          type="button"
          className={`reaction-button ${state.bookmarked ? "active" : ""}`}
          onClick={() => toggleReaction("post_bookmarks", "bookmarked")}
          disabled={!session || state.loading}
        >
          ブックマーク
        </button>
        <button
          type="button"
          className={`reaction-button ${state.reposted ? "active" : ""}`}
          onClick={() => toggleReaction("post_reposts", "reposted")}
          disabled={!canReact || state.loading}
        >
          リポスト {stats.repost_count}
        </button>
        <span className="reaction-chip">コメント {stats.comment_count}</span>
      </div>

      {!session ? <Link href="/auth" className="status-text">ログインすると反応とコメントができます。</Link> : null}

      <div className="comment-stack">
        {comments.length ? (
          comments.map((comment) => (
            <article key={comment.id} className="comment-card">
              <div className="comment-head">
                <AvatarMark profile={comment.profiles} size="sm" />
                <div>
                  <strong>{comment.profiles?.display_name || comment.profiles?.username || "user"}</strong>
                  <p className="muted">@{comment.profiles?.username || "user"}</p>
                </div>
              </div>
              <p>{comment.body}</p>
            </article>
          ))
        ) : (
          <div className="empty-inline">まだコメントはありません。</div>
        )}
      </div>

      {allowComments ? (
        <form className="form-stack" onSubmit={handleCommentSubmit}>
          <label className="field">
            <span>コメント</span>
            <textarea
              rows="3"
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder="この記事への反応を書く"
              disabled={!session || state.sendingComment}
              maxLength={COMMENT_BODY_LIMIT}
            />
            <small className="field-hint">コメントは 1 分あたり 3 件まで送信できます。</small>
          </label>
          <button
            type="submit"
            className="button button-primary"
            disabled={!session || state.sendingComment || !draftComment.trim()}
          >
            {state.sendingComment ? "送信中..." : "コメントする"}
          </button>
        </form>
      ) : (
        <p className="status-text">この投稿ではコメントを受け付けていません。</p>
      )}
      {!state.loading && session ? <p className="status-text">リアクションは 1 分あたり 20 件までです。</p> : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ProfileSocialActions({ profileId, username, initialStats }) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [state, setState] = useState({
    following: false,
    blocked: false,
    muted: false,
    loading: true
  });
  const [stats, setStats] = useState(initialStats);

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

      if (!currentSession || currentSession.user.id === profileId) {
        setState((current) => ({ ...current, loading: false }));
        return;
      }

      const [{ data: followRow }, { data: blockRow }, { data: muteRow }] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("follower_id", currentSession.user.id).eq("following_id", profileId).maybeSingle(),
        supabase.from("blocks").select("blocker_id").eq("blocker_id", currentSession.user.id).eq("blocked_id", profileId).maybeSingle(),
        supabase.from("mutes").select("muter_id").eq("muter_id", currentSession.user.id).eq("muted_id", profileId).maybeSingle()
      ]);

      if (!mounted) return;

      setState({
        following: Boolean(followRow),
        blocked: Boolean(blockRow),
        muted: Boolean(muteRow),
        loading: false
      });
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [profileId, supabase]);

  async function toggleFollow() {
    if (!supabase || !session || session.user.id === profileId || state.blocked) return;

    if (state.following) {
      await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", profileId);
      await supabase
        .from("notifications")
        .delete()
        .eq("actor_id", session.user.id)
        .eq("recipient_id", profileId)
        .eq("type", "follow");
      setState((current) => ({ ...current, following: false }));
      setStats((current) => ({ ...current, follower_count: Math.max(0, current.follower_count - 1) }));
      return;
    }

    const { error } = await supabase.from("follows").insert({ follower_id: session.user.id, following_id: profileId });
    if (error) return;
    await supabase.from("notifications").upsert(
      {
        actor_id: session.user.id,
        recipient_id: profileId,
        type: "follow"
      },
      { onConflict: "recipient_id,actor_id,type" }
    );
    setState((current) => ({ ...current, following: true }));
    setStats((current) => ({ ...current, follower_count: current.follower_count + 1 }));
  }

  async function toggleMute() {
    if (!supabase || !session || session.user.id === profileId) return;

    if (state.muted) {
      await supabase.from("mutes").delete().eq("muter_id", session.user.id).eq("muted_id", profileId);
      setState((current) => ({ ...current, muted: false }));
      return;
    }

    const { error } = await supabase.from("mutes").insert({ muter_id: session.user.id, muted_id: profileId });
    if (!error) {
      setState((current) => ({ ...current, muted: true }));
    }
  }

  async function toggleBlock() {
    if (!supabase || !session || session.user.id === profileId) return;

    if (state.blocked) {
      await supabase.from("blocks").delete().eq("blocker_id", session.user.id).eq("blocked_id", profileId);
      setState((current) => ({ ...current, blocked: false }));
      return;
    }

    const { error } = await supabase.from("blocks").insert({ blocker_id: session.user.id, blocked_id: profileId });
    if (error) return;

    await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", profileId);
    setState((current) => ({ ...current, blocked: true, following: false }));
  }

  return (
    <div className="social-card surface">
      <div className="social-stats">
        <div>
          <strong>{stats.follower_count}</strong>
          <span>Followers</span>
        </div>
        <div>
          <strong>{stats.following_count}</strong>
          <span>Following</span>
        </div>
        <div>
          <strong>{stats.public_post_count}</strong>
          <span>Posts</span>
        </div>
      </div>

      {!session ? (
        <Link href="/auth" className="button button-secondary full-width">
          ログインしてフォロー
        </Link>
      ) : (
        <div className="social-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={toggleFollow}
            disabled={state.loading || state.blocked}
          >
            {state.following ? "フォロー解除" : "フォロー"}
          </button>
          <button type="button" className="button button-secondary" onClick={toggleMute} disabled={state.loading}>
            {state.muted ? "ミュート解除" : "ミュート"}
          </button>
          <button type="button" className="button button-ghost" onClick={toggleBlock} disabled={state.loading}>
            {state.blocked ? "ブロック解除" : "ブロック"}
          </button>
        </div>
      )}

      <p className="status-text">@{username} の公開プロフィールに対する操作です。</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AvatarMark } from "@/components/avatar-mark";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AdminPanel() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [opsSummary, setOpsSummary] = useState({
    pageViews24h: 0,
    errors24h: 0,
    abuse24h: 0
  });
  const [status, setStatus] = useState("読み込み中...");
  const [loading, setLoading] = useState(true);

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

      const { data: ownProfile } = await supabase
        .from("profiles")
        .select("id, username, display_name, role, account_status")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (!mounted) return;
      setAdminProfile(ownProfile);

      if (!ownProfile || ownProfile.role !== "admin") {
        setStatus("管理者のみアクセスできます。");
        setLoading(false);
        return;
      }

      await loadAdminData();
      if (mounted) {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function loadAdminData() {
    if (!supabase) return;

    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: reportRows, error: reportError },
      { data: profileRows, error: profileError },
      { data: postRows, error: postError },
      { data: commentRows, error: commentError },
      { data: alertRows, error: alertError },
      { count: pageViewsCount, error: pageViewError },
      { count: errorsCount, error: telemetryError },
      { count: abuseCount, error: abuseError }
    ] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(60),
      supabase
        .from("profiles")
        .select("id, username, display_name, headline, bio, avatar_url, role, account_status, discoverable")
        .order("updated_at", { ascending: false })
        .limit(60),
      supabase
        .from("posts")
        .select("id, title, slug, excerpt, body, author_id, published, visibility, updated_at, profiles!posts_author_id_fkey(id, username, display_name)")
        .order("updated_at", { ascending: false })
        .limit(60),
      supabase
        .from("post_comments")
        .select("id, body, created_at, post_id, user_id, profiles!post_comments_user_id_fkey(id, username, display_name), posts!post_comments_post_id_fkey(id, slug, title, profiles!posts_author_id_fkey(username))")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("admin_alerts").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("telemetry_page_views").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
      supabase.from("telemetry_errors").select("*", { count: "exact", head: true }).gte("created_at", sinceIso),
      supabase.from("abuse_events").select("*", { count: "exact", head: true }).gte("created_at", sinceIso)
    ]);

    if (reportError || profileError || postError || commentError || alertError || pageViewError || telemetryError || abuseError) {
      setStatus(
        reportError?.message ||
          profileError?.message ||
          postError?.message ||
          commentError?.message ||
          alertError?.message ||
          pageViewError?.message ||
          telemetryError?.message ||
          abuseError?.message ||
          "読み込みに失敗しました。"
      );
      return;
    }

    const profileMap = new Map((profileRows || []).map((profile) => [profile.id, profile]));
    const postMap = new Map((postRows || []).map((post) => [post.id, post]));

    setReports(
      (reportRows || []).map((report) => ({
        ...report,
        targetProfile: report.target_profile_id ? profileMap.get(report.target_profile_id) || null : null,
        targetPost: report.target_post_id ? postMap.get(report.target_post_id) || null : null
      }))
    );
    setProfiles(profileRows || []);
    setPosts(postRows || []);
    setComments(commentRows || []);
    setAlerts(alertRows || []);
    setOpsSummary({
      pageViews24h: pageViewsCount || 0,
      errors24h: errorsCount || 0,
      abuse24h: abuseCount || 0
    });
    setStatus("管理データを更新しました。");
  }

  async function updateReport(reportId, nextStatus) {
    if (!supabase || !session) return;
    const { error } = await supabase
      .from("reports")
      .update({ status: nextStatus, reviewer_id: session.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", reportId);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  async function toggleSuspension(profile) {
    if (!supabase) return;
    const nextStatus = profile.account_status === "suspended" ? "active" : "suspended";
    const { error } = await supabase.from("profiles").update({ account_status: nextStatus }).eq("id", profile.id);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  async function toggleDiscoverable(profile) {
    if (!supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ discoverable: !profile.discoverable })
      .eq("id", profile.id);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  async function hidePost(postId) {
    if (!supabase) return;
    const { error } = await supabase.from("posts").update({ published: false, visibility: "private" }).eq("id", postId);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  async function deleteComment(commentId) {
    if (!supabase) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  async function markAlertRead(alertId, read) {
    if (!supabase) return;
    const { error } = await supabase
      .from("admin_alerts")
      .update({ read_at: read ? new Date().toISOString() : null })
      .eq("id", alertId);
    if (!error) {
      await loadAdminData();
    } else {
      setStatus(error.message);
    }
  }

  if (!hasSupabaseConfig) {
    return <section className="surface empty-state">Supabase の環境変数が未設定です。</section>;
  }

  if (loading) {
    return <section className="surface empty-state">読み込み中...</section>;
  }

  if (!session) {
    return (
      <section className="surface empty-state">
        <h1>管理画面に入るにはログインが必要です</h1>
        <Link href="/auth" className="button button-primary">
          ログインへ
        </Link>
      </section>
    );
  }

  if (!adminProfile || adminProfile.role !== "admin") {
    return (
      <section className="surface empty-state">
        <h1>アクセス権がありません</h1>
        <p>{status}</p>
      </section>
    );
  }

  return (
    <div className="stack-list">
      <section className="surface dashboard-hero">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>モデレーション</h1>
          <p>{status}</p>
        </div>
        <div className="hero-actions">
          <Link href="/settings" className="button button-secondary">
            Settings
          </Link>
          <Link href="/ops" className="button button-secondary">
            Ops
          </Link>
          <Link href="/dashboard" className="button button-ghost">
            Dashboard
          </Link>
        </div>
      </section>

      <section className="section-grid admin-grid">
        <article className="surface feature-card">
          <p className="eyebrow">Traffic 24h</p>
          <h2>{opsSummary.pageViews24h}</h2>
          <p>ページビュー</p>
        </article>
        <article className="surface feature-card">
          <p className="eyebrow">Errors 24h</p>
          <h2>{opsSummary.errors24h}</h2>
          <p>クライアントエラー</p>
        </article>
        <article className="surface feature-card">
          <p className="eyebrow">Abuse 24h</p>
          <h2>{opsSummary.abuse24h}</h2>
          <p>abuse イベント</p>
        </article>
      </section>

      <section className="surface form-stack">
        <div>
          <p className="eyebrow">Admin alerts</p>
          <h2>運用アラート</h2>
        </div>
        {alerts.length ? (
          alerts.map((alert) => (
            <article key={alert.id} className={`notification-card surface ${alert.read_at ? "is-read" : "is-unread"}`}>
              <div className="inline-meta">
                <span>{alert.level}</span>
                <span>{alert.type}</span>
                <span>{formatDate(alert.created_at)}</span>
              </div>
              <strong>{alert.title}</strong>
              <p>{alert.body || "詳細なし"}</p>
              <div className="secondary-actions">
                <button type="button" className="button button-ghost" onClick={() => markAlertRead(alert.id, !alert.read_at)}>
                  {alert.read_at ? "未読に戻す" : "既読にする"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-inline">運用アラートはありません。</div>
        )}
      </section>

      <section className="surface form-stack">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>通報一覧</h2>
        </div>
        {reports.length ? (
          reports.map((report) => (
            <article key={report.id} className="report-card">
              <div className="inline-meta">
                <span>{report.reason}</span>
                <span>{report.status}</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
              <p>{report.details || "詳細なし"}</p>
              {report.targetProfile ? (
                <div className="moderation-card">
                  <strong>対象プロフィール</strong>
                  <div className="comment-head">
                    <AvatarMark profile={report.targetProfile} size="sm" />
                    <div>
                      <strong>{report.targetProfile.display_name || report.targetProfile.username}</strong>
                      <p className="muted">@{report.targetProfile.username}</p>
                    </div>
                  </div>
                  <p>{report.targetProfile.headline || "headline なし"}</p>
                  <p>{report.targetProfile.bio || "bio なし"}</p>
                </div>
              ) : null}
              {report.targetPost ? (
                <div className="moderation-card">
                  <strong>対象投稿</strong>
                  <p>{report.targetPost.title}</p>
                  <p>{report.targetPost.excerpt || "excerpt なし"}</p>
                  <p>{report.targetPost.body || "body なし"}</p>
                </div>
              ) : null}
              <div className="secondary-actions">
                <button type="button" className="button button-secondary" onClick={() => updateReport(report.id, "reviewed")}>
                  reviewed
                </button>
                <button type="button" className="button button-ghost" onClick={() => updateReport(report.id, "dismissed")}>
                  dismissed
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-inline">通報はまだありません。</div>
        )}
      </section>

      <section className="section-grid admin-grid">
        <section className="surface form-stack">
          <div>
            <p className="eyebrow">Profiles</p>
            <h2>プロフィール管理</h2>
            <p className="muted">公開プロフィールの状態確認、一覧表示の切替、凍結対応をここで行います。</p>
          </div>
          {profiles.map((profile) => (
            <article key={profile.id} className="moderation-card">
              <div className="comment-head">
                <AvatarMark profile={profile} size="sm" />
                <div>
                  <strong>{profile.display_name || profile.username}</strong>
                  <p className="muted">@{profile.username}</p>
                </div>
              </div>
              <p>{profile.headline || "headline なし"}</p>
              <p>{profile.bio || "bio なし"}</p>
              <div className="inline-meta">
                <span>{profile.role}</span>
                <span>{profile.account_status}</span>
                <span>{profile.discoverable ? "discoverable" : "hidden"}</span>
              </div>
              <div className="secondary-actions">
                <button type="button" className="button button-secondary" onClick={() => toggleSuspension(profile)}>
                  {profile.account_status === "suspended" ? "凍結解除" : "凍結する"}
                </button>
                <button type="button" className="button button-ghost" onClick={() => toggleDiscoverable(profile)}>
                  {profile.discoverable ? "一覧から外す" : "一覧に戻す"}
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="surface form-stack">
          <div>
            <p className="eyebrow">Posts & comments</p>
            <h2>投稿とコメント</h2>
          </div>
          {posts.map((post) => (
            <article key={post.id} className="moderation-card">
              <strong>{post.title}</strong>
              <p>{post.excerpt || "excerpt なし"}</p>
              <p>{post.body || "body なし"}</p>
              <div className="inline-meta">
                <span>{post.visibility}</span>
                <span>{post.published ? "published" : "draft"}</span>
                <span>@{post.profiles?.username || "unknown"}</span>
              </div>
              <button type="button" className="button button-secondary" onClick={() => hidePost(post.id)}>
                非公開化
              </button>
            </article>
          ))}
          {comments.map((comment) => (
            <article key={comment.id} className="moderation-card">
              <strong>Comment by @{comment.profiles?.username || "user"}</strong>
              <p>{comment.body}</p>
              <div className="inline-meta">
                <span>{comment.posts?.title || "post"}</span>
                <span>{formatDate(comment.created_at)}</span>
              </div>
              <button type="button" className="button button-danger" onClick={() => deleteComment(comment.id)}>
                コメント削除
              </button>
            </article>
          ))}
        </section>
      </section>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

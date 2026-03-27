"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import {
  AVATAR_MAX_BYTES,
  POST_BODY_LIMIT,
  POST_EXCERPT_LIMIT,
  POST_IMAGE_MAX_BYTES,
  POST_MEDIA_LIMIT,
  POST_TAG_LIMIT,
  POST_TITLE_LIMIT,
  POST_VIDEO_MAX_BYTES,
  PROFILE_BIO_LIMIT,
  PROFILE_HEADLINE_LIMIT,
  PROFILE_LOCATION_LIMIT,
  PROFILE_OPEN_TO_LIMIT
} from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { withBrowserTimeout } from "@/lib/browser-timeout";
import { getAvatarBucket, getPostMediaBucket, uploadPublicFile } from "@/lib/storage";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

const emptyProfile = {
  username: "",
  page_theme: "default",
  display_name: "",
  headline: "",
  affiliation: "",
  focus_area: "",
  open_to: "",
  bio: "",
  location: "",
  website_url: "",
  x_url: "",
  github_url: "",
  note_url: "",
  avatar_url: "",
  account_status: "active",
  discoverable: true
};

const emptyPost = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  published: false,
  published_at: null,
  visibility: "public",
  scheduled_for: "",
  allow_comments: true,
  tags_input: "",
  media_input: "",
  cover_image_url: ""
};

export function DashboardShell() {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [posts, setPosts] = useState([]);
  const [editor, setEditor] = useState(emptyPost);
  const [status, setStatus] = useState("読み込み中...");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setStatus("Supabase の環境変数が未設定です。README の手順で .env.local を作成してください。");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session: currentSession }
        } = await withBrowserTimeout(
          supabase.auth.getSession(),
          8000,
          "セッションの確認がタイムアウトしました。ページを再読み込みしてください。"
        );

        if (!mounted) return;

        setSession(currentSession);

        if (!currentSession) {
          setStatus("ログインしてください。");
          return;
        }

        await withBrowserTimeout(
          loadData(currentSession.user.id, currentSession.user.email || ""),
          8000,
          "プロフィールの読み込みがタイムアウトしました。再試行してください。"
        );
      } catch (error) {
        if (!mounted) return;
        setStatus(error?.message || "ダッシュボードの読み込みに失敗しました。");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        if (!mounted) return;

        setSession(nextSession);

        if (!nextSession) {
          setProfile(emptyProfile);
          setPosts([]);
          setEditor(emptyPost);
          setStatus("ログインしてください。");
          return;
        }

        setLoading(true);
        await withBrowserTimeout(
          loadData(nextSession.user.id, nextSession.user.email || ""),
          8000,
          "プロフィールの同期がタイムアウトしました。再試行してください。"
        );
      } catch (error) {
        if (!mounted) return;
        setStatus(error?.message || "ダッシュボードの更新に失敗しました。");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, reloadToken]);

  async function loadData(userId, email = "") {
    if (!supabase) return;

    try {
      const [{ data: profileRow, error: profileError }, { data: postRows, error: postsError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("posts").select("*").eq("author_id", userId).order("updated_at", { ascending: false })
      ]);

      if (profileError) {
        setStatus(profileError.message);
        return;
      }

      if (postsError) {
        setStatus(postsError.message);
        return;
      }

      const nextProfile = profileRow || {
        ...emptyProfile,
        username: buildUsernameFallback(email)
      };
      const resolvedUsername = resolveUsername(nextProfile.username, email, userId);

      setProfile({
        username: resolvedUsername,
        page_theme: nextProfile.page_theme || "default",
        display_name: nextProfile.display_name || "",
        headline: nextProfile.headline || "",
        affiliation: nextProfile.affiliation || "",
        focus_area: nextProfile.focus_area || "",
        open_to: nextProfile.open_to || "",
        bio: nextProfile.bio || "",
        location: nextProfile.location || "",
        website_url: nextProfile.website_url || "",
        x_url: nextProfile.x_url || "",
        github_url: nextProfile.github_url || "",
        note_url: nextProfile.note_url || "",
        avatar_url: nextProfile.avatar_url || "",
        account_status: nextProfile.account_status || "active",
        discoverable: nextProfile.discoverable !== false
      });
      setPosts(postRows || []);
      setStatus("準備完了");
    } catch (error) {
      setStatus(error?.message || "ダッシュボードの読み込みに失敗しました。");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!session || !supabase) return;

    setSavingProfile(true);
    setStatus("");

    try {
      const payload = buildProfilePayload(profile, session.user);
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      await loadData(session.user.id, session.user.email || "");
      setProfile((current) => ({ ...current, username: payload.username }));
      setStatus("プロフィールを保存しました。");
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePost(event) {
    event.preventDefault();
    if (!session || !supabase) return;

    const limit = checkRateLimit("post-save", { windowMs: 15 * 60 * 1000, max: 8 });
    if (!limit.allowed) {
      setStatus(`投稿操作が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      await reportAbuseClient({
        profileId: session.user.id,
        kind: "post_rate_limited",
        description: "post save rate limited",
        alert: true,
        metadata: {
          count: limit.count
        }
      });
      return;
    }

    setSavingPost(true);
    setStatus("");

    try {
      const profilePayload = buildProfilePayload(profile, session.user);
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
      if (profileError) throw profileError;

      const payload = buildPostPayload(editor, session.user.id);
      const { error } = editor.id
        ? await supabase.from("posts").update(payload).eq("id", editor.id)
        : await supabase.from("posts").insert(payload);

      if (error) throw error;

      setEditor(emptyPost);
      markRateLimitAction("post-save");
      await loadData(session.user.id, session.user.email || "");
      setStatus("記事を保存しました。");
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSavingPost(false);
    }
  }

  async function removePost(postId) {
    if (!supabase || !session) return;
    if (!window.confirm("この投稿を削除します。元に戻せません。")) return;

    const limit = checkRateLimit("post-delete", { windowMs: 10 * 60 * 1000, max: 10 });
    if (!limit.allowed) {
      setStatus(`削除操作が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      return;
    }

    setDeletingPostId(postId);
    setStatus("");

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      if (editor.id === postId) {
        setEditor(emptyPost);
      }

      markRateLimitAction("post-delete");
      await loadData(session.user.id, session.user.email || "");
      setStatus("記事を削除しました。");
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setDeletingPostId("");
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !supabase || !session) return;
    if (file.size > AVATAR_MAX_BYTES) {
      setStatus("プロフィール画像は 5MB 以下にしてください。");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    setStatus("プロフィール画像をアップロードしています...");

    try {
      const publicUrl = await uploadPublicFile({
        supabase,
        bucket: getAvatarBucket(),
        userId: session.user.id,
        file,
        folder: "avatars"
      });

      setProfile((current) => ({ ...current, avatar_url: publicUrl }));
      setStatus("プロフィール画像をアップロードしました。プロフィールを保存すると反映されます。");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !supabase || !session) return;
    if (file.size > POST_IMAGE_MAX_BYTES) {
      setStatus("カバー画像は 10MB 以下にしてください。");
      event.target.value = "";
      return;
    }

    setUploadingCover(true);
    setStatus("カバー画像をアップロードしています...");

    try {
      const publicUrl = await uploadPublicFile({
        supabase,
        bucket: getPostMediaBucket(),
        userId: session.user.id,
        file,
        folder: "covers"
      });

      setEditor((current) => ({ ...current, cover_image_url: publicUrl }));
      setStatus("カバー画像をアップロードしました。記事を保存すると反映されます。");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  }

  async function handleMediaUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !supabase || !session) return;
    if (files.length > POST_MEDIA_LIMIT) {
      setStatus(`アップロードできる件数は最大 ${POST_MEDIA_LIMIT} 件です。`);
      event.target.value = "";
      return;
    }
    const oversizeFile = files.find((file) =>
      file.type?.startsWith("video/") ? file.size > POST_VIDEO_MAX_BYTES : file.size > POST_IMAGE_MAX_BYTES
    );
    if (oversizeFile) {
      setStatus("画像は 10MB、動画は 100MB 以下にしてください。");
      event.target.value = "";
      return;
    }

    setUploadingMedia(true);
    setStatus("投稿メディアをアップロードしています...");

    try {
      const uploaded = [];

      for (const file of files) {
        const publicUrl = await uploadPublicFile({
          supabase,
          bucket: getPostMediaBucket(),
          userId: session.user.id,
          file,
          folder: "posts"
        });
        uploaded.push(`${inferMediaKind(file)} ${publicUrl}`);
      }

      setEditor((current) => ({
        ...current,
        media_input: [current.media_input, ...uploaded].filter(Boolean).join("\n")
      }));
      setStatus("投稿メディアをアップロードしました。記事を保存すると反映されます。");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  }

  if (!hasSupabaseConfig) {
    return (
      <section className="surface empty-state">
        <h1>環境変数が未設定です</h1>
        <p>
          `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してから
          再起動してください。
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="surface empty-state">
        <h1>読み込み中...</h1>
        <p>{status}</p>
        <button type="button" className="button button-secondary" onClick={() => setReloadToken((current) => current + 1)}>
          再試行
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <section className="surface empty-state">
        <h1>ダッシュボードにログインしてください</h1>
        <p>プロフィールと記事の編集はログインユーザーのみ行えます。</p>
        <Link href="/auth" className="button button-primary">
          ログインへ
        </Link>
      </section>
    );
  }

  return (
    <div className="dashboard-layout">
      <section className="surface dashboard-hero">
        <div className="dashboard-hero-head">
          <AvatarMark profile={profile} size="lg" />
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{profile.display_name || session.user.email}</h1>
            <p>{status}</p>
          </div>
        </div>

        <div className="hero-actions">
          {profile.username ? (
            <Link className="button button-secondary" href={`/@${normalizeUsername(profile.username)}`}>
              公開ページを見る
            </Link>
          ) : null}
          <button type="button" className="button button-ghost" onClick={signOut}>
            ログアウト
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="surface form-stack">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>プロフィール編集は公開ページへ統合</h2>
            <p className="field-hint">表示名、自己紹介、テーマ、リンク、プロフィール画像は公開ページ `/@username` で直接編集してください。</p>
          </div>

          <p className="status-text">アカウント状態: {profile.account_status}</p>
          <p className="field-hint">公開URLは `/@username` になります。</p>
          <div className="stack-list">
            <div className="surface">
              <p className="eyebrow">Current public URL</p>
              <p>{profile.username ? `/@${normalizeUsername(profile.username)}` : "/@username"}</p>
            </div>
            {profile.username ? (
              <Link className="button button-primary full-width" href={`/@${normalizeUsername(profile.username)}`}>
                公開ページでプロフィールを編集
              </Link>
            ) : null}
          </div>
        </section>

        <section className="surface form-stack">
          <div>
            <p className="eyebrow">Posts</p>
            <h2>記事管理も公開ページへ統合</h2>
            <p className="field-hint">新規記事の作成、更新、削除、公開設定はプロフィール公開ページのまま行えます。</p>
          </div>
          {profile.username ? (
            <Link className="button button-primary" href={`/@${normalizeUsername(profile.username)}`}>
              公開ページで記事を管理
            </Link>
          ) : null}
          <p className="status-text">現在の公開記事数: {posts.length}</p>
        </section>
      </div>
    </div>
  );
}

function buildProfilePayload(profile, user) {
  const username = resolveUsername(profile.username, user.email, user.id);

  return {
    id: user.id,
    username,
    page_theme: profile.page_theme || "default",
    display_name: profile.display_name.trim(),
    headline: profile.headline.trim(),
    affiliation: profile.affiliation.trim(),
    focus_area: profile.focus_area.trim(),
    open_to: profile.open_to.trim(),
    bio: profile.bio.trim(),
    location: profile.location.trim(),
    website_url: sanitizeExternalUrl(profile.website_url) || "",
    x_url: sanitizeExternalUrl(profile.x_url) || "",
    github_url: sanitizeExternalUrl(profile.github_url) || "",
    note_url: sanitizeExternalUrl(profile.note_url) || "",
    avatar_url: sanitizeHttpUrl(profile.avatar_url) || "",
    discoverable: profile.discoverable !== false
  };
}

function ProfileCanvasEditor({ profile, setProfile }) {
  function updateField(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="profile-canvas-editor">
      <div className="profile-canvas-hero">
        <AvatarMark profile={profile} size="lg" />
        <div className="profile-canvas-copy">
          <label className="profile-inline-field profile-inline-handle">
            <span className="sr-only">username</span>
            <div className="profile-inline-prefix">@</div>
            <input
              value={profile.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="your-name"
              required
            />
          </label>

          <label className="profile-inline-field profile-inline-title">
            <span className="sr-only">表示名</span>
            <input
              value={profile.display_name}
              onChange={(event) => updateField("display_name", event.target.value)}
              placeholder="表示名"
            />
          </label>

          <label className="profile-inline-field profile-inline-headline">
            <span className="sr-only">肩書き</span>
            <textarea
              rows="2"
              value={profile.headline}
              onChange={(event) => updateField("headline", event.target.value)}
              placeholder="デザイナー / 開発者 / 研究者"
              maxLength={PROFILE_HEADLINE_LIMIT}
            />
          </label>
        </div>
      </div>

      <div className="profile-canvas-grid">
        <label className="profile-canvas-card">
          <span className="eyebrow">Affiliation</span>
          <input
            value={profile.affiliation}
            onChange={(event) => updateField("affiliation", event.target.value)}
            placeholder="〇〇大学 / フリーランス / 会社名"
          />
        </label>

        <label className="profile-canvas-card">
          <span className="eyebrow">Focus</span>
          <input
            value={profile.focus_area}
            onChange={(event) => updateField("focus_area", event.target.value)}
            placeholder="HCI, UI設計, Webアプリ, 執筆"
          />
        </label>

        <label className="profile-canvas-card">
          <span className="eyebrow">Location</span>
          <input
            value={profile.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="Tokyo / Remote"
            maxLength={PROFILE_LOCATION_LIMIT}
          />
        </label>

        <label className="profile-canvas-card profile-canvas-card-wide">
          <span className="eyebrow">Open to</span>
          <textarea
            rows="3"
            value={profile.open_to}
            onChange={(event) => updateField("open_to", event.target.value)}
            placeholder="共同研究、プロトタイプ制作、サイト設計、登壇依頼など"
            maxLength={PROFILE_OPEN_TO_LIMIT}
          />
        </label>
      </div>

      <label className="profile-canvas-bio">
        <span className="eyebrow">About</span>
        <textarea
          rows="6"
          value={profile.bio}
          onChange={(event) => updateField("bio", event.target.value)}
          placeholder="このページで何を伝えたいかを書いてください。"
          maxLength={PROFILE_BIO_LIMIT}
        />
      </label>
    </section>
  );
}

function buildPostPayload(editor, userId) {
  const scheduledFor = editor.scheduled_for ? new Date(editor.scheduled_for).toISOString() : null;

  return {
    author_id: userId,
    title: editor.title.trim(),
    slug: normalizeSlug(editor.slug || editor.title),
    excerpt: editor.excerpt.trim(),
    body: editor.body.trim(),
    published: editor.published,
    published_at: editor.published ? editor.published_at || new Date().toISOString() : null,
    visibility: editor.visibility || "public",
    scheduled_for: scheduledFor,
    allow_comments: editor.allow_comments,
    tags: parseTags(editor.tags_input),
    media_items: parseMediaItems(editor.media_input),
    cover_image_url: sanitizeHttpUrl(editor.cover_image_url) || ""
  };
}

function parseTags(value) {
  return `${value || ""}`
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

function parseMediaItems(value) {
  return `${value || ""}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [kindToken, ...rest] = line.split(/\s+/);
      const kind = kindToken === "video" ? "video" : "image";
      const url = sanitizeHttpUrl(rest.length ? rest.join(" ") : line);

      return url ? { kind, url } : null;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function mapPostToEditor(post) {
  return {
    id: post.id,
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    body: post.body || "",
    published: Boolean(post.published),
    published_at: post.published_at || null,
    visibility: post.visibility || "public",
    scheduled_for: post.scheduled_for ? toDatetimeLocal(post.scheduled_for) : "",
    allow_comments: post.allow_comments !== false,
    tags_input: Array.isArray(post.tags) ? post.tags.join(", ") : "",
    media_input: formatMediaItems(post.media_items),
    cover_image_url: post.cover_image_url || ""
  };
}

function formatMediaItems(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => `${item?.kind === "video" ? "video" : "image"} ${item?.url || ""}`.trim())
    .filter(Boolean)
    .join("\n");
}

function inferMediaKind(file) {
  return file.type?.startsWith("video/") ? "video" : "image";
}

function resolvePostPill(post) {
  if (!post.published) {
    return { className: "draft", label: "下書き" };
  }

  if (post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()) {
    return { className: "scheduled", label: "予約中" };
  }

  if (post.visibility === "private") {
    return { className: "draft", label: "非公開" };
  }

  if (post.visibility === "unlisted") {
    return { className: "scheduled", label: "限定公開" };
  }

  return { className: "published", label: "公開中" };
}

function formatSchedule(value) {
  if (!value) return "公開日時未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toDatetimeLocal(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeUsername(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

function resolveUsername(value, email = "", userId = "") {
  const normalized = normalizeUsername(value || "");
  if (normalized) return normalized;

  const fallbackFromEmail = buildUsernameFallback(email || "");
  if (fallbackFromEmail) return fallbackFromEmail;

  const suffix = `${userId || ""}`.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();
  return suffix ? `user-${suffix}` : "user";
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildUsernameFallback(email) {
  if (!email) return "";
  return normalizeUsername(email.split("@")[0] || "user");
}

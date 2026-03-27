"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import {
  POST_BODY_LIMIT,
  POST_EXCERPT_LIMIT,
  POST_IMAGE_MAX_BYTES,
  POST_MEDIA_LIMIT,
  POST_TAG_LIMIT,
  POST_TITLE_LIMIT,
  POST_VIDEO_MAX_BYTES
} from "@/lib/limits";
import { getPostMediaBucket, uploadPublicFile } from "@/lib/storage";
import { sanitizeHttpUrl } from "@/lib/url";

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

export function ProfilePostManager({ supabase, session, username, posts, onPostsChange, title = "記事を管理" }) {
  const [editor, setEditor] = useState(emptyPost);
  const [status, setStatus] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!editor.id) return;
    const stillExists = posts.some((post) => post.id === editor.id);
    if (!stillExists) {
      setEditor(emptyPost);
      setComposerOpen(false);
    }
  }, [posts, editor.id]);

  async function reloadPosts() {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from("posts").select("*").eq("author_id", session.user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    onPostsChange(data || []);
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
        metadata: { count: limit.count }
      });
      return;
    }

    setSavingPost(true);
    setStatus("");

    try {
      const payload = buildPostPayload(editor, session.user.id);
      const { error } = editor.id
        ? await supabase.from("posts").update(payload).eq("id", editor.id)
        : await supabase.from("posts").insert(payload);

      if (error) throw error;

      setEditor(emptyPost);
      setComposerOpen(false);
      markRateLimitAction("post-save");
      await reloadPosts();
      setStatus("記事を保存しました。");
    } catch (error) {
      setStatus(error.message || "記事の保存に失敗しました。");
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
      await reloadPosts();
      setStatus("記事を削除しました。");
    } catch (error) {
      setStatus(error.message || "記事の削除に失敗しました。");
    } finally {
      setDeletingPostId("");
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
      setStatus(error.message || "カバー画像のアップロードに失敗しました。");
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
      setStatus(error.message || "投稿メディアのアップロードに失敗しました。");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  }

  function openNewComposer() {
    setEditor(emptyPost);
    setComposerOpen(true);
    setStatus("");
  }

  function openExistingPost(post) {
    setEditor(mapPostToEditor(post));
    setComposerOpen(true);
    setStatus("");
  }

  return (
    <div className="post-manager-embedded">
      <div className="post-manager-toolbar">
        <div className="post-manager-copy">
          <p className="eyebrow">Owner tools</p>
          <strong>{title}</strong>
          <span>{status || "記事の追加・更新・削除はここで行えます。"}</span>
        </div>

        <div className="hero-actions">
          <button type="button" className="button button-primary" onClick={openNewComposer}>
            新規記事
          </button>
          {composerOpen ? (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setComposerOpen(false);
                setEditor(emptyPost);
              }}
            >
              閉じる
            </button>
          ) : null}
        </div>
      </div>

      {composerOpen ? (
        <form className="surface form-stack post-manager-composer" onSubmit={savePost}>
          <div>
            <p className="eyebrow">Post editor</p>
            <h3>{editor.id ? "記事を編集" : "新規記事を作成"}</h3>
          </div>

          <label className="field">
            <span>タイトル</span>
            <input
              value={editor.title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setEditor((current) => ({
                  ...current,
                  title: nextTitle,
                  slug: current.id ? current.slug : normalizeSlug(nextTitle)
                }));
              }}
              placeholder="自己紹介に代わる記事タイトル"
              maxLength={POST_TITLE_LIMIT}
              required
            />
          </label>

          <label className="field">
            <span>slug</span>
            <input
              value={editor.slug}
              onChange={(event) => setEditor((current) => ({ ...current, slug: event.target.value }))}
              placeholder="my-first-post"
              required
            />
          </label>

          <label className="field">
            <span>要約</span>
            <textarea
              rows="3"
              value={editor.excerpt}
              onChange={(event) => setEditor((current) => ({ ...current, excerpt: event.target.value }))}
              placeholder="一覧に表示される短い紹介文"
              maxLength={POST_EXCERPT_LIMIT}
            />
          </label>

          <label className="field">
            <span>本文</span>
            <textarea
              rows="10"
              value={editor.body}
              onChange={(event) => setEditor((current) => ({ ...current, body: event.target.value }))}
              placeholder="段落を空行で区切って書くシンプルエディタです。"
              maxLength={POST_BODY_LIMIT}
            />
          </label>

          <label className="field">
            <span>タグ</span>
            <input
              value={editor.tags_input}
              onChange={(event) => setEditor((current) => ({ ...current, tags_input: event.target.value }))}
              placeholder="design, research, web"
              maxLength={POST_TAG_LIMIT * 24}
            />
            <small className="field-hint">カンマ区切りで複数指定できます。</small>
          </label>

          <label className="field">
            <span>カバー画像 URL</span>
            <input
              value={editor.cover_image_url}
              onChange={(event) => setEditor((current) => ({ ...current, cover_image_url: event.target.value }))}
              placeholder="https://example.com/cover.jpg"
            />
            <div className="upload-row">
              <label className="button button-secondary upload-button">
                {uploadingCover ? "アップロード中..." : "カバー画像をアップロード"}
                <input type="file" accept="image/*" onChange={handleCoverUpload} disabled={uploadingCover} />
              </label>
            </div>
          </label>

          <label className="field">
            <span>メディア URL 一覧</span>
            <textarea
              rows="4"
              value={editor.media_input}
              onChange={(event) => setEditor((current) => ({ ...current, media_input: event.target.value }))}
              placeholder={"image https://example.com/photo.jpg\nvideo https://example.com/movie.mp4"}
            />
            <small className="field-hint">1行ごとに `image URL` または `video URL` を指定します。</small>
            <div className="upload-row">
              <label className="button button-secondary upload-button">
                {uploadingMedia ? "アップロード中..." : "画像・動画を追加"}
                <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} disabled={uploadingMedia} />
              </label>
            </div>
          </label>

          <label className="field">
            <span>公開範囲</span>
            <select
              value={editor.visibility}
              onChange={(event) => setEditor((current) => ({ ...current, visibility: event.target.value }))}
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </label>

          <label className="field">
            <span>予約公開日時</span>
            <input
              type="datetime-local"
              value={editor.scheduled_for}
              onChange={(event) => setEditor((current) => ({ ...current, scheduled_for: event.target.value }))}
            />
            <small className="field-hint">未来の日時を入れると、その時刻まで公開フィードに出ません。</small>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editor.allow_comments}
              onChange={(event) => setEditor((current) => ({ ...current, allow_comments: event.target.checked }))}
            />
            <span>コメントを許可する</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editor.published}
              onChange={(event) => setEditor((current) => ({ ...current, published: event.target.checked }))}
            />
            <span>公開状態にする</span>
          </label>

          <div className="hero-actions">
            <button type="submit" className="button button-primary" disabled={savingPost}>
              {savingPost ? "保存中..." : editor.id ? "記事を更新" : "記事を追加"}
            </button>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => {
                setEditor(emptyPost);
                setComposerOpen(false);
              }}
            >
              入力をリセット
            </button>
          </div>
        </form>
      ) : null}

      <div className="post-manager-list">
        {posts.length ? (
          posts.map((post) => (
            <article key={post.id} className="post-row-card">
              <div className="post-row-body">
                <div className="post-row-meta">
                  <strong>{post.title}</strong>
                  <span className={`pill ${resolvePostPill(post).className}`}>{resolvePostPill(post).label}</span>
                </div>
                <p>{post.excerpt || "要約なし"}</p>
                <div className="inline-meta">
                  <span>{post.visibility || "public"}</span>
                  <span>{formatSchedule(post.scheduled_for)}</span>
                  <span>{Array.isArray(post.tags) ? post.tags.length : 0} tags</span>
                </div>
                {username ? (
                  <Link href={`/@${username}/${post.slug}`} className="text-button">
                    公開ページを見る
                  </Link>
                ) : null}
              </div>

              <div className="secondary-actions">
                <button type="button" className="button button-secondary" onClick={() => openExistingPost(post)}>
                  編集
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  disabled={deletingPostId === post.id}
                  onClick={() => removePost(post.id)}
                >
                  {deletingPostId === post.id ? "削除中..." : "削除"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-inline">まだ記事がありません。</div>
        )}
      </div>
    </div>
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
  if (!post.published) return { className: "draft", label: "下書き" };
  if (post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()) {
    return { className: "scheduled", label: "予約中" };
  }
  if (post.visibility === "private") return { className: "draft", label: "非公開" };
  if (post.visibility === "unlisted") return { className: "scheduled", label: "限定公開" };
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

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

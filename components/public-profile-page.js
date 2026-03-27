"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { ProfilePostManager } from "@/components/profile-post-manager";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { AVATAR_MAX_BYTES, PROFILE_BIO_LIMIT, PROFILE_HEADLINE_LIMIT, PROFILE_LOCATION_LIMIT, PROFILE_OPEN_TO_LIMIT } from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getAvatarBucket, uploadPublicFile } from "@/lib/storage";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

export function PublicProfilePage({ profile, posts }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState(profile);
  const [postItems, setPostItems] = useState(posts);
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState("");
  const canEdit = session?.user?.id === profile.id;

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    setPostItems(posts);
  }, [posts]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(currentSession);
      }
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const links = [
    { label: "Website", href: sanitizeExternalUrl(draft.website_url), key: "website_url" },
    { label: "X", href: sanitizeExternalUrl(draft.x_url), key: "x_url" },
    { label: "GitHub", href: sanitizeExternalUrl(draft.github_url), key: "github_url" },
    { label: "note", href: sanitizeExternalUrl(draft.note_url), key: "note_url" }
  ].filter((item) => item.href || isEditing);

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    if (!canEdit) return;

    setSaving(true);
    setStatus("");

    const nextUsername = normalizeUsername(draft.username || profile.username);
    const payload = {
      id: profile.id,
      username: nextUsername,
      page_theme: draft.page_theme || "default",
      display_name: `${draft.display_name || ""}`.trim(),
      headline: `${draft.headline || ""}`.trim(),
      affiliation: `${draft.affiliation || ""}`.trim(),
      focus_area: `${draft.focus_area || ""}`.trim(),
      open_to: `${draft.open_to || ""}`.trim(),
      bio: `${draft.bio || ""}`.trim(),
      location: `${draft.location || ""}`.trim(),
      website_url: sanitizeExternalUrl(draft.website_url) || "",
      x_url: sanitizeExternalUrl(draft.x_url) || "",
      github_url: sanitizeExternalUrl(draft.github_url) || "",
      note_url: sanitizeExternalUrl(draft.note_url) || "",
      avatar_url: sanitizeHttpUrl(draft.avatar_url) || "",
      discoverable: draft.discoverable !== false
    };

    try {
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      setDraft((current) => ({ ...current, username: nextUsername }));
      setIsEditing(false);
      setStatus("公開ページを保存しました。");
      router.refresh();

      if (nextUsername !== profile.username) {
        window.location.assign(`/@${nextUsername}`);
      }
    } catch (error) {
      setStatus(error.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !canEdit) return;
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
        userId: profile.id,
        file,
        folder: "avatars"
      });

      setDraft((current) => ({ ...current, avatar_url: publicUrl }));
      setStatus("プロフィール画像をアップロードしました。保存すると公開ページに反映されます。");
    } catch (error) {
      setStatus(error.message || "プロフィール画像のアップロードに失敗しました。");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  return (
    <main className="shell narrow-shell">
      <Link href="/" className="back-link">
        ← ホームへ戻る
      </Link>

      {canEdit ? (
        <div className="signature-owner-toolbar">
          <strong>Owner mode</strong>
          <span>{status || "この公開プロフィールを直接編集できます。"}</span>
          <div className="hero-actions">
            {isEditing ? (
              <>
                <button type="button" className="button button-primary" disabled={saving} onClick={saveProfile}>
                  {saving ? "保存中..." : "公開ページを保存"}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => {
                    setDraft(profile);
                    setIsEditing(false);
                    setStatus("");
                  }}
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button type="button" className="button button-primary" onClick={() => setIsEditing(true)}>
                このページを編集
              </button>
            )}
          </div>
        </div>
      ) : null}

      <section className="surface profile-hero">
        <AvatarMark profile={draft} size="lg" />
        <div className="profile-hero-copy">
          {isEditing ? (
            <>
              <label className="profile-public-handle">
                <span className="sr-only">username</span>
                <span className="profile-public-prefix">@</span>
                <input value={draft.username || ""} onChange={(event) => updateField("username", event.target.value)} />
              </label>
              <label className="profile-public-title">
                <span className="sr-only">表示名</span>
                <input value={draft.display_name || ""} onChange={(event) => updateField("display_name", event.target.value)} />
              </label>
              <label className="profile-public-headline">
                <span className="sr-only">肩書き</span>
                <textarea
                  rows="2"
                  value={draft.headline || ""}
                  onChange={(event) => updateField("headline", event.target.value)}
                  maxLength={PROFILE_HEADLINE_LIMIT}
                />
              </label>
              <label className="profile-public-bio">
                <span className="sr-only">自己紹介</span>
                <textarea
                  rows="5"
                  value={draft.bio || ""}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={PROFILE_BIO_LIMIT}
                />
              </label>
            </>
          ) : (
            <>
              <p className="eyebrow">@{draft.username}</p>
              <h1>{draft.display_name || draft.username}</h1>
              <p className="headline">{draft.headline || "肩書きはまだ未設定です。"}</p>
              <p>{draft.bio || "自己紹介はまだありません。"}</p>
            </>
          )}

          <div className="profile-meta">
            {isEditing ? (
              <label className="profile-public-location">
                <span className="sr-only">場所</span>
                <input
                  value={draft.location || ""}
                  onChange={(event) => updateField("location", event.target.value)}
                  maxLength={PROFILE_LOCATION_LIMIT}
                  placeholder="Tokyo / Remote"
                />
              </label>
            ) : draft.location ? (
              <span>{draft.location}</span>
            ) : (
              <span>Location not set</span>
            )}
          </div>

          {links.length ? (
            <div className="link-list">
              {links.map((link) =>
                isEditing ? (
                  <label key={link.key} className="profile-public-link">
                    <span>{link.label}</span>
                    <input
                      value={draft[link.key] || ""}
                      onChange={(event) => updateField(link.key, event.target.value)}
                      placeholder={`https://${link.label.toLowerCase()}.com/...`}
                    />
                  </label>
                ) : (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-secondary">
                    {link.label}
                  </a>
                )
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <p className="eyebrow">Profile</p>
          <h2>公開ページで編集</h2>
          <p>{isEditing ? "プロフィール項目はここで直接編集できます。" : "表示名や自己紹介以外の項目も、このページ上でまとめて編集できます。"}</p>
        </div>

        <div className="stack-list">
          <section className="surface form-stack">
            <div className="profile-public-grid">
              <label className="field">
                <span>所属</span>
                {isEditing ? (
                  <input value={draft.affiliation || ""} onChange={(event) => updateField("affiliation", event.target.value)} />
                ) : (
                  <div className="profile-public-value">{draft.affiliation || "未設定"}</div>
                )}
              </label>

              <label className="field">
                <span>関心・専門</span>
                {isEditing ? (
                  <input value={draft.focus_area || ""} onChange={(event) => updateField("focus_area", event.target.value)} />
                ) : (
                  <div className="profile-public-value">{draft.focus_area || "未設定"}</div>
                )}
              </label>
            </div>

            <label className="field">
              <span>チャット・トーク</span>
              {isEditing ? (
                <textarea
                  rows="4"
                  value={draft.open_to || ""}
                  onChange={(event) => updateField("open_to", event.target.value)}
                  maxLength={PROFILE_OPEN_TO_LIMIT}
                />
              ) : (
                <div className="profile-public-value">{draft.open_to || "未設定"}</div>
              )}
            </label>

            <div className="profile-public-grid">
              <label className="field">
                <span>ページテーマ</span>
                {isEditing ? (
                  <select value={draft.page_theme || "default"} onChange={(event) => updateField("page_theme", event.target.value)}>
                    <option value="default">Default</option>
                    <option value="signature">Signature</option>
                  </select>
                ) : (
                  <div className="profile-public-value">{draft.page_theme === "signature" ? "Signature" : "Default"}</div>
                )}
              </label>

              <label className="field">
                <span>一覧表示</span>
                {isEditing ? (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.discoverable !== false}
                      onChange={(event) => updateField("discoverable", event.target.checked)}
                    />
                    <span>Explore とおすすめに表示する</span>
                  </label>
                ) : (
                  <div className="profile-public-value">{draft.discoverable !== false ? "公開" : "非公開"}</div>
                )}
              </label>
            </div>

            <label className="field">
              <span>プロフィール画像 URL</span>
              {isEditing ? (
                <>
                  <input
                    value={draft.avatar_url || ""}
                    onChange={(event) => updateField("avatar_url", event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <div className="upload-row">
                    <label className="button button-secondary upload-button">
                      {uploadingAvatar ? "アップロード中..." : "画像をアップロード"}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                </>
              ) : (
                <div className="profile-public-value">{draft.avatar_url || "未設定"}</div>
              )}
            </label>
          </section>
        </div>
      </section>

      <ProfileSocialActions
        profileId={draft.id}
        username={draft.username}
        initialStats={draft.stats || { follower_count: 0, following_count: 0, public_post_count: postItems.length }}
      />
      <ReportAction targetProfileId={draft.id} label="プロフィールを通報" />

      {canEdit ? (
        <ProfilePostManager
          supabase={supabase}
          session={session}
          username={draft.username}
          posts={postItems}
          onPostsChange={setPostItems}
          title="公開ページで記事を管理"
        />
      ) : null}

      <section className="section-grid single-column">
        <div className="section-copy">
          <p className="eyebrow">Posts</p>
          <h2>公開記事</h2>
        </div>

        <div className="stack-list">
          {postItems.length ? (
            postItems.map((post) => (
              <Link key={post.id} href={`/@${draft.username}/${post.slug}`} className="surface post-card">
                <div className="post-card-head">
                  <span>{formatDate(post.published_at || post.updated_at)}</span>
                  <span>{post.stats.like_count} likes</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt || "本文から紹介文を追加してください。"}</p>
                {post.tags.length ? (
                  <div className="tag-row">
                    {post.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            ))
          ) : (
            <div className="surface empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>このユーザーはまだ公開記事を投稿していません。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function normalizeUsername(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

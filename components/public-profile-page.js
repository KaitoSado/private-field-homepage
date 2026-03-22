"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { PROFILE_BIO_LIMIT, PROFILE_HEADLINE_LIMIT, PROFILE_LOCATION_LIMIT } from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

export function PublicProfilePage({ profile, posts }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState(profile);
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const canEdit = session?.user?.id === profile.id;

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

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

      <ProfileSocialActions
        profileId={draft.id}
        username={draft.username}
        initialStats={draft.stats || { follower_count: 0, following_count: 0, public_post_count: posts.length }}
      />
      <ReportAction targetProfileId={draft.id} label="プロフィールを通報" />

      <section className="section-grid single-column">
        <div className="section-copy">
          <p className="eyebrow">Posts</p>
          <h2>公開記事</h2>
        </div>

        <div className="stack-list">
          {posts.length ? (
            posts.map((post) => (
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

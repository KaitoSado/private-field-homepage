"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { SignatureHeroShader } from "@/components/signature-hero-shader";
import { SignatureHeroStage } from "@/components/signature-hero-stage";
import { SignatureInteractiveSection } from "@/components/signature-interactive-section";
import { SignaturePageShell } from "@/components/signature-page-shell";
import { SignaturePostShelf } from "@/components/signature-post-shelf";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { PROFILE_BIO_LIMIT, PROFILE_HEADLINE_LIMIT, PROFILE_LOCATION_LIMIT, PROFILE_OPEN_TO_LIMIT } from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

export function SignatureProfilePage({ profile, posts }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState(profile);
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
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

  const featuredPosts = posts.slice(0, 3);
  const recentPosts = posts.slice(0, 4);
  const latestPost = recentPosts[0] || null;
  const leadCopy = draft.headline || "Researching interaction, building thoughtful systems.";
  const identityBody =
    draft.bio ||
    "知覚、身体、記録、インターフェース。そのあいだを研究と実装の両方から往復しながら、触れる思考と残る体験をつくっています。";
  const collaborationLabel = draft.open_to ? "Open to collaboration" : "Quietly building";
  const links = [
    { label: "Website", href: sanitizeExternalUrl(draft.website_url), key: "website_url" },
    { label: "X", href: sanitizeExternalUrl(draft.x_url), key: "x_url" },
    { label: "GitHub", href: sanitizeExternalUrl(draft.github_url), key: "github_url" },
    { label: "note", href: sanitizeExternalUrl(draft.note_url), key: "note_url" }
  ].filter((item) => item.href || isEditing);
  const infoCards = [
    {
      eyebrow: "Affiliation",
      key: "affiliation",
      title: draft.affiliation || "Independent / research-linked",
      body: ""
    },
    {
      eyebrow: "Focus",
      key: "focus_area",
      title: draft.focus_area || "HCI / Prototyping / Experimental Web",
      body: ""
    },
    {
      eyebrow: "Base",
      key: "location",
      title: draft.location || "Tokyo / Remote",
      body: ""
    }
  ];
  const currentSignals = buildCurrentSignals(draft, recentPosts);

  async function saveProfile() {
    if (!canEdit) return;

    setSaving(true);
    setStatus("");

    const nextUsername = normalizeUsername(draft.username || profile.username);
    const payload = {
      id: profile.id,
      username: nextUsername,
      page_theme: draft.page_theme || "signature",
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
        return;
      }
    } catch (error) {
      setStatus(error.message || "保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <SignaturePageShell>
      <div className="signature-noise" aria-hidden="true" />
      <div className="signature-glow signature-glow-a" aria-hidden="true" />
      <div className="signature-glow signature-glow-b" aria-hidden="true" />

      {canEdit ? (
        <div className="signature-owner-toolbar">
          <strong>Owner mode</strong>
          <span>{status || "この公開ページを直接編集できます。"}</span>
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

      <nav className="signature-local-nav" aria-label="Profile sections">
        <a href="#signature-identity">Identity</a>
        <a href="#signature-current">Current</a>
        <a href="#signature-works">Works</a>
        <a href="#signature-thinking">Thinking</a>
        <a href="#signature-contact">Contact</a>
      </nav>

      <SignatureHeroStage>
        <SignatureHeroShader />
        <div className="signature-hero-copy">
          <div className="signature-topline">
            <p className="signature-kicker">A Quiet Field Between Research and Making</p>
            <span className="signature-status-pill">{collaborationLabel}</span>
          </div>
          <AvatarMark profile={draft} size="lg" />
          {isEditing ? (
            <>
              <label className="signature-edit-inline signature-edit-handle">
                <span className="sr-only">username</span>
                <div className="signature-edit-prefix">@</div>
                <input value={draft.username || ""} onChange={(event) => updateField("username", event.target.value)} />
              </label>
              <label className="signature-edit-inline signature-edit-title">
                <span className="sr-only">表示名</span>
                <input
                  value={draft.display_name || ""}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  placeholder="表示名"
                />
              </label>
              <label className="signature-edit-inline signature-edit-lead">
                <span className="sr-only">肩書き</span>
                <textarea
                  rows="2"
                  value={draft.headline || ""}
                  onChange={(event) => updateField("headline", event.target.value)}
                  maxLength={PROFILE_HEADLINE_LIMIT}
                  placeholder="Researching interaction, building thoughtful systems."
                />
              </label>
              <label className="signature-edit-inline">
                <span className="sr-only">自己紹介</span>
                <textarea
                  rows="5"
                  value={draft.bio || ""}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={PROFILE_BIO_LIMIT}
                  placeholder="自己紹介"
                />
              </label>
            </>
          ) : (
            <>
              <p className="signature-eyebrow">@{draft.username}</p>
              <h1>{draft.display_name || draft.username}</h1>
              <p className="signature-lead">{leadCopy}</p>
              <p className="signature-body">{identityBody}</p>
            </>
          )}

          <div className="hero-actions signature-hero-actions">
            <a className="button button-primary" href="#signature-works">
              作品を見る
            </a>
            <a className="button button-secondary" href="#signature-thinking">
              思考を読む
            </a>
            <a className="button button-ghost" href="#signature-contact">
              連絡する
            </a>
          </div>

          {links.length ? (
            <div className="signature-inline-links">
              {isEditing
                ? links.map((link) => (
                    <label key={link.key} className="signature-edit-inline signature-edit-link">
                      <span>{link.label}</span>
                      <input
                        value={draft[link.key] || ""}
                        onChange={(event) => updateField(link.key, event.target.value)}
                        placeholder={`https://${link.label.toLowerCase()}.com/...`}
                      />
                    </label>
                  ))
                : links.map((link) => (
                    <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ))}
            </div>
          ) : null}
        </div>

        <aside className="signature-panel">
          <p className="eyebrow">Current Coordinates</p>
          <dl className="signature-coordinates">
            <div>
              <dt>Handle</dt>
              <dd>@{draft.username}</dd>
            </div>
            <div>
              <dt>Base</dt>
              <dd>{draft.location || "Tokyo / Remote"}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{posts.length} posts</dd>
            </div>
            <div>
              <dt>Latest</dt>
              <dd>{latestPost ? formatDate(latestPost.published_at || latestPost.updated_at) : "Updating quietly"}</dd>
            </div>
            <div>
              <dt>Links</dt>
              <dd>{links.length ? `${links.length} destinations` : "No external links yet"}</dd>
            </div>
          </dl>
        </aside>
      </SignatureHeroStage>

      <ProfileSocialActions
        profileId={draft.id}
        username={draft.username}
        initialStats={draft.stats || { follower_count: 0, following_count: 0, public_post_count: posts.length }}
      />
      <ReportAction targetProfileId={draft.id} label="プロフィールを通報" />

      <SignatureInteractiveSection id="signature-identity">
        <div className="signature-section-head">
          <p className="eyebrow">Identity</p>
          <h2>研究し、つくり、観察し続ける。</h2>
        </div>
        <div className="signature-identity-grid">
          <article className="signature-statement-card">
            {isEditing ? (
              <textarea
                className="signature-edit-block"
                rows="5"
                value={draft.bio || ""}
                onChange={(event) => updateField("bio", event.target.value)}
                maxLength={PROFILE_BIO_LIMIT}
              />
            ) : (
              <p className="signature-body">{identityBody}</p>
            )}
          </article>
          <div className="signature-about-grid">
            {infoCards.map((card) => (
              <article key={card.eyebrow} className="signature-info-card">
                <p className="eyebrow">{card.eyebrow}</p>
                {isEditing ? (
                  <textarea
                    rows="2"
                    value={draft[card.key] || ""}
                    onChange={(event) => updateField(card.key, event.target.value)}
                  />
                ) : (
                  <h3>{card.title}</h3>
                )}
                {card.body ? <p>{card.body}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-current">
        <div className="signature-section-head">
          <p className="eyebrow">Current</p>
          <h2>This week, in motion</h2>
        </div>
        <div className="signature-current-grid">
          {currentSignals.map((signal) => (
            <article key={signal.label} className="signature-current-card">
              <p className="eyebrow">{signal.label}</p>
              <h3>{signal.title}</h3>
              <p>{signal.body}</p>
            </article>
          ))}
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-works">
        <div className="signature-section-head">
          <p className="eyebrow">Works</p>
          <h2>記事</h2>
        </div>
        {featuredPosts.length ? (
          <SignaturePostShelf username={draft.username} posts={featuredPosts} />
        ) : (
          <div className="signature-post-card empty-state">
            <h3>まだ記事がありません</h3>
            <p>最初の公開記事を追加するとここに出ます。</p>
          </div>
        )}
      </SignatureInteractiveSection>

      {links.length ? (
        <SignatureInteractiveSection id="signature-links">
          <div className="signature-section-head">
            <p className="eyebrow">Links</p>
            <h2>Outside the page</h2>
          </div>
          <div className="link-list">
            {links.map((link) =>
              isEditing ? (
                <label key={link.key} className="signature-edit-inline signature-edit-link-card">
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
        </SignatureInteractiveSection>
      ) : null}

      <SignatureInteractiveSection id="signature-thinking">
        <div className="signature-section-head">
          <p className="eyebrow">Thinking</p>
          <h2>Current signals</h2>
          <p>最近の記録や途中経過を、ログの断片のように並べています。</p>
        </div>

        <div className="signature-signals">
          {recentPosts.length ? (
            recentPosts.map((post) => (
              <Link key={post.id} href={`/@${draft.username}/${post.slug}`} className="signature-signal-line">
                <span className="signature-signal-date">{formatDate(post.published_at || post.updated_at)}</span>
                <div>
                  <strong>{post.title}</strong>
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
                </div>
              </Link>
            ))
          ) : (
            <div className="signature-post-card empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>ここには最新の公開更新が並びます。</p>
            </div>
          )}
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-contact">
        <div className="signature-section-head">
          <p className="eyebrow">Collaboration</p>
          <h2>チャット・トーク</h2>
        </div>
        <div className="signature-contact-card">
          {isEditing ? (
            <textarea
              className="signature-edit-block"
              rows="4"
              value={draft.open_to || ""}
              onChange={(event) => updateField("open_to", event.target.value)}
              maxLength={PROFILE_OPEN_TO_LIMIT}
            />
          ) : (
            <p>
              {draft.open_to ||
                "研究プロトタイプ、実験用UI、文化系プロジェクト、個人開発の技術相談などを受けています。"}
            </p>
          )}
          <div className="link-list">
            {links.length ? (
              links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-primary">
                  {link.label}
                </a>
              ))
            ) : (
              <Link href="/settings" className="button button-secondary">
                リンクを設定する
              </Link>
            )}
          </div>
        </div>
      </SignatureInteractiveSection>
    </SignaturePageShell>
  );
}

function buildCurrentSignals(profile, recentPosts) {
  const latestPost = recentPosts[0] || null;
  const latestTag = latestPost?.tags?.[0] || null;

  return [
    {
      label: "Latest note",
      title: latestPost?.title || "新しい公開ノートを準備中",
      body: latestPost ? "直近で更新した記録。ここからいまの関心が見えます。" : "次の公開記事がここに出ます。"
    },
    {
      label: "Signal",
      title: latestTag ? `#${latestTag}` : profile.focus_area || "Perception / Interfaces / Prototyping",
      body: latestTag ? "いま繰り返し現れているキーワード。" : "現在の制作や研究を貫いている軸。"
    },
    {
      label: "Cadence",
      title: latestPost ? formatDate(latestPost.published_at || latestPost.updated_at) : "Updating quietly",
      body: latestPost ? "最後にページが動いたタイミング。" : "いまは次の更新に向けて整えています。"
    }
  ];
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

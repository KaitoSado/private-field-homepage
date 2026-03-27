"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { SignatureHeroShader } from "@/components/signature-hero-shader";
import { SignatureHeroStage } from "@/components/signature-hero-stage";
import { SignatureInteractiveSection } from "@/components/signature-interactive-section";
import { SignaturePageShell } from "@/components/signature-page-shell";
import { ProfilePostManager } from "@/components/profile-post-manager";
import { SignaturePostShelf } from "@/components/signature-post-shelf";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { PROFILE_BIO_LIMIT, PROFILE_HEADLINE_LIMIT, PROFILE_LOCATION_LIMIT, PROFILE_OPEN_TO_LIMIT } from "@/lib/limits";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

const DEFAULT_IDENTITY_HEADING = "なんか書ける";
const SIGNATURE_META_MARKER = "[[signature-meta::";
const IDENTITY_MARKER = "[[identity-heading::";
const SCHEDULE_DAYS = [
  { key: "mon", label: "Mon", short: "月" },
  { key: "tue", label: "Tue", short: "火" },
  { key: "wed", label: "Wed", short: "水" },
  { key: "thu", label: "Thu", short: "木" },
  { key: "fri", label: "Fri", short: "金" },
  { key: "sat", label: "Sat", short: "土" },
  { key: "sun", label: "Sun", short: "日" }
];
const SCHEDULE_PERIODS = [
  { key: "period1", label: "1限", time: "09:00 - 10:30" },
  { key: "period2", label: "2限", time: "10:40 - 12:10" },
  { key: "period3", label: "3限", time: "13:00 - 14:30" },
  { key: "period4", label: "4限", time: "14:45 - 16:15" },
  { key: "period5", label: "5限", time: "16:30 - 18:00" }
];

export function SignatureProfilePage({ profile, posts }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState(() => inflateSignatureProfile(profile));
  const [postItems, setPostItems] = useState(posts);
  const [session, setSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = session?.user?.id === profile.id;

  useEffect(() => {
    setDraft(inflateSignatureProfile(profile));
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

  const featuredPosts = postItems.slice(0, 3);
  const recentPosts = postItems.slice(0, 4);
  const latestPost = recentPosts[0] || null;
  const leadCopy = draft.headline || "なんか書ける";
  const identityBody =
    draft.bio ||
    "知覚、身体、記録、インターフェース。そのあいだを研究と実装の両方から往復しながら、触れる思考と残る体験をつくっています。";
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
  const currentEntries = mergeCurrentEntries(draft.current_entries, buildDefaultCurrentEntries());
  const weeklySchedule = mergeWeeklySchedule(draft.weekly_schedule);
  const recordItems = mergeRecordItems(draft.record_items, buildDefaultRecordItems());
  const defaultLeadCopy = "なんか書ける";

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
      affiliation: packSignatureAffiliation(draft.affiliation, draft.identity_heading, currentEntries, weeklySchedule, recordItems),
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

  function updateCurrentEntry(index, key, value) {
    setDraft((current) => {
      const nextEntries = mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      );

      return { ...current, current_entries: nextEntries };
    });
  }

  function updateScheduleCell(dayKey, periodKey, value) {
    setDraft((current) => {
      const nextSchedule = mergeWeeklySchedule(current.weekly_schedule);
      return {
        ...current,
        weekly_schedule: {
          ...nextSchedule,
          [dayKey]: {
            ...nextSchedule[dayKey],
            [periodKey]: value
          }
        }
      };
    });
  }

  function updateRecordItem(index, key, value) {
    setDraft((current) => {
      const nextRecords = mergeRecordItems(current.record_items, buildDefaultRecordItems()).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      );

      return { ...current, record_items: nextRecords };
    });
  }

  function startEditing() {
    setDraft((current) => ({
      ...current,
      headline: current.headline || defaultLeadCopy,
      identity_heading: current.identity_heading || DEFAULT_IDENTITY_HEADING,
      current_entries: mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()),
      weekly_schedule: mergeWeeklySchedule(current.weekly_schedule),
      record_items: mergeRecordItems(current.record_items, buildDefaultRecordItems())
    }));
    setIsEditing(true);
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
                    setDraft(inflateSignatureProfile(profile));
                    setIsEditing(false);
                    setStatus("");
                  }}
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button type="button" className="button button-primary" onClick={startEditing}>
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
        <a href="#signature-thinking">Records</a>
        <a href="#signature-contact">Contact</a>
      </nav>

      <SignatureHeroStage>
        <SignatureHeroShader />
        <div className="signature-hero-copy">
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
                  placeholder="なんか書ける"
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
              <dd>{postItems.length} posts</dd>
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
        initialStats={draft.stats || { follower_count: 0, following_count: 0, public_post_count: postItems.length }}
      />
      <ReportAction targetProfileId={draft.id} label="プロフィールを通報" />

      <SignatureInteractiveSection id="signature-identity">
        <div className="signature-section-head">
          <p className="eyebrow">Identity</p>
          {isEditing ? (
            <textarea
              className="signature-edit-title-block"
              rows="2"
              value={draft.identity_heading || ""}
              onChange={(event) => updateField("identity_heading", event.target.value)}
            />
          ) : (
            <h2>{draft.identity_heading || DEFAULT_IDENTITY_HEADING}</h2>
          )}
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
          <h2>何してる？</h2>
        </div>
        <div className="signature-current-layout">
          <div className="signature-current-grid">
            {currentEntries.map((entry, index) => (
              <article key={`current-entry-${index}`} className="signature-current-card">
                {isEditing ? (
                  <input
                    className="signature-current-label-input eyebrow"
                    value={entry.label || ""}
                    onChange={(event) => updateCurrentEntry(index, "label", event.target.value)}
                    maxLength={PROFILE_LOCATION_LIMIT}
                    placeholder="日付"
                  />
                ) : (
                  <p className="eyebrow">{entry.label}</p>
                )}
                {isEditing ? (
                  <>
                    <input
                      value={entry.title || ""}
                      onChange={(event) => updateCurrentEntry(index, "title", event.target.value)}
                      maxLength={PROFILE_HEADLINE_LIMIT}
                      placeholder="見出し"
                    />
                    <textarea
                      rows="4"
                      value={entry.body || ""}
                      onChange={(event) => updateCurrentEntry(index, "body", event.target.value)}
                      maxLength={PROFILE_BIO_LIMIT}
                      placeholder="内容"
                    />
                  </>
                ) : (
                  <>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                  </>
                )}
              </article>
            ))}
          </div>

          <article className="signature-schedule-card">
            <div className="signature-schedule-head">
              <p className="eyebrow">Week</p>
              <h3>デフォルト予定</h3>
            </div>
            <div className="signature-schedule-wrap">
              <table className="signature-schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    {SCHEDULE_DAYS.map((day) => (
                      <th key={day.key}>
                        <span>{day.short}</span>
                        <small>{day.label}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_PERIODS.map((period) => (
                    <tr key={period.key}>
                      <th>
                        <span>{period.label}</span>
                        <small>{period.time}</small>
                      </th>
                      {SCHEDULE_DAYS.map((day) => (
                        <td key={`${day.key}-${period.key}`}>
                          {isEditing ? (
                            <textarea
                              rows="2"
                              value={weeklySchedule[day.key]?.[period.key] || ""}
                              onChange={(event) => updateScheduleCell(day.key, period.key, event.target.value)}
                              maxLength={PROFILE_HEADLINE_LIMIT}
                              placeholder="授業 / 制作 / 移動"
                            />
                          ) : (
                            <span>{weeklySchedule[day.key]?.[period.key] || "空き"}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-works">
        <div className="signature-section-head">
          <p className="eyebrow">Works</p>
          <h2>記事</h2>
        </div>
        {isEditing ? (
          <ProfilePostManager
            supabase={supabase}
            session={session}
            username={draft.username}
            posts={postItems}
            onPostsChange={setPostItems}
            title="記事を管理"
          />
        ) : featuredPosts.length ? (
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
          <p className="eyebrow">Records</p>
          <h2>記録したいこと</h2>
        </div>

        <div className="signature-record-grid">
          {recordItems.map((item, index) => (
            <article key={`record-item-${index}`} className="signature-record-card">
              {isEditing ? (
                <>
                  <input
                    className="signature-record-title"
                    value={item.title || ""}
                    onChange={(event) => updateRecordItem(index, "title", event.target.value)}
                    maxLength={PROFILE_LOCATION_LIMIT}
                    placeholder="項目名"
                  />
                  <textarea
                    rows="4"
                    value={item.body || ""}
                    onChange={(event) => updateRecordItem(index, "body", event.target.value)}
                    maxLength={PROFILE_BIO_LIMIT}
                    placeholder="どんなふうに記録したいか"
                  />
                </>
              ) : (
                <>
                  <h3>{item.title}</h3>
                  <p>{item.body || "ここに記録を書けます。"}</p>
                </>
              )}
            </article>
          ))}
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

function buildDefaultCurrentEntries() {
  return [
    {
      label: "",
      title: "",
      body: ""
    },
    {
      label: "",
      title: "",
      body: ""
    },
    {
      label: "",
      title: "",
      body: ""
    }
  ];
}

function buildDefaultWeeklySchedule() {
  return {
    mon: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    tue: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    wed: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    thu: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    fri: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    sat: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" },
    sun: { period1: "空き", period2: "空き", period3: "空き", period4: "空き", period5: "空き" }
  };
}

function buildDefaultRecordItems() {
  return [
    { title: "食事", body: "" },
    { title: "睡眠", body: "" },
    { title: "運動", body: "" },
    { title: "勉強", body: "" },
    { title: "読書", body: "" }
  ];
}

function mergeCurrentEntries(currentEntries, defaults) {
  return defaults.map((fallback, index) => {
    const current = currentEntries?.[index] || {};
    return {
      label: `${current.label || ""}`.trim() || fallback.label,
      title: `${current.title || ""}`.trim() || fallback.title,
      body: `${current.body || ""}`.trim() || fallback.body
    };
  });
}

function mergeWeeklySchedule(weeklySchedule) {
  const defaults = buildDefaultWeeklySchedule();
  return Object.fromEntries(
    SCHEDULE_DAYS.map((day) => [
      day.key,
      Object.fromEntries(
        SCHEDULE_PERIODS.map((period) => [
          period.key,
          `${weeklySchedule?.[day.key]?.[period.key] ?? defaults[day.key][period.key] ?? ""}`
        ])
      )
    ])
  );
}

function mergeRecordItems(recordItems, defaults) {
  return defaults.map((fallback, index) => {
    const current = recordItems?.[index] || {};
    return {
      title: `${current.title || ""}`.trim() || fallback.title,
      body: `${current.body || ""}`.trim() || fallback.body
    };
  });
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

function inflateSignatureProfile(profile) {
  const { heading, affiliation, currentEntries, weeklySchedule, recordItems } = unpackSignatureAffiliation(profile.affiliation);

  return {
    ...profile,
    affiliation,
    identity_heading: heading || DEFAULT_IDENTITY_HEADING,
    current_entries: currentEntries,
    weekly_schedule: weeklySchedule,
    record_items: recordItems
  };
}

function unpackSignatureAffiliation(value) {
  const raw = `${value || ""}`;
  if (raw.startsWith(SIGNATURE_META_MARKER)) {
    const markerEnd = raw.indexOf("]]");
    if (markerEnd !== -1) {
      try {
        const meta = JSON.parse(decodeURIComponent(raw.slice(SIGNATURE_META_MARKER.length, markerEnd)));
        return {
          heading: meta.identity_heading || "",
          affiliation: raw.slice(markerEnd + 2).replace(/^\s+/, ""),
          currentEntries: Array.isArray(meta.current_entries) ? meta.current_entries : [],
          weeklySchedule: meta.weekly_schedule && typeof meta.weekly_schedule === "object" ? meta.weekly_schedule : {},
          recordItems: Array.isArray(meta.record_items) ? meta.record_items : []
        };
      } catch {
        return {
          heading: "",
          affiliation: raw,
          currentEntries: [],
          weeklySchedule: {},
          recordItems: []
        };
      }
    }
  }

  if (!raw.startsWith(IDENTITY_MARKER)) {
    return {
      heading: "",
      affiliation: raw,
      currentEntries: [],
      weeklySchedule: {},
      recordItems: []
    };
  }

  const markerEnd = raw.indexOf("]]");
  if (markerEnd === -1) {
    return {
      heading: "",
      affiliation: raw,
      currentEntries: [],
      weeklySchedule: {},
      recordItems: []
    };
  }

  const heading = raw.slice(IDENTITY_MARKER.length, markerEnd);
  const affiliation = raw.slice(markerEnd + 2).replace(/^\s+/, "");

  return {
    heading,
    affiliation,
    currentEntries: [],
    weeklySchedule: {},
    recordItems: []
  };
}

function packSignatureAffiliation(affiliation, heading, currentEntries, weeklySchedule, recordItems) {
  const trimmedAffiliation = `${affiliation || ""}`.trim();
  const trimmedHeading = `${heading || ""}`.trim() || DEFAULT_IDENTITY_HEADING;
  const meta = encodeURIComponent(
    JSON.stringify({
      identity_heading: trimmedHeading,
      current_entries: mergeCurrentEntries(currentEntries, buildDefaultCurrentEntries()).map((entry) => ({
        label: `${entry.label || ""}`.trim(),
        title: `${entry.title || ""}`.trim(),
        body: `${entry.body || ""}`.trim()
      })),
      weekly_schedule: mergeWeeklySchedule(weeklySchedule),
      record_items: mergeRecordItems(recordItems, buildDefaultRecordItems()).map((item) => ({
        title: `${item.title || ""}`.trim(),
        body: `${item.body || ""}`.trim()
      }))
    })
  );

  return `${SIGNATURE_META_MARKER}${meta}]]${trimmedAffiliation ? `\n${trimmedAffiliation}` : ""}`;
}

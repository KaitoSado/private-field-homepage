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
import { KeioBadge } from "@/components/keio-badge";
import { ExternalLink } from "@/components/external-link";
import { AVATAR_MAX_BYTES, PROFILE_BIO_LIMIT, PROFILE_HEADLINE_LIMIT, PROFILE_LOCATION_LIMIT, PROFILE_OPEN_TO_LIMIT } from "@/lib/limits";
import {
  buildRenderedProfileLinks,
  getFixedLinkFields,
  inflateCustomLinks,
  normalizeCustomLinks
} from "@/lib/profile-links";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getAvatarBucket, uploadPublicFile } from "@/lib/storage";
import { sanitizeExternalUrl, sanitizeHttpUrl } from "@/lib/url";

const DEFAULT_IDENTITY_HEADING = "なんか書ける";
const DEFAULT_RECORD_HEADING = "記録したいこと";
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [expandedCurrentEntries, setExpandedCurrentEntries] = useState({});
  const [expandedRecordItems, setExpandedRecordItems] = useState({});
  const [showAllCurrentEntries, setShowAllCurrentEntries] = useState(false);
  const [postCreateSignal, setPostCreateSignal] = useState(0);
  const [postManagerOpen, setPostManagerOpen] = useState(false);
  const [questionItems, setQuestionItems] = useState([]);
  const [questionInput, setQuestionInput] = useState("");
  const [questionDrafts, setQuestionDrafts] = useState({});
  const [questionStatus, setQuestionStatus] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState("");
  const [deletingQuestionId, setDeletingQuestionId] = useState("");
  const canEdit = session?.user?.id === profile.id;
  const canRevealQuestionSender = canEdit && profile.username === "kaito-sado";
  const shouldShowQuestionStatus =
    Boolean(questionStatus) &&
    !(questionsLoaded && questionStatus.includes("最新の Supabase schema"));

  useEffect(() => {
    setDraft(inflateSignatureProfile(profile));
    setExpandedCurrentEntries({});
    setExpandedRecordItems({});
    setShowAllCurrentEntries(false);
    setPostManagerOpen(false);
  }, [profile]);

  useEffect(() => {
    setPostItems(posts);
  }, [posts]);

  useEffect(() => {
    if (!supabase || !profile?.id) return;

    let active = true;

    async function loadQuestions() {
      setLoadingQuestions(true);
      setQuestionsLoaded(false);
      const questionSelect = canRevealQuestionSender
        ? "id, question, answer, created_at, updated_at, sender_profile_id, sender:profiles!anonymous_questions_sender_profile_id_fkey(id, username, display_name, avatar_url)"
        : "id, question, answer, created_at, updated_at";

      const { data, error } = await supabase
        .from("anonymous_questions")
        .select(questionSelect)
        .eq("recipient_id", profile.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        setQuestionStatus(
          error.message?.includes("anonymous_questions")
            ? "匿名質問箱を使うには最新の Supabase schema を適用してください。"
            : error.message || "質問箱の読み込みに失敗しました。"
        );
      } else {
        setQuestionItems(data || []);
        setQuestionDrafts(
          Object.fromEntries((data || []).map((item) => [item.id, item.answer || ""]))
        );
        setQuestionStatus("");
        setQuestionsLoaded(true);
      }

      setLoadingQuestions(false);
    }

    loadQuestions();

    return () => {
      active = false;
    };
  }, [supabase, profile?.id, session?.user?.id, canRevealQuestionSender]);

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

  const recentPosts = postItems.slice(0, 4);
  const latestPost = recentPosts[0] || null;
  const fixedLinkFields = getFixedLinkFields();
  const leadCopy = draft.headline || "なんか書ける";
  const identityBody =
    draft.bio ||
    "知覚、身体、記録、インターフェース。そのあいだを研究と実装の両方から往復しながら、触れる思考と残る体験をつくっています。";
  const customLinks = inflateCustomLinks(draft.custom_links);
  const links = buildRenderedProfileLinks(draft);
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
  const visibleCurrentEntries = isEditing
    ? currentEntries
    : showAllCurrentEntries || currentEntries.length <= 4
      ? currentEntries
      : currentEntries.slice(-4);
  const hiddenCurrentEntryCount = Math.max(0, currentEntries.length - visibleCurrentEntries.length);
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
      affiliation: packSignatureAffiliation(
        draft.affiliation,
        draft.identity_heading,
        currentEntries,
        weeklySchedule,
        draft.schedule_note,
        recordItems,
        draft.record_heading
      ),
      focus_area: `${draft.focus_area || ""}`.trim(),
      open_to: `${draft.open_to || ""}`.trim(),
      bio: `${draft.bio || ""}`.trim(),
      location: `${draft.location || ""}`.trim(),
      website_url: sanitizeExternalUrl(draft.website_url) || "",
      x_url: sanitizeExternalUrl(draft.x_url) || "",
      github_url: sanitizeExternalUrl(draft.github_url) || "",
      note_url: sanitizeExternalUrl(draft.note_url) || "",
      avatar_url: sanitizeHttpUrl(draft.avatar_url) || "",
      custom_links: normalizeCustomLinks(draft.custom_links),
      discoverable: draft.discoverable !== false
    };

    try {
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;

      setDraft((current) => ({ ...current, username: nextUsername }));
      setIsEditing(false);
      setExpandedCurrentEntries({});
      setExpandedRecordItems({});
      setShowAllCurrentEntries(false);
      setPostManagerOpen(false);
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

  function updateCustomLink(index, key, value) {
    setDraft((current) => ({
      ...current,
      custom_links: inflateCustomLinks(current.custom_links).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  function addCustomLink() {
    setDraft((current) => ({
      ...current,
      custom_links: [...inflateCustomLinks(current.custom_links), { label: "", href: "" }]
    }));
  }

  function removeCustomLink(index) {
    setDraft((current) => ({
      ...current,
      custom_links: inflateCustomLinks(current.custom_links).filter((_, itemIndex) => itemIndex !== index)
    }));
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

  function updateCurrentEntry(index, key, value) {
    setDraft((current) => {
      const nextEntries = mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [key]: value } : entry
      );

      return { ...current, current_entries: nextEntries };
    });
  }

  function removeCurrentEntry(index) {
    const targetEntry = mergeCurrentEntries(draft.current_entries, buildDefaultCurrentEntries())[index];
    const hasContent = [targetEntry?.label, targetEntry?.title, targetEntry?.body].some((value) => `${value || ""}`.trim());
    if (hasContent && !window.confirm("この項目を本当に削除しますか？")) {
      return;
    }

    setDraft((current) => ({
      ...current,
      current_entries: mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()).filter((_, entryIndex) => entryIndex !== index)
    }));
    setExpandedCurrentEntries((current) => {
      const next = { ...current };
      delete next[index];
      return next;
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

  function removeRecordItem(index) {
    const targetItem = mergeRecordItems(draft.record_items, buildDefaultRecordItems())[index];
    const hasContent = [targetItem?.title, targetItem?.body].some((value) => `${value || ""}`.trim());
    if (hasContent && !window.confirm("この項目を本当に削除しますか？")) {
      return;
    }

    setDraft((current) => ({
      ...current,
      record_items: mergeRecordItems(current.record_items, buildDefaultRecordItems()).filter((_, itemIndex) => itemIndex !== index)
    }));
    setExpandedRecordItems((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  function addRecordItem() {
    setDraft((current) => ({
      ...current,
      record_items: [...mergeRecordItems(current.record_items, buildDefaultRecordItems()), { title: "", body: "" }]
    }));
  }

  function addCurrentEntry() {
    setDraft((current) => ({
      ...current,
      current_entries: [...mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()), { label: "", title: "", body: "" }]
    }));
  }

  function startEditing() {
    setDraft((current) => ({
      ...current,
      headline: current.headline || defaultLeadCopy,
      identity_heading: current.identity_heading || DEFAULT_IDENTITY_HEADING,
      record_heading: current.record_heading || DEFAULT_RECORD_HEADING,
      current_entries: mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()),
      weekly_schedule: mergeWeeklySchedule(current.weekly_schedule),
      record_items: mergeRecordItems(current.record_items, buildDefaultRecordItems())
    }));
    setIsEditing(true);
  }

  function startEditingWithNewRecord() {
    setDraft((current) => ({
      ...current,
      headline: current.headline || defaultLeadCopy,
      identity_heading: current.identity_heading || DEFAULT_IDENTITY_HEADING,
      record_heading: current.record_heading || DEFAULT_RECORD_HEADING,
      current_entries: mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()),
      weekly_schedule: mergeWeeklySchedule(current.weekly_schedule),
      record_items: [...mergeRecordItems(current.record_items, buildDefaultRecordItems()), { title: "", body: "" }]
    }));
    setIsEditing(true);
  }

  function startEditingWithNewCurrentEntry() {
    setDraft((current) => ({
      ...current,
      headline: current.headline || defaultLeadCopy,
      identity_heading: current.identity_heading || DEFAULT_IDENTITY_HEADING,
      record_heading: current.record_heading || DEFAULT_RECORD_HEADING,
      current_entries: [...mergeCurrentEntries(current.current_entries, buildDefaultCurrentEntries()), { label: "", title: "", body: "" }],
      weekly_schedule: mergeWeeklySchedule(current.weekly_schedule),
      record_items: mergeRecordItems(current.record_items, buildDefaultRecordItems())
    }));
    setIsEditing(true);
  }

  function openPostComposer() {
    setPostManagerOpen(true);
    setPostCreateSignal((current) => current + 1);
  }

  async function submitQuestion(event) {
    event.preventDefault();
    if (!supabase) return;

    const nextQuestion = `${questionInput || ""}`.trim();
    if (!nextQuestion) {
      setQuestionStatus("質問を入力してください。");
      return;
    }

    setSubmittingQuestion(true);
    setQuestionStatus("");

    const {
      data: { session: currentSession }
    } = await supabase.auth.getSession();

    const response = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
      },
      body: JSON.stringify({
        recipientId: profile.id,
        question: nextQuestion
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setQuestionStatus(result.error || "質問の送信に失敗しました。");
      setSubmittingQuestion(false);
      return;
    }

    const data = result.item;
    if (data && canEdit) {
      setQuestionItems((current) => [data, ...current]);
      setQuestionDrafts((current) => ({ ...current, [data.id]: data.answer || "" }));
    }
    setQuestionInput("");
    setQuestionStatus("匿名で送信しました。");
    setSubmittingQuestion(false);
  }

  async function saveQuestionAnswer(questionId) {
    if (!canEdit || !supabase) return;

    setSavingQuestionId(questionId);
    setQuestionStatus("");

    const nextAnswer = `${questionDrafts[questionId] || ""}`.trim();
    const { data, error } = await supabase
      .from("anonymous_questions")
      .update({ answer: nextAnswer || null })
      .eq("id", questionId)
      .eq("recipient_id", profile.id)
      .select(
        canRevealQuestionSender
          ? "id, question, answer, created_at, updated_at, sender_profile_id, sender:profiles!anonymous_questions_sender_profile_id_fkey(id, username, display_name, avatar_url)"
          : "id, question, answer, created_at, updated_at"
      )
      .single();

    if (error) {
      setQuestionStatus(error.message || "回答の保存に失敗しました。");
      setSavingQuestionId("");
      return;
    }

    setQuestionItems((current) => current.map((item) => (item.id === questionId ? data : item)));
    setQuestionStatus(nextAnswer ? "回答を保存しました。" : "回答を未公開に戻しました。");
    setSavingQuestionId("");
  }

  async function deleteQuestion(questionId) {
    if (!canEdit || !supabase) return;
    if (!window.confirm("この質問を削除しますか？")) return;

    setDeletingQuestionId(questionId);
    setQuestionStatus("");

    const { error } = await supabase
      .from("anonymous_questions")
      .delete()
      .eq("id", questionId)
      .eq("recipient_id", profile.id);

    if (error) {
      setQuestionStatus(error.message || "質問の削除に失敗しました。");
      setDeletingQuestionId("");
      return;
    }

    setQuestionItems((current) => current.filter((item) => item.id !== questionId));
    setQuestionDrafts((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    setQuestionStatus("質問を削除しました。");
    setDeletingQuestionId("");
  }

  return (
    <SignaturePageShell>
      <div className="signature-noise" aria-hidden="true" />
      <div className="signature-glow signature-glow-a" aria-hidden="true" />
      <div className="signature-glow signature-glow-b" aria-hidden="true" />

      <nav className="signature-local-nav" aria-label="Profile sections">
        <div className="signature-local-nav-links">
          <a href="#signature-identity">Identity</a>
          <a href="#signature-current">Current</a>
          <a href="#signature-works">Works</a>
          <a href="#signature-thinking">Records</a>
          <a href="#signature-contact">Contact</a>
        </div>
        {canEdit ? (
          <div className="signature-local-nav-actions">
            {status ? <span className="signature-local-nav-status">{status}</span> : null}
            {isEditing ? (
              <>
                <button type="button" className="button button-primary button-small" disabled={saving} onClick={saveProfile}>
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={() => {
                    setDraft(inflateSignatureProfile(profile));
                    setIsEditing(false);
                    setPostManagerOpen(false);
                    setShowAllCurrentEntries(false);
                    setStatus("");
                  }}
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button type="button" className="button button-primary button-small" onClick={startEditing}>
                このページを編集
              </button>
            )}
          </div>
        ) : null}
      </nav>

      <SignatureHeroStage>
        <SignatureHeroShader />
        <div className="signature-hero-copy">
          {isEditing ? (
            <label className={`avatar-upload-trigger ${uploadingAvatar ? "is-uploading" : ""}`}>
              <AvatarMark profile={draft} size="lg" />
              <span>{uploadingAvatar ? "アップロード中..." : "画像を変更"}</span>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
          ) : (
            <AvatarMark profile={draft} size="lg" />
          )}
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
              <KeioBadge profile={draft} />
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

          {links.length || isEditing ? (
            <div className="signature-inline-links">
              {isEditing ? (
                <div className="link-editor-stack">
                  {fixedLinkFields.map((field) => (
                    <label key={field.key} className="signature-edit-inline signature-edit-link">
                      <span>{field.label}</span>
                      <input
                        value={draft[field.key] || ""}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    </label>
                  ))}
                  {customLinks.map((link, index) => (
                    <div key={`signature-custom-link-${index}`} className="link-editor-row">
                      <label className="signature-edit-inline signature-edit-link">
                        <span>ラベル</span>
                        <input
                          value={link.label || ""}
                          onChange={(event) => updateCustomLink(index, "label", event.target.value)}
                          placeholder="Portfolio / Podcast / Docs"
                        />
                      </label>
                      <label className="signature-edit-inline signature-edit-link">
                        <span>URL</span>
                        <input
                          value={link.href || ""}
                          onChange={(event) => updateCustomLink(index, "href", event.target.value)}
                          placeholder="https://example.com/..."
                        />
                      </label>
                      <button type="button" className="button button-ghost button-small" onClick={() => removeCustomLink(index)}>
                        削除
                      </button>
                    </div>
                  ))}
                  <div className="link-editor-actions">
                    <button type="button" className="button button-secondary button-small" onClick={addCustomLink}>
                      リンクを追加
                    </button>
                  </div>
                </div>
              ) : (
                links.map((link) => (
                  <ExternalLink key={link.key} href={link.href}>
                    {link.label}
                  </ExternalLink>
                ))
              )}
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
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-current">
        <div className="signature-section-head">
          <div>
            <p className="eyebrow">Current</p>
            <h2>何してる？</h2>
          </div>
          {canEdit ? (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={isEditing ? addCurrentEntry : startEditingWithNewCurrentEntry}
            >
              追加
            </button>
          ) : null}
        </div>
        <div className="signature-current-layout">
          <div className="signature-current-grid">
            {visibleCurrentEntries.map((entry, visibleIndex) => {
              const index = isEditing ? visibleIndex : currentEntries.length - visibleCurrentEntries.length + visibleIndex;

              return (
              <article key={`current-entry-${index}`} className="signature-current-card">
                {isEditing ? (
                  <div className="signature-current-edit-row">
                    <div className="signature-current-edit-head">
                      <input
                        className="signature-current-label-input eyebrow"
                        value={entry.label || ""}
                        onChange={(event) => updateCurrentEntry(index, "label", event.target.value)}
                        maxLength={PROFILE_LOCATION_LIMIT}
                        placeholder="日付"
                      />
                      <input
                        className="signature-current-title-input"
                        value={entry.title || ""}
                        onChange={(event) => updateCurrentEntry(index, "title", event.target.value)}
                        maxLength={PROFILE_HEADLINE_LIMIT}
                        placeholder="見出し"
                      />
                    </div>
                    <button
                      type="button"
                      className="button button-ghost button-small"
                      onClick={() => removeCurrentEntry(index)}
                    >
                      削除
                    </button>
                  </div>
                ) : (
                  <div className="signature-current-card-head">
                    <p className="eyebrow">{entry.label || "日付未設定"}</p>
                    <h3>{entry.title || "タイトル未設定"}</h3>
                  </div>
                )}
                {isEditing ? (
                  <textarea
                    rows="3"
                    value={entry.body || ""}
                    onChange={(event) => updateCurrentEntry(index, "body", event.target.value)}
                    maxLength={PROFILE_BIO_LIMIT}
                    placeholder="内容"
                  />
                ) : (
                  <div className="signature-current-body">
                    <p>{getCollapsibleText(entry.body, expandedCurrentEntries[index], 150).text || "ここに近況を書けます。"}</p>
                  </div>
                )}
                {!isEditing && getCollapsibleText(entry.body, expandedCurrentEntries[index], 150).truncated ? (
                    <button
                      type="button"
                      className="signature-inline-toggle"
                      onClick={() =>
                        setExpandedCurrentEntries((current) => ({
                          ...current,
                          [index]: !current[index]
                        }))
                      }
                    >
                      {expandedCurrentEntries[index] ? "たたむ" : "続きを読む"}
                    </button>
                  ) : null}
            </article>
              );
            })}
            {!isEditing && hiddenCurrentEntryCount > 0 ? (
              <button
                type="button"
                className="signature-section-expand"
                onClick={() => setShowAllCurrentEntries((current) => !current)}
              >
                {showAllCurrentEntries ? "最近の記録だけ表示" : `過去の記録をもっと見る (${hiddenCurrentEntryCount})`}
              </button>
            ) : null}
          </div>

          <article className="signature-schedule-card">
            <div className="signature-schedule-head">
              <div>
                <p className="eyebrow">Week</p>
                <h3>デフォルト予定</h3>
              </div>
              <div className="signature-schedule-note">
                <p className="signature-schedule-note-label">メモ</p>
                {isEditing ? (
                  <textarea
                    rows="3"
                    value={draft.schedule_note || ""}
                    onChange={(event) => updateField("schedule_note", event.target.value)}
                    maxLength={PROFILE_BIO_LIMIT}
                    placeholder="補足、ゆるい目標、今週の注意点"
                  />
                ) : draft.schedule_note ? (
                  <p>{draft.schedule_note}</p>
                ) : (
                  <p className="signature-schedule-note-empty">補足メモ</p>
                )}
              </div>
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
          <div>
            <p className="eyebrow">Works</p>
            <h2>記事</h2>
          </div>
          {canEdit ? (
            <button type="button" className="button button-secondary button-small" onClick={openPostComposer}>
              新規記事
            </button>
          ) : null}
        </div>
        {isEditing || postManagerOpen ? (
          <ProfilePostManager
            supabase={supabase}
            session={session}
            username={draft.username}
            posts={postItems}
            onPostsChange={setPostItems}
            title="記事を管理"
            hideToolbar
            createSignal={postCreateSignal}
          />
        ) : postItems.length ? (
          <SignaturePostShelf username={draft.username} posts={postItems} />
        ) : (
          <div className="signature-post-card empty-state">
            <h3>まだ記事がありません</h3>
            <p>最初の公開記事を追加するとここに出ます。</p>
          </div>
        )}
      </SignatureInteractiveSection>

      {links.length || isEditing ? (
        <SignatureInteractiveSection id="signature-links">
          <div className="signature-section-head">
            <p className="eyebrow">Links</p>
            <h2>Outside the page</h2>
          </div>
          <div className="link-list">
            {isEditing ? (
              <div className="link-editor-stack">
                {fixedLinkFields.map((field) => (
                  <label key={field.key} className="signature-edit-inline signature-edit-link-card">
                    <span>{field.label}</span>
                    <input
                      value={draft[field.key] || ""}
                      onChange={(event) => updateField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  </label>
                ))}
                {customLinks.map((link, index) => (
                  <div key={`signature-links-card-${index}`} className="link-editor-row">
                    <label className="signature-edit-inline signature-edit-link-card">
                      <span>ラベル</span>
                      <input
                        value={link.label || ""}
                        onChange={(event) => updateCustomLink(index, "label", event.target.value)}
                        placeholder="Link title"
                      />
                    </label>
                    <label className="signature-edit-inline signature-edit-link-card">
                      <span>URL</span>
                      <input
                        value={link.href || ""}
                        onChange={(event) => updateCustomLink(index, "href", event.target.value)}
                        placeholder="https://example.com/..."
                      />
                    </label>
                    <button type="button" className="button button-ghost button-small" onClick={() => removeCustomLink(index)}>
                      削除
                    </button>
                  </div>
                ))}
                <div className="link-editor-actions">
                  <button type="button" className="button button-secondary button-small" onClick={addCustomLink}>
                    リンクを追加
                  </button>
                </div>
              </div>
            ) : (
              links.map((link) => (
                <ExternalLink key={link.key} href={link.href} className="button button-secondary">
                  {link.label}
                </ExternalLink>
              ))
            )}
          </div>
        </SignatureInteractiveSection>
      ) : null}

      <SignatureInteractiveSection id="signature-thinking">
        <div className="signature-section-head">
          <div>
            <p className="eyebrow">Records</p>
            {isEditing ? (
              <textarea
                className="signature-edit-section-title"
                rows="1"
                value={draft.record_heading || ""}
                onChange={(event) => updateField("record_heading", event.target.value)}
                maxLength={PROFILE_HEADLINE_LIMIT}
                placeholder={DEFAULT_RECORD_HEADING}
              />
            ) : (
              <h2>{draft.record_heading || DEFAULT_RECORD_HEADING}</h2>
            )}
          </div>
          {canEdit ? (
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={isEditing ? addRecordItem : startEditingWithNewRecord}
            >
              追加
            </button>
          ) : null}
        </div>

        <div className="signature-record-grid">
          {recordItems.map((item, index) => (
            <article key={`record-item-${index}`} className="signature-record-card">
              {isEditing ? (
                <>
                  <div className="signature-record-edit-row">
                    <input
                      className="signature-record-title"
                      value={item.title || ""}
                      onChange={(event) => updateRecordItem(index, "title", event.target.value)}
                      maxLength={PROFILE_LOCATION_LIMIT}
                      placeholder="項目名"
                    />
                    <button
                      type="button"
                      className="button button-ghost button-small"
                      onClick={() => removeRecordItem(index)}
                    >
                      削除
                    </button>
                  </div>
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
                <p>{getCollapsibleText(item.body, expandedRecordItems[index], 140).text || "ここに記録を書けます。"}</p>
                {getCollapsibleText(item.body, expandedRecordItems[index], 140).truncated ? (
                  <button
                    type="button"
                    className="signature-inline-toggle"
                    onClick={() =>
                      setExpandedRecordItems((current) => ({
                        ...current,
                        [index]: !current[index]
                      }))
                    }
                  >
                    {expandedRecordItems[index] ? "たたむ" : "続きを読む"}
                  </button>
                ) : null}
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
        <div className="signature-contact-layout">
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
                  <ExternalLink key={link.label} href={link.href} className="button button-primary">
                    {link.label}
                  </ExternalLink>
                ))
              ) : (
                <Link href="/settings" className="button button-secondary">
                  リンクを設定する
                </Link>
              )}
            </div>
          </div>

          <aside className="signature-question-card">
            <div className="signature-question-head">
              <div>
                <p className="eyebrow">Marshmallow</p>
                <h3>匿名質問箱</h3>
              </div>
              <span className="signature-question-count">{questionItems.length}</span>
            </div>

            <form className="signature-question-form" onSubmit={submitQuestion}>
              <textarea
                rows="3"
                value={questionInput}
                onChange={(event) => setQuestionInput(event.target.value)}
                maxLength={280}
                placeholder="匿名で質問を送る"
              />
              <button type="submit" className="button button-primary" disabled={submittingQuestion}>
                {submittingQuestion ? "送信中..." : "質問を送る"}
              </button>
            </form>

            {shouldShowQuestionStatus ? <p className="status-text">{questionStatus}</p> : null}

            <div className="signature-question-list">
              {loadingQuestions ? (
                <p className="muted">読み込み中...</p>
              ) : questionItems.length ? (
                questionItems.map((item) => (
                  <article key={item.id} className="signature-question-item">
                    <p className="signature-question-q">Q. {item.question}</p>
                    {canRevealQuestionSender ? (
                      <p className="signature-question-meta">
                        送信元: {item.sender?.username ? `@${item.sender.username}` : "匿名"}
                      </p>
                    ) : null}
                    {canEdit ? (
                      <div className="signature-question-answer-editor">
                        <textarea
                          rows="3"
                          value={questionDrafts[item.id] || ""}
                          onChange={(event) =>
                            setQuestionDrafts((current) => ({
                              ...current,
                              [item.id]: event.target.value
                            }))
                          }
                          placeholder="ここに回答を書く"
                        />
                        <div className="signature-question-actions">
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            disabled={savingQuestionId === item.id}
                            onClick={() => saveQuestionAnswer(item.id)}
                          >
                            {savingQuestionId === item.id ? "保存中..." : "回答を保存"}
                          </button>
                          <button
                            type="button"
                            className="button button-ghost button-small"
                            disabled={deletingQuestionId === item.id}
                            onClick={() => deleteQuestion(item.id)}
                          >
                            {deletingQuestionId === item.id ? "削除中..." : "削除"}
                          </button>
                        </div>
                      </div>
                    ) : item.answer ? (
                      <p className="signature-question-a">A. {item.answer}</p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="muted">まだ質問はありません。</p>
              )}
            </div>
          </aside>
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
  const mergedDefaults = defaults.map((fallback, index) => {
    const current = currentEntries?.[index] || {};
    return {
      label: `${current.label || ""}`.trim() || fallback.label,
      title: `${current.title || ""}`.trim() || fallback.title,
      body: `${current.body || ""}`.trim() || fallback.body
    };
  });

  const extraEntries = Array.isArray(currentEntries)
    ? currentEntries.slice(defaults.length).map((entry) => ({
        label: `${entry?.label ?? ""}`,
        title: `${entry?.title ?? ""}`,
        body: `${entry?.body ?? ""}`
      }))
    : [];

  return [...mergedDefaults, ...extraEntries];
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
  const mergedDefaults = defaults.map((fallback, index) => {
    const current = recordItems?.[index] || {};
    const hasTitle = Object.prototype.hasOwnProperty.call(current, "title");
    const hasBody = Object.prototype.hasOwnProperty.call(current, "body");
    return {
      title: hasTitle ? `${current.title ?? ""}` : fallback.title,
      body: hasBody ? `${current.body ?? ""}` : fallback.body
    };
  });

  const extraItems = Array.isArray(recordItems)
    ? recordItems.slice(defaults.length).map((item) => ({
        title: `${item?.title ?? ""}`,
        body: `${item?.body ?? ""}`
      }))
    : [];

  return [...mergedDefaults, ...extraItems];
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
  const { heading, recordHeading, affiliation, currentEntries, weeklySchedule, scheduleNote, recordItems } = unpackSignatureAffiliation(
    profile.affiliation
  );

  return {
    ...profile,
    custom_links: inflateCustomLinks(profile.custom_links),
    affiliation,
    identity_heading: heading || DEFAULT_IDENTITY_HEADING,
    record_heading: recordHeading || DEFAULT_RECORD_HEADING,
    current_entries: currentEntries,
    weekly_schedule: weeklySchedule,
    schedule_note: scheduleNote,
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
          recordHeading: meta.record_heading || "",
          affiliation: raw.slice(markerEnd + 2).replace(/^\s+/, ""),
          currentEntries: Array.isArray(meta.current_entries) ? meta.current_entries : [],
          weeklySchedule: meta.weekly_schedule && typeof meta.weekly_schedule === "object" ? meta.weekly_schedule : {},
          scheduleNote: `${meta.schedule_note || ""}`,
          recordItems: Array.isArray(meta.record_items) ? meta.record_items : []
        };
      } catch {
        return {
          heading: "",
          recordHeading: "",
          affiliation: raw,
          currentEntries: [],
          weeklySchedule: {},
          scheduleNote: "",
          recordItems: []
        };
      }
    }
  }

  if (!raw.startsWith(IDENTITY_MARKER)) {
    return {
      heading: "",
      recordHeading: "",
      affiliation: raw,
      currentEntries: [],
      weeklySchedule: {},
      scheduleNote: "",
      recordItems: []
    };
  }

  const markerEnd = raw.indexOf("]]");
  if (markerEnd === -1) {
    return {
      heading: "",
      recordHeading: "",
      affiliation: raw,
      currentEntries: [],
      weeklySchedule: {},
      scheduleNote: "",
      recordItems: []
    };
  }

  const heading = raw.slice(IDENTITY_MARKER.length, markerEnd);
  const affiliation = raw.slice(markerEnd + 2).replace(/^\s+/, "");

  return {
    heading,
    recordHeading: "",
    affiliation,
    currentEntries: [],
    weeklySchedule: {},
    scheduleNote: "",
    recordItems: []
  };
}

function packSignatureAffiliation(affiliation, heading, currentEntries, weeklySchedule, scheduleNote, recordItems, recordHeading) {
  const trimmedAffiliation = `${affiliation || ""}`.trim();
  const trimmedHeading = `${heading || ""}`.trim() || DEFAULT_IDENTITY_HEADING;
  const trimmedRecordHeading = `${recordHeading || ""}`.trim() || DEFAULT_RECORD_HEADING;
  const meta = encodeURIComponent(
    JSON.stringify({
      identity_heading: trimmedHeading,
      record_heading: trimmedRecordHeading,
      current_entries: mergeCurrentEntries(currentEntries, buildDefaultCurrentEntries()).map((entry) => ({
        label: `${entry.label || ""}`.trim(),
        title: `${entry.title || ""}`.trim(),
        body: `${entry.body || ""}`.trim()
      })),
      weekly_schedule: mergeWeeklySchedule(weeklySchedule),
      schedule_note: `${scheduleNote || ""}`.trim(),
      record_items: mergeRecordItems(recordItems, buildDefaultRecordItems()).map((item) => ({
        title: `${item.title || ""}`.trim(),
        body: `${item.body || ""}`.trim()
      }))
    })
  );

  return `${SIGNATURE_META_MARKER}${meta}]]${trimmedAffiliation ? `\n${trimmedAffiliation}` : ""}`;
}

function getCollapsibleText(value, expanded, limit) {
  const text = `${value || ""}`.trim();
  if (!text) {
    return { text: "", truncated: false };
  }

  if (expanded || text.length <= limit) {
    return { text, truncated: text.length > limit };
  }

  const preview = text.slice(0, limit);
  const breakIndex = Math.max(preview.lastIndexOf("\n"), preview.lastIndexOf(" "));
  const safePreview = (breakIndex > Math.floor(limit * 0.6) ? preview.slice(0, breakIndex) : preview).trimEnd();

  return {
    text: `${safePreview}…`,
    truncated: true
  };
}

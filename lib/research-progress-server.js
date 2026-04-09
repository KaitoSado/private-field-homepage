import { normalizeUsername } from "@/lib/profile-path";
import {
  RESEARCH_BLOCKER_TYPE_OPTIONS,
  RESEARCH_STATUS_OPTIONS,
  getResearchWeekStart,
  isPastResearchWeek,
  shiftResearchWeekStart,
  slugifyResearchGroupName
} from "@/lib/research-progress";

const GROUP_NAME_LIMIT = 120;
const GROUP_DESCRIPTION_LIMIT = 400;
const TOPIC_LIMIT = 120;
const SUMMARY_LIMIT = 180;
const LONG_TEXT_LIMIT = 2000;
const REVIEW_NOTE_LIMIT = 2000;

const RESEARCH_GROUP_SELECT = "id, name, slug, description, is_active, created_by, created_at, updated_at";
const RESEARCH_UPDATE_SELECT = `
  id,
  group_id,
  author_id,
  week_start,
  topic_title,
  status,
  summary_text,
  done_text,
  next_text,
  blockers_text,
  help_needed_text,
  needs_help,
  wants_review_in_meeting,
  blocker_type,
  reviewer_note,
  reviewed_by,
  reviewed_at,
  submitted_late,
  created_at,
  updated_at,
  author:profiles!research_updates_author_id_fkey(id, username, display_name, avatar_url, keio_verified),
  reviewer:profiles!research_updates_reviewed_by_fkey(id, username, display_name, avatar_url)
`;

class ResearchProgressError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ResearchProgressError";
    this.status = status;
  }
}

function sanitizeText(value, maxLength = LONG_TEXT_LIMIT) {
  return `${value || ""}`.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function sanitizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function validateWeekStart(value) {
  const normalized = `${value || ""}`.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ResearchProgressError("週の指定が不正です。", 400);
  }
  return normalized;
}

function buildSummary(requiredMembers, updates) {
  const submittedIds = new Set(updates.map((item) => item.author_id));
  const summary = {
    total_members: requiredMembers.length,
    submitted_count: submittedIds.size,
    missing_count: Math.max(requiredMembers.length - submittedIds.size, 0),
    on_track_count: 0,
    at_risk_count: 0,
    blocked_count: 0,
    review_needed_count: 0,
    needs_help_count: 0,
    meeting_candidate_count: 0,
    reviewed_count: 0
  };

  for (const update of updates) {
    if (update.status === "on_track") summary.on_track_count += 1;
    if (update.status === "at_risk") summary.at_risk_count += 1;
    if (update.status === "blocked") summary.blocked_count += 1;
    if (update.status === "review_needed") summary.review_needed_count += 1;
    if (update.needs_help) summary.needs_help_count += 1;
    if (update.wants_review_in_meeting || update.needs_help || update.status === "blocked" || update.status === "review_needed") {
      summary.meeting_candidate_count += 1;
    }
    if (update.reviewed_at || update.reviewer_note) summary.reviewed_count += 1;
  }

  return summary;
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  return grouped;
}

function buildHistorySignals({ members, historyRows, weekStart }) {
  const historyMap = new Map(historyRows.map((item) => [`${item.author_id}:${item.week_start}`, item]));
  const lastSeenByAuthor = new Map();
  for (const row of historyRows) {
    if (!lastSeenByAuthor.has(row.author_id)) {
      lastSeenByAuthor.set(row.author_id, row);
    }
  }

  const signals = new Map();
  for (const member of members) {
    if (member.role === "viewer") continue;

    let missingStreak = 0;
    let riskStreak = 0;

    for (let index = 0; index < 4; index += 1) {
      const targetWeek = shiftResearchWeekStart(weekStart, -index);
      const update = historyMap.get(`${member.user_id}:${targetWeek}`);
      if (!update) {
        missingStreak += 1;
      } else {
        break;
      }
    }

    for (let index = 0; index < 4; index += 1) {
      const targetWeek = shiftResearchWeekStart(weekStart, -index);
      const update = historyMap.get(`${member.user_id}:${targetWeek}`);
      if (update && ["blocked", "at_risk", "review_needed"].includes(update.status)) {
        riskStreak += 1;
      } else {
        break;
      }
    }

    signals.set(member.user_id, {
      missing_streak: missingStreak,
      risk_streak: riskStreak,
      last_seen: lastSeenByAuthor.get(member.user_id) || null
    });
  }

  return signals;
}

async function fetchUserProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, keio_verified, role, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ResearchProgressError(error.message || "プロフィール情報を読み込めませんでした。", 500);
  }

  if (!data) {
    throw new ResearchProgressError("プロフィールが見つかりません。", 404);
  }

  return data;
}

async function fetchGroupBySlug(supabase, slug) {
  const { data, error } = await supabase
    .from("research_groups")
    .select(RESEARCH_GROUP_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new ResearchProgressError(error.message || "グループ情報を読み込めませんでした。", 500);
  }

  if (!data) {
    throw new ResearchProgressError("グループが見つかりません。", 404);
  }

  return data;
}

async function fetchGroupMembership(supabase, groupId, userId) {
  const { data, error } = await supabase
    .from("research_group_members")
    .select("group_id, user_id, role, joined_at, created_at")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ResearchProgressError(error.message || "グループ権限を確認できませんでした。", 500);
  }

  return data;
}

async function fetchGroupContextBySlug(supabase, slug, userId) {
  const [group, profile] = await Promise.all([fetchGroupBySlug(supabase, slug), fetchUserProfile(supabase, userId)]);
  const membership = await fetchGroupMembership(supabase, group.id, userId);
  const isAdmin = profile.role === "admin";

  if (!membership && !isAdmin) {
    throw new ResearchProgressError("このグループを見る権限がありません。", 403);
  }

  return {
    group,
    membership,
    profile,
    isAdmin,
    myRole: isAdmin ? "owner" : membership?.role || "viewer"
  };
}

async function ensureUniqueGroupSlug(supabase, name) {
  const base = slugifyResearchGroupName(name) || "research-group";
  let candidate = base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase
      .from("research_groups")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new ResearchProgressError(error.message || "グループ slug を確認できませんでした。", 500);
    }

    if (!data) return candidate;
    candidate = `${base}-${attempt + 2}`;
  }

  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

function normalizeUpdateInput(body, { weekStart }) {
  const status = `${body.status || ""}`.trim();
  const blockerType = `${body.blockerType || body.blocker_type || "none"}`.trim();
  const payload = {
    week_start: validateWeekStart(body.weekStart || weekStart),
    topic_title: sanitizeText(body.topicTitle || body.topic_title, TOPIC_LIMIT),
    status,
    summary_text: sanitizeText(body.summaryText || body.summary_text, SUMMARY_LIMIT),
    done_text: sanitizeText(body.doneText || body.done_text),
    next_text: sanitizeText(body.nextText || body.next_text),
    blockers_text: sanitizeText(body.blockersText || body.blockers_text),
    help_needed_text: sanitizeText(body.helpNeededText || body.help_needed_text),
    needs_help: sanitizeBoolean(body.needsHelp || body.needs_help),
    wants_review_in_meeting: sanitizeBoolean(body.wantsReviewInMeeting || body.wants_review_in_meeting),
    blocker_type: blockerType || "none"
  };

  if (!RESEARCH_STATUS_OPTIONS.includes(payload.status)) {
    throw new ResearchProgressError("状態の指定が不正です。", 400);
  }

  if (!RESEARCH_BLOCKER_TYPE_OPTIONS.includes(payload.blocker_type)) {
    throw new ResearchProgressError("詰まりの種類が不正です。", 400);
  }

  if (!payload.summary_text || !payload.next_text) {
    throw new ResearchProgressError("一言要約と次の一歩は必須です。", 400);
  }

  if (payload.status === "blocked") {
    payload.needs_help = true;
  }

  if (payload.status === "on_track") {
    payload.blocker_type = "none";
  }

  return payload;
}

function sortMembers(members) {
  return [...members].sort((left, right) => {
    const roleOrder = { owner: 0, member: 1, viewer: 2 };
    const roleDiff = (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9);
    if (roleDiff !== 0) return roleDiff;

    const leftName = left.profiles?.display_name || left.profiles?.username || "";
    const rightName = right.profiles?.display_name || right.profiles?.username || "";
    return leftName.localeCompare(rightName, "ja");
  });
}

export async function fetchResearchSessionUser(supabase, request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    throw new ResearchProgressError("ログインが必要です。", 401);
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ResearchProgressError(error?.message || "認証を確認できませんでした。", 401);
  }

  return user;
}

export async function getResearchGroupsIndexData({ supabase, userId, weekStart = getResearchWeekStart() }) {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("research_group_members")
    .select(`group_id, user_id, role, joined_at, research_groups!inner(${RESEARCH_GROUP_SELECT})`)
    .eq("user_id", userId);

  if (membershipError) {
    throw new ResearchProgressError(membershipError.message || "所属グループを読み込めませんでした。", 500);
  }

  const groups = (membershipRows || [])
    .map((row) => ({
      ...(row.research_groups || {}),
      my_role: row.role
    }))
    .filter((group) => group?.id);

  if (!groups.length) {
    return {
      week_start: weekStart,
      current_week_start: getResearchWeekStart(),
      groups: []
    };
  }

  const groupIds = groups.map((group) => group.id);
  const [{ data: memberRows, error: memberError }, { data: currentRows, error: updateError }] = await Promise.all([
    supabase
      .from("research_group_members")
      .select("group_id, user_id, role")
      .in("group_id", groupIds),
    supabase
      .from("research_updates")
      .select("group_id, author_id, status, needs_help, wants_review_in_meeting, reviewer_note, reviewed_at")
      .in("group_id", groupIds)
      .eq("week_start", weekStart)
  ]);

  if (memberError || updateError) {
    throw new ResearchProgressError(memberError?.message || updateError?.message || "進捗サマリを読み込めませんでした。", 500);
  }

  const membersByGroup = groupBy(memberRows || [], (item) => item.group_id);
  const updatesByGroup = groupBy(currentRows || [], (item) => item.group_id);

  return {
    week_start: weekStart,
    current_week_start: getResearchWeekStart(),
    groups: groups
      .map((group) => {
        const members = (membersByGroup.get(group.id) || []).filter((item) => item.role !== "viewer");
        const updates = updatesByGroup.get(group.id) || [];
        return {
          ...group,
          summary: buildSummary(members, updates)
        };
      })
      .sort((left, right) => `${left.name || ""}`.localeCompare(`${right.name || ""}`, "ja"))
  };
}

export async function getResearchProgressGroupData({ supabase, userId, slug, weekStart = getResearchWeekStart() }) {
  const context = await fetchGroupContextBySlug(supabase, slug, userId);

  const [{ data: memberRows, error: memberError }, { data: currentUpdates, error: currentError }, { data: historyRows, error: historyError }] = await Promise.all([
    supabase
      .from("research_group_members")
      .select("group_id, user_id, role, joined_at, created_at, profiles!research_group_members_user_id_fkey(id, username, display_name, avatar_url, keio_verified)")
      .eq("group_id", context.group.id),
    supabase
      .from("research_updates")
      .select(RESEARCH_UPDATE_SELECT)
      .eq("group_id", context.group.id)
      .eq("week_start", weekStart)
      .order("updated_at", { ascending: false }),
    supabase
      .from("research_updates")
      .select(RESEARCH_UPDATE_SELECT)
      .eq("group_id", context.group.id)
      .order("week_start", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(240)
  ]);

  if (memberError || currentError || historyError) {
    throw new ResearchProgressError(memberError?.message || currentError?.message || historyError?.message || "研究進捗を読み込めませんでした。", 500);
  }

  const members = sortMembers(memberRows || []);
  const currentRows = currentUpdates || [];
  const requiredMembers = members.filter((member) => member.role !== "viewer");
  const submittedIds = new Set(currentRows.map((item) => item.author_id));
  const missingMembers = requiredMembers.filter((member) => !submittedIds.has(member.user_id));
  const signals = buildHistorySignals({
    members,
    historyRows: historyRows || [],
    weekStart
  });

  const currentByAuthor = new Map(currentRows.map((item) => [item.author_id, item]));
  const dashboardRows = requiredMembers.map((member) => {
    const current = currentByAuthor.get(member.user_id) || null;
    const signal = signals.get(member.user_id) || {
      missing_streak: current ? 0 : 1,
      risk_streak: 0,
      last_seen: null
    };

    return {
      member: {
        id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profile: member.profiles || null
      },
      update: current,
      is_missing: !current,
      missing_streak: signal.missing_streak,
      risk_streak: signal.risk_streak,
      last_seen: signal.last_seen
    };
  });

  const myUpdate = currentByAuthor.get(userId) || null;
  const historyWithoutCurrentWeek = (historyRows || []).filter((item) => item.week_start !== weekStart);
  const meetingCandidates = currentRows
    .filter((item) => item.wants_review_in_meeting || item.needs_help || item.status === "blocked" || item.status === "review_needed")
    .sort((left, right) => {
      const score = (item) => {
        if (item.status === "blocked") return 0;
        if (item.needs_help) return 1;
        if (item.status === "review_needed") return 2;
        if (item.status === "at_risk") return 3;
        return 4;
      };
      return score(left) - score(right);
    });

  return {
    group: {
      ...context.group,
      my_role: context.myRole
    },
    week_start: weekStart,
    current_week_start: getResearchWeekStart(),
    summary: buildSummary(requiredMembers, currentRows),
    members: members.map((member) => ({
      id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      profile: member.profiles || null
    })),
    rows: dashboardRows,
    updates: currentRows,
    my_update: myUpdate,
    missing_members: missingMembers.map((member) => ({
      id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      profile: member.profiles || null
    })),
    history: historyWithoutCurrentWeek,
    meeting_candidates: meetingCandidates
  };
}

export async function createResearchGroup({ supabase, userId, body }) {
  const name = sanitizeText(body.name, GROUP_NAME_LIMIT);
  const description = sanitizeText(body.description, GROUP_DESCRIPTION_LIMIT);

  if (!name) {
    throw new ResearchProgressError("グループ名は必須です。", 400);
  }

  const slug = await ensureUniqueGroupSlug(supabase, name);
  const { data: group, error: groupError } = await supabase
    .from("research_groups")
    .insert({
      name,
      slug,
      description,
      created_by: userId,
      is_active: true
    })
    .select(RESEARCH_GROUP_SELECT)
    .single();

  if (groupError || !group) {
    throw new ResearchProgressError(groupError?.message || "グループを作成できませんでした。", 400);
  }

  const { error: membershipError } = await supabase
    .from("research_group_members")
    .insert({
      group_id: group.id,
      user_id: userId,
      role: "owner"
    });

  if (membershipError) {
    await supabase.from("research_groups").delete().eq("id", group.id);
    throw new ResearchProgressError(membershipError.message || "主催者登録に失敗しました。", 400);
  }

  return group;
}

export async function upsertResearchGroupMember({ supabase, actorId, body }) {
  const slug = sanitizeText(body.groupSlug || body.group_slug, 80);
  const username = normalizeUsername(body.username || "");
  const role = `${body.role || "member"}`.trim();

  if (!slug || !username) {
    throw new ResearchProgressError("グループとユーザー名は必須です。", 400);
  }

  if (!["member", "viewer"].includes(role)) {
    throw new ResearchProgressError("追加できる権限は member / viewer のみです。", 400);
  }

  const context = await fetchGroupContextBySlug(supabase, slug, actorId);
  if (!context.isAdmin && context.myRole !== "owner") {
    throw new ResearchProgressError("メンバーを編集する権限がありません。", 403);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, keio_verified, account_status")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    throw new ResearchProgressError(profileError.message || "追加対象のユーザーを確認できませんでした。", 500);
  }

  if (!profile || profile.account_status !== "active") {
    throw new ResearchProgressError("その username のユーザーは見つかりませんでした。", 404);
  }

  const { data: existingMembership } = await supabase
    .from("research_group_members")
    .select("group_id, user_id, role")
    .eq("group_id", context.group.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existingMembership?.role === "owner") {
    throw new ResearchProgressError("既存の owner はこの画面から変更できません。", 400);
  }

  const { data, error } = await supabase
    .from("research_group_members")
    .upsert(
      {
        group_id: context.group.id,
        user_id: profile.id,
        role
      },
      {
        onConflict: "group_id,user_id"
      }
    )
    .select("group_id, user_id, role, joined_at, created_at, profiles!research_group_members_user_id_fkey(id, username, display_name, avatar_url, keio_verified)")
    .single();

  if (error || !data) {
    throw new ResearchProgressError(error?.message || "メンバーを追加できませんでした。", 400);
  }

  return data;
}

export async function upsertResearchUpdate({ supabase, userId, body }) {
  const slug = sanitizeText(body.groupSlug || body.group_slug, 80);
  const context = await fetchGroupContextBySlug(supabase, slug, userId);

  if (!context.isAdmin && context.myRole === "viewer") {
    throw new ResearchProgressError("閲覧専用メンバーは週報を提出できません。", 403);
  }

  const payload = normalizeUpdateInput(body, { weekStart: getResearchWeekStart() });
  const { data: existing, error: existingError } = await supabase
    .from("research_updates")
    .select("id, submitted_late")
    .eq("group_id", context.group.id)
    .eq("author_id", userId)
    .eq("week_start", payload.week_start)
    .maybeSingle();

  if (existingError) {
    throw new ResearchProgressError(existingError.message || "既存の週報を確認できませんでした。", 500);
  }

  const resolvedPayload = {
    ...payload,
    submitted_late: existing?.submitted_late ?? isPastResearchWeek(payload.week_start)
  };

  const query = existing
    ? supabase
        .from("research_updates")
        .update({
          ...resolvedPayload,
          reviewer_note: "",
          reviewed_by: null,
          reviewed_at: null
        })
        .eq("id", existing.id)
    : supabase.from("research_updates").insert({
        group_id: context.group.id,
        author_id: userId,
        ...resolvedPayload
      });

  const { data, error } = await query.select(RESEARCH_UPDATE_SELECT).single();

  if (error || !data) {
    throw new ResearchProgressError(error?.message || "週報を保存できませんでした。", 400);
  }

  return data;
}

export async function updateResearchReview({ supabase, userId, body }) {
  const updateId = sanitizeText(body.updateId || body.update_id, 80);
  const reviewerNote = sanitizeText(body.reviewerNote || body.reviewer_note, REVIEW_NOTE_LIMIT);

  if (!updateId) {
    throw new ResearchProgressError("レビュー対象が不正です。", 400);
  }

  const { data: updateRow, error: updateError } = await supabase
    .from("research_updates")
    .select("id, group_id")
    .eq("id", updateId)
    .maybeSingle();

  if (updateError) {
    throw new ResearchProgressError(updateError.message || "レビュー対象を確認できませんでした。", 500);
  }

  if (!updateRow) {
    throw new ResearchProgressError("レビュー対象が見つかりません。", 404);
  }

  const membership = await fetchGroupMembership(supabase, updateRow.group_id, userId);
  const profile = await fetchUserProfile(supabase, userId);
  const isAdmin = profile.role === "admin";

  if (!isAdmin && membership?.role !== "owner") {
    throw new ResearchProgressError("レビューノートを編集する権限がありません。", 403);
  }

  const { data, error } = await supabase
    .from("research_updates")
    .update({
      reviewer_note: reviewerNote,
      reviewed_by: reviewerNote ? userId : null,
      reviewed_at: reviewerNote ? new Date().toISOString() : null
    })
    .eq("id", updateId)
    .select(RESEARCH_UPDATE_SELECT)
    .single();

  if (error || !data) {
    throw new ResearchProgressError(error?.message || "レビューノートを保存できませんでした。", 400);
  }

  return data;
}

export function toResearchErrorResponse(error) {
  if (error instanceof ResearchProgressError) {
    return {
      status: error.status,
      body: { error: error.message }
    };
  }

  return {
    status: 500,
    body: { error: error?.message || "研究進捗アプリで予期しないエラーが発生しました。" }
  };
}

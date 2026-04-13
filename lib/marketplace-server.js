import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageMarketplace } from "@/lib/marketplace-access";

export const LISTING_SELECT = `
  id,
  service_type,
  listing_type,
  owner_id,
  title,
  description,
  location_text,
  price,
  currency,
  status,
  images,
  metadata,
  published_at,
  archived_at,
  deleted_at,
  created_at,
  updated_at,
  owner:profiles!listings_owner_id_fkey(id, username, display_name, avatar_url, age_label, location, role, account_status, keio_verified),
  room_details(*)
`;

export const APPLICATION_SELECT = `
  id,
  service_type,
  listing_id,
  applicant_id,
  owner_id,
  application_type,
  message,
  status,
  requested_start_on,
  requested_end_on,
  decided_at,
  cancelled_at,
  created_at,
  updated_at,
  listing:listings!applications_listing_id_fkey(id, title, location_text, price, status, images, owner_id),
  applicant:profiles!applications_applicant_id_fkey(id, username, display_name, avatar_url, account_status, keio_verified),
  owner:profiles!applications_owner_id_fkey(id, username, display_name, avatar_url, account_status, keio_verified),
  message_threads(id, status, last_message_at)
`;

export const THREAD_SELECT = `
  id,
  service_type,
  listing_id,
  application_id,
  match_id,
  participant_a_id,
  participant_b_id,
  subject,
  status,
  last_message_at,
  created_at,
  updated_at,
  listing:listings!message_threads_listing_id_fkey(id, title, location_text, price, status, images, owner_id),
  application:applications!message_threads_application_id_fkey(id, status, applicant_id, owner_id),
  participant_a:profiles!message_threads_participant_a_id_fkey(id, username, display_name, avatar_url, account_status),
  participant_b:profiles!message_threads_participant_b_id_fkey(id, username, display_name, avatar_url, account_status)
`;

export function getMarketplaceAdminClient() {
  return getSupabaseAdminClient();
}

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function requireMarketplaceUser(supabase, request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      user: null,
      profile: null,
      response: jsonError("ログインが必要です。", 401)
    };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      profile: null,
      response: jsonError("認証を確認できませんでした。", 401)
    };
  }

  const profile = await fetchMarketplaceProfile(supabase, user.id);
  if (!profile) {
    return {
      user,
      profile: null,
      response: jsonError("先にプロフィールを作成してください。", 400)
    };
  }

  if (profile.account_status === "suspended") {
    return {
      user,
      profile,
      response: jsonError("停止中のアカウントでは操作できません。", 403)
    };
  }

  return { user, profile, response: null };
}

export async function requireMarketplaceAdmin(supabase, request) {
  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth;

  if (!canManageMarketplace(auth.profile)) {
    return {
      ...auth,
      response: jsonError("管理者のみアクセスできます。", 403)
    };
  }

  return auth;
}

export async function fetchMarketplaceProfile(supabase, userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, age_label, location, avatar_url, role, account_status, keio_verified")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "プロフィールを読み込めませんでした。");
  }

  return data || null;
}

export async function hasBlockBetween(supabase, leftUserId, rightUserId) {
  if (!leftUserId || !rightUserId) return false;

  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${leftUserId},blocked_id.eq.${rightUserId}),and(blocker_id.eq.${rightUserId},blocked_id.eq.${leftUserId})`)
    .limit(1);

  if (error) {
    throw new Error(error.message || "ブロック状態を確認できませんでした。");
  }

  return Boolean(data?.length);
}

export async function createMarketplaceNotification(
  supabase,
  { recipientId, actorId, type, title, body = "", actionUrl = "", listingId = null, applicationId = null, messageThreadId = null, serviceType = "roomshare", metadata = {} }
) {
  if (!recipientId || !actorId || recipientId === actorId) return;

  await supabase.from("notifications").insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    title,
    body,
    action_url: actionUrl,
    listing_id: listingId,
    application_id: applicationId,
    message_thread_id: messageThreadId,
    service_type: serviceType,
    metadata
  });
}

export async function recordAdminAction(supabase, { adminId, actionType, targetType, targetId, reason = "", metadata = {} }) {
  if (!adminId || !targetType || !targetId) return;

  await supabase.from("admin_actions").insert({
    admin_id: adminId,
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    reason,
    metadata
  });
}

export function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export function normalizeMaybeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

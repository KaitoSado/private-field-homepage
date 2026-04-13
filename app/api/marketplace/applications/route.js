import { NextResponse } from "next/server";
import { canCreateApplication, canManageMarketplace, canUpdateApplicationStatus } from "@/lib/marketplace-access";
import { applicationCreateSchema, applicationStatusSchema, parseWithSchema } from "@/lib/marketplace-validation";
import {
  APPLICATION_SELECT,
  LISTING_SELECT,
  THREAD_SELECT,
  createMarketplaceNotification,
  getMarketplaceAdminClient,
  hasBlockBetween,
  jsonError,
  recordAdminAction,
  requireMarketplaceUser
} from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "mine";
  const applicationId = url.searchParams.get("id") || "";
  const isAdmin = canManageMarketplace(auth.profile);

  let query = supabase.from("applications").select(APPLICATION_SELECT).is("deleted_at", null).order("created_at", { ascending: false }).limit(80);

  if (applicationId) {
    query = query.eq("id", applicationId);
  } else if (mode === "admin") {
    if (!isAdmin) return jsonError("管理者のみアクセスできます。", 403);
  } else if (mode === "owner") {
    query = query.eq("owner_id", auth.user.id);
  } else if (mode === "applicant") {
    query = query.eq("applicant_id", auth.user.id);
  } else {
    query = query.or(`applicant_id.eq.${auth.user.id},owner_id.eq.${auth.user.id}`);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message || "問い合わせを読み込めませんでした。", 400);

  const items = (data || []).filter((item) => isAdmin || item.applicant_id === auth.user.id || item.owner_id === auth.user.id);
  return NextResponse.json({ items });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(applicationCreateSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", parsed.data.listing_id)
    .maybeSingle();

  if (listingError) return jsonError(listingError.message || "掲載を読み込めませんでした。", 400);
  if (!listing || listing.status !== "published" || listing.deleted_at) return jsonError("公開中の掲載が見つかりません。", 404);

  const blocked = await hasBlockBetween(supabase, auth.user.id, listing.owner_id);
  const decision = canCreateApplication({
    viewerId: auth.user.id,
    ownerId: listing.owner_id,
    listingStatus: listing.status,
    viewerAccountStatus: auth.profile.account_status,
    hasProfile: Boolean(auth.profile.display_name),
    isBlocked: blocked
  });
  if (!decision.allowed) return jsonError(decision.reason, 403);

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      service_type: "roomshare",
      listing_id: listing.id,
      applicant_id: auth.user.id,
      owner_id: listing.owner_id,
      application_type: "inquiry",
      message: parsed.data.message,
      status: "pending",
      requested_start_on: parsed.data.requested_start_on,
      requested_end_on: parsed.data.requested_end_on
    })
    .select(APPLICATION_SELECT)
    .single();

  if (applicationError || !application) {
    return jsonError(applicationError?.message || "問い合わせを作成できませんでした。", 400);
  }

  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .insert({
      service_type: "roomshare",
      listing_id: listing.id,
      application_id: application.id,
      participant_a_id: listing.owner_id,
      participant_b_id: auth.user.id,
      subject: listing.title,
      status: "active",
      last_message_at: new Date().toISOString()
    })
    .select(THREAD_SELECT)
    .single();

  if (threadError || !thread) {
    await supabase.from("applications").delete().eq("id", application.id);
    return jsonError(threadError?.message || "チャットを作成できませんでした。", 400);
  }

  const { error: messageError } = await supabase.from("messages").insert({
    thread_id: thread.id,
    sender_id: auth.user.id,
    body: parsed.data.message
  });

  if (messageError) {
    await supabase.from("message_threads").delete().eq("id", thread.id);
    await supabase.from("applications").delete().eq("id", application.id);
    return jsonError(messageError.message || "初回メッセージを保存できませんでした。", 400);
  }

  await createMarketplaceNotification(supabase, {
    recipientId: listing.owner_id,
    actorId: auth.user.id,
    type: "application_received",
    title: "問い合わせが届きました",
    body: listing.title,
    actionUrl: `/apps/roomshare/messages/${thread.id}`,
    listingId: listing.id,
    applicationId: application.id,
    messageThreadId: thread.id
  });

  return NextResponse.json({ item: application, thread });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(applicationStatusSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const { data: current, error: currentError } = await supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (currentError) return jsonError(currentError.message || "問い合わせを読み込めませんでした。", 400);
  if (!current) return jsonError("問い合わせが見つかりません。", 404);

  const isAdmin = canManageMarketplace(auth.profile);
  const decision = canUpdateApplicationStatus({
    viewerId: auth.user.id,
    ownerId: current.owner_id,
    applicantId: current.applicant_id,
    nextStatus: parsed.data.status,
    currentStatus: current.status,
    isAdmin
  });
  if (!decision.allowed) return jsonError(decision.reason, 403);

  const patch = {
    status: parsed.data.status,
    decided_at: ["accepted", "rejected", "completed"].includes(parsed.data.status) ? new Date().toISOString() : current.decided_at,
    cancelled_at: parsed.data.status === "cancelled" ? new Date().toISOString() : current.cancelled_at
  };

  const { data, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", current.id)
    .select(APPLICATION_SELECT)
    .single();

  if (error || !data) return jsonError(error?.message || "問い合わせを更新できませんでした。", 400);

  const recipientId = auth.user.id === current.applicant_id ? current.owner_id : current.applicant_id;
  await createMarketplaceNotification(supabase, {
    recipientId,
    actorId: auth.user.id,
    type: `application_${parsed.data.status}`,
    title: buildStatusTitle(parsed.data.status),
    body: current.listing?.title || "",
    actionUrl: `/apps/roomshare/applications`,
    listingId: current.listing_id,
    applicationId: current.id,
    messageThreadId: current.message_threads?.[0]?.id || null
  });

  if (isAdmin && auth.user.id !== current.owner_id && auth.user.id !== current.applicant_id) {
    await recordAdminAction(supabase, {
      adminId: auth.user.id,
      actionType: `application_${parsed.data.status}`,
      targetType: "application",
      targetId: current.id,
      reason: `${body.reason || ""}`.trim()
    });
  }

  return NextResponse.json({ item: data });
}

function buildStatusTitle(status) {
  if (status === "accepted") return "問い合わせが承認されました";
  if (status === "rejected") return "問い合わせが見送られました";
  if (status === "cancelled") return "問い合わせがキャンセルされました";
  if (status === "completed") return "やりとりが完了しました";
  return "問い合わせが更新されました";
}

import { NextResponse } from "next/server";
import { adminActionSchema, parseWithSchema, REPORT_STATUSES } from "@/lib/marketplace-validation";
import {
  APPLICATION_SELECT,
  LISTING_SELECT,
  createMarketplaceNotification,
  getMarketplaceAdminClient,
  jsonError,
  recordAdminAction,
  requireMarketplaceAdmin
} from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceAdmin(supabase, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource") || "overview";
  const search = `${url.searchParams.get("q") || ""}`.trim();

  if (resource === "users") {
    let query = supabase.from("profiles").select("id, username, display_name, email_domain, keio_verified, role, account_status, location, created_at, updated_at").order("updated_at", { ascending: false }).limit(80);
    if (search) query = query.or(`username.ilike.%${escapeLike(search)}%,display_name.ilike.%${escapeLike(search)}%,location.ilike.%${escapeLike(search)}%`);
    const { data, error } = await query;
    if (error) return jsonError(error.message || "ユーザー一覧を読み込めませんでした。", 400);
    return NextResponse.json({ users: data || [] });
  }

  if (resource === "listings") {
    const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("service_type", "roomshare").order("updated_at", { ascending: false }).limit(80);
    if (error) return jsonError(error.message || "掲載一覧を読み込めませんでした。", 400);
    return NextResponse.json({ listings: data || [] });
  }

  if (resource === "reports") {
    const { data, error } = await supabase
      .from("reports")
      .select("*, reporter:profiles!reports_reporter_id_fkey(id, username, display_name), target_listing:listings!reports_target_listing_id_fkey(id, title, status, owner_id), target_profile:profiles!reports_target_profile_id_fkey(id, username, display_name)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) return jsonError(error.message || "通報一覧を読み込めませんでした。", 400);
    return NextResponse.json({ reports: data || [] });
  }

  if (resource === "applications") {
    const { data, error } = await supabase.from("applications").select(APPLICATION_SELECT).eq("service_type", "roomshare").order("created_at", { ascending: false }).limit(80);
    if (error) return jsonError(error.message || "問い合わせ一覧を読み込めませんでした。", 400);
    return NextResponse.json({ applications: data || [] });
  }

  const [users, listings, reports, applications] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("service_type", "roomshare"),
    supabase.from("reports").select("*", { count: "exact", head: true }).in("status", ["open", "pending", "reviewing"]),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("service_type", "roomshare")
  ]);

  return NextResponse.json({
    summary: {
      users: users.count || 0,
      listings: listings.count || 0,
      openReports: reports.count || 0,
      applications: applications.count || 0
    }
  });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceAdmin(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(adminActionSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const { resource, id, action, reason } = parsed.data;

  if (resource === "user") {
    const nextStatus = action === "resume" ? "active" : action === "suspend" ? "suspended" : "";
    if (!nextStatus) return jsonError("不正なユーザー操作です。", 400);
    const { data, error } = await supabase.from("profiles").update({ account_status: nextStatus }).eq("id", id).select("id, username, display_name, account_status").single();
    if (error || !data) return jsonError(error?.message || "ユーザーを更新できませんでした。", 400);
    await recordAdminAction(supabase, { adminId: auth.user.id, actionType: `user_${action}`, targetType: "user", targetId: id, reason });
    return NextResponse.json({ item: data });
  }

  if (resource === "listing") {
    const statusByAction = { publish: "published", pause: "paused", archive: "archived", reject: "rejected" };
    const status = statusByAction[action];
    if (!status) return jsonError("不正な掲載操作です。", 400);
    const listingPatch = { status };
    if (status === "published") listingPatch.published_at = new Date().toISOString();
    if (status === "archived") listingPatch.archived_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("listings")
      .update(listingPatch)
      .eq("id", id)
      .select(LISTING_SELECT)
      .single();

    if (error || !data) return jsonError(error?.message || "掲載を更新できませんでした。", 400);
    await recordAdminAction(supabase, { adminId: auth.user.id, actionType: `listing_${action}`, targetType: "listing", targetId: id, reason });
    await createMarketplaceNotification(supabase, {
      recipientId: data.owner_id,
      actorId: auth.user.id,
      type: "listing_moderated",
      title: "掲載ステータスが更新されました",
      body: reason || data.title,
      actionUrl: `/apps/roomshare/listings/${id}`,
      listingId: id
    });
    return NextResponse.json({ item: data });
  }

  if (resource === "report") {
    if (!REPORT_STATUSES.includes(action)) return jsonError("不正な通報ステータスです。", 400);
    const { data, error } = await supabase
      .from("reports")
      .update({ status: action, reviewer_id: auth.user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return jsonError(error?.message || "通報を更新できませんでした。", 400);
    await recordAdminAction(supabase, { adminId: auth.user.id, actionType: `report_${action}`, targetType: "report", targetId: id, reason });
    return NextResponse.json({ item: data });
  }

  if (resource === "application") {
    if (!["accepted", "rejected", "cancelled", "completed"].includes(action)) return jsonError("不正な問い合わせステータスです。", 400);
    const { data, error } = await supabase
      .from("applications")
      .update({ status: action, decided_at: new Date().toISOString() })
      .eq("id", id)
      .select(APPLICATION_SELECT)
      .single();
    if (error || !data) return jsonError(error?.message || "問い合わせを更新できませんでした。", 400);
    await recordAdminAction(supabase, { adminId: auth.user.id, actionType: `application_${action}`, targetType: "application", targetId: id, reason });
    return NextResponse.json({ item: data });
  }

  return jsonError("未対応の管理操作です。", 400);
}

function escapeLike(value) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

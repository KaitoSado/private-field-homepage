import { NextResponse } from "next/server";
import { reportCreateSchema, parseWithSchema } from "@/lib/marketplace-validation";
import {
  getMarketplaceAdminClient,
  jsonError,
  recordAdminAction,
  requireMarketplaceAdmin,
  requireMarketplaceUser
} from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceAdmin(supabase, request);
  if (auth.response) return auth.response;

  const { data, error } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(id, username, display_name), target_profile:profiles!reports_target_profile_id_fkey(id, username, display_name), target_listing:listings!reports_target_listing_id_fkey(id, title, status, owner_id)")
    .eq("service_type", "roomshare")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return jsonError(error.message || "通報一覧を読み込めませんでした。", 400);
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(reportCreateSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const target = await resolveReportTarget(supabase, parsed.data);
  if (!target.ok) return jsonError(target.error, target.status || 400);
  if (target.ownerId === auth.user.id) return jsonError("自分の対象は通報できません。", 400);

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: auth.user.id,
      reason: parsed.data.reason,
      details: parsed.data.details,
      status: "open",
      service_type: "roomshare",
      target_type: parsed.data.target_type,
      target_id: parsed.data.target_id,
      target_profile_id: parsed.data.target_type === "user" ? parsed.data.target_id : null,
      target_listing_id: parsed.data.target_type === "listing" ? parsed.data.target_id : null,
      target_message_id: parsed.data.target_type === "message" ? parsed.data.target_id : null
    })
    .select("*")
    .single();

  if (error || !data) return jsonError(error?.message || "通報を保存できませんでした。", 400);
  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceAdmin(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = `${body.id || ""}`.trim();
  const status = `${body.status || ""}`.trim();
  if (!id || !["open", "reviewing", "resolved", "dismissed"].includes(status)) {
    return jsonError("更新内容が不正です。", 400);
  }

  const { data, error } = await supabase
    .from("reports")
    .update({ status, reviewer_id: auth.user.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return jsonError(error?.message || "通報を更新できませんでした。", 400);

  await recordAdminAction(supabase, {
    adminId: auth.user.id,
    actionType: `report_${status}`,
    targetType: "report",
    targetId: id,
    reason: `${body.reason || ""}`.trim()
  });

  return NextResponse.json({ item: data });
}

async function resolveReportTarget(supabase, data) {
  if (data.target_type === "user") {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.target_id).maybeSingle();
    return profile ? { ok: true, ownerId: profile.id } : { ok: false, error: "ユーザーが見つかりません。", status: 404 };
  }

  if (data.target_type === "listing") {
    const { data: listing } = await supabase.from("listings").select("id, owner_id").eq("id", data.target_id).maybeSingle();
    return listing ? { ok: true, ownerId: listing.owner_id } : { ok: false, error: "掲載が見つかりません。", status: 404 };
  }

  const { data: message } = await supabase.from("messages").select("id, sender_id").eq("id", data.target_id).maybeSingle();
  return message ? { ok: true, ownerId: message.sender_id } : { ok: false, error: "メッセージが見つかりません。", status: 404 };
}

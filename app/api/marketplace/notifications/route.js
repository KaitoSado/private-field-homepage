import { NextResponse } from "next/server";
import { getMarketplaceAdminClient, jsonError, requireMarketplaceUser } from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const { data, error } = await supabase
    .from("notifications")
    .select("id, actor_id, type, title, body, action_url, listing_id, application_id, message_thread_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)")
    .eq("recipient_id", auth.user.id)
    .eq("service_type", "roomshare")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return jsonError(error.message || "通知を読み込めませんでした。", 400);
  const unreadCount = (data || []).filter((item) => !item.read_at).length;
  return NextResponse.json({ items: data || [], unreadCount });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const id = `${body.id || ""}`.trim();
  const patch = { read_at: body.read === false ? null : new Date().toISOString() };
  let query = supabase.from("notifications").update(patch).eq("recipient_id", auth.user.id).eq("service_type", "roomshare");

  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.is("read_at", null);
  }

  const { error } = await query;
  if (error) return jsonError(error.message || "通知を更新できませんでした。", 400);
  return NextResponse.json({ ok: true });
}

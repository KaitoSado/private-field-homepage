import { NextResponse } from "next/server";
import { blockCreateSchema, parseWithSchema } from "@/lib/marketplace-validation";
import { getMarketplaceAdminClient, jsonError, requireMarketplaceUser } from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const { data, error } = await supabase
    .from("blocks")
    .select("blocked_id, created_at, blocked:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)")
    .eq("blocker_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message || "ブロック一覧を読み込めませんでした。", 400);
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(blockCreateSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  if (parsed.data.blocked_id === auth.user.id) {
    return jsonError("自分自身はブロックできません。", 400);
  }

  if (body.block === false) {
    await supabase.from("blocks").delete().eq("blocker_id", auth.user.id).eq("blocked_id", parsed.data.blocked_id);
    return NextResponse.json({ blocked: false });
  }

  const { error } = await supabase.from("blocks").upsert({
    blocker_id: auth.user.id,
    blocked_id: parsed.data.blocked_id
  });

  if (error) return jsonError(error.message || "ブロックできませんでした。", 400);
  return NextResponse.json({ blocked: true });
}

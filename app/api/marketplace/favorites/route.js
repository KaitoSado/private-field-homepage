import { NextResponse } from "next/server";
import { canFavoriteListing } from "@/lib/marketplace-access";
import { favoriteToggleSchema, parseWithSchema } from "@/lib/marketplace-validation";
import {
  LISTING_SELECT,
  createMarketplaceNotification,
  getMarketplaceAdminClient,
  jsonError,
  requireMarketplaceUser
} from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const { data, error } = await supabase
    .from("favorites")
    .select("id, listing_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return jsonError(error.message || "お気に入りを読み込めませんでした。", 400);

  const listingIds = (data || []).map((item) => item.listing_id);
  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select(LISTING_SELECT).in("id", listingIds)
    : { data: [] };
  const listingMap = new Map((listings || []).map((listing) => [listing.id, listing]));

  return NextResponse.json({
    items: (data || []).map((item) => ({ ...item, listing: listingMap.get(item.listing_id) || null })).filter((item) => item.listing)
  });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(favoriteToggleSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, owner_id, status, title")
    .eq("id", parsed.data.listing_id)
    .maybeSingle();

  if (listingError) return jsonError(listingError.message || "掲載を読み込めませんでした。", 400);
  if (!listing) return jsonError("掲載が見つかりません。", 404);

  const decision = canFavoriteListing({ viewerId: auth.user.id, listingStatus: listing.status });
  if (!decision.allowed) return jsonError(decision.reason, 403);
  if (listing.owner_id === auth.user.id) {
    return jsonError("自分の掲載はお気に入り対象外です。", 400);
  }

  if (!parsed.data.favorite) {
    await supabase.from("favorites").delete().eq("user_id", auth.user.id).eq("listing_id", listing.id);
    return NextResponse.json({ favorite: false });
  }

  const { error } = await supabase.from("favorites").upsert({
    user_id: auth.user.id,
    listing_id: listing.id,
    service_type: "roomshare"
  });

  if (error) return jsonError(error.message || "お気に入りに追加できませんでした。", 400);

  await createMarketplaceNotification(supabase, {
    recipientId: listing.owner_id,
    actorId: auth.user.id,
    type: "listing_favorited",
    title: "掲載がお気に入りされました",
    body: listing.title,
    actionUrl: `/apps/roomshare/listings/${listing.id}`,
    listingId: listing.id
  });

  return NextResponse.json({ favorite: true });
}

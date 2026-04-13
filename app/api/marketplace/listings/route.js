import { NextResponse } from "next/server";
import { canManageMarketplace } from "@/lib/marketplace-access";
import { filterRoomListingsForSearch, normalizeRoomListingPayload, normalizeRoomSearchParams } from "@/lib/marketplace-validation";
import {
  LISTING_SELECT,
  createMarketplaceNotification,
  fetchMarketplaceProfile,
  getBearerToken,
  getMarketplaceAdminClient,
  jsonError,
  recordAdminAction,
  requireMarketplaceUser
} from "@/lib/marketplace-server";

const MAX_FETCH_ROWS = 240;

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) {
    return jsonError("Supabase admin client is not configured.", 500);
  }

  const url = new URL(request.url);
  const listingId = url.searchParams.get("id") || "";
  const mode = url.searchParams.get("mode") || "public";
  const filters = normalizeRoomSearchParams(url.searchParams);
  const viewer = await fetchViewer(supabase, request);
  const isAdmin = canManageMarketplace(viewer.profile);

  if (listingId) {
    const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("id", listingId).maybeSingle();
    if (error) return jsonError(error.message || "掲載を読み込めませんでした。", 400);
    if (!data || !canReadListing(data, viewer.user?.id, isAdmin)) {
      return jsonError("掲載が見つかりません。", 404);
    }

    const favoriteListingIds = viewer.user ? await fetchFavoriteListingIds(supabase, viewer.user.id, [data.id]) : [];
    return NextResponse.json({ item: data, favoriteListingIds });
  }

  if (mode === "mine" && !viewer.user) {
    return jsonError("ログインが必要です。", 401);
  }

  if (mode === "admin" && !isAdmin) {
    return jsonError("管理者のみアクセスできます。", 403);
  }

  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("service_type", "roomshare")
    .eq("listing_type", "room")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MAX_FETCH_ROWS);

  if (mode === "mine") {
    query = query.eq("owner_id", viewer.user.id);
  } else if (mode !== "admin") {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message || "掲載一覧を読み込めませんでした。", 400);

  const visibleRows = (data || []).filter((item) => mode === "admin" || mode === "mine" || canReadListing(item, viewer.user?.id, isAdmin));
  const filteredRows = mode === "admin" || mode === "mine" ? visibleRows : filterRoomListingsForSearch(visibleRows, filters);
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  const items = filteredRows.slice(start, start + pageSize);
  const favoriteListingIds = viewer.user ? await fetchFavoriteListingIds(supabase, viewer.user.id, items.map((item) => item.id)) : [];

  return NextResponse.json({
    items,
    total: filteredRows.length,
    page,
    pageSize,
    favoriteListingIds
  });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) {
    return jsonError("Supabase admin client is not configured.", 500);
  }

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  if (!auth.profile.display_name) {
    return jsonError("掲載前にプロフィールの表示名を設定してください。", 400);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = normalizeRoomListingPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });
  }

  const listingPayload = buildListingPayload(parsed.data, auth.user.id);
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert(listingPayload)
    .select(LISTING_SELECT)
    .single();

  if (listingError || !listing) {
    return jsonError(listingError?.message || "掲載を作成できませんでした。", 400);
  }

  const { error: detailError } = await supabase.from("room_details").upsert({
    listing_id: listing.id,
    ...parsed.data.room_detail
  });

  if (detailError) {
    await supabase.from("listings").delete().eq("id", listing.id);
    return jsonError(detailError.message || "部屋情報を保存できませんでした。", 400);
  }

  const { data: item } = await supabase.from("listings").select(LISTING_SELECT).eq("id", listing.id).single();
  return NextResponse.json({ item });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) {
    return jsonError("Supabase admin client is not configured.", 500);
  }

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const listingId = `${body.id || ""}`.trim();
  if (!listingId) return jsonError("更新対象が見つかりません。", 400);

  const current = await fetchListingById(supabase, listingId);
  if (!current) return jsonError("掲載が見つかりません。", 404);

  const isAdmin = canManageMarketplace(auth.profile);
  if (current.owner_id !== auth.user.id && !isAdmin) {
    return jsonError("この掲載を編集する権限がありません。", 403);
  }

  if (body.action) {
    return updateListingStatus(supabase, {
      listing: current,
      actor: auth,
      isAdmin,
      action: `${body.action}`.trim(),
      reason: `${body.reason || ""}`.trim()
    });
  }

  const parsed = normalizeRoomListingPayload(body);
  if (!parsed.ok) {
    return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });
  }

  const listingPayload = buildListingPayload(parsed.data, current.owner_id);
  delete listingPayload.owner_id;

  const { error: listingError } = await supabase.from("listings").update(listingPayload).eq("id", listingId);
  if (listingError) return jsonError(listingError.message || "掲載を更新できませんでした。", 400);

  const { error: detailError } = await supabase.from("room_details").upsert({
    listing_id: listingId,
    ...parsed.data.room_detail
  });
  if (detailError) return jsonError(detailError.message || "部屋情報を更新できませんでした。", 400);

  const item = await fetchListingById(supabase, listingId);
  return NextResponse.json({ item });
}

function buildListingPayload(data, ownerId) {
  return {
    service_type: "roomshare",
    listing_type: "room",
    owner_id: ownerId,
    title: data.title,
    description: data.description,
    location_text: data.location_text,
    price: data.room_detail.rent || data.price || 0,
    status: data.status,
    images: data.images || [],
    published_at: data.status === "published" ? new Date().toISOString() : null,
    archived_at: data.status === "archived" ? new Date().toISOString() : null
  };
}

async function updateListingStatus(supabase, { listing, actor, isAdmin, action, reason }) {
  const statusByAction = {
    publish: "published",
    pause: "paused",
    archive: "archived",
    reject: "rejected"
  };

  const nextStatus = statusByAction[action];
  if (!nextStatus) return jsonError("不正な操作です。", 400);
  if (action === "reject" && !isAdmin) return jsonError("管理者だけが却下できます。", 403);

  const patch = {
    status: nextStatus,
    published_at: nextStatus === "published" ? new Date().toISOString() : listing.published_at,
    archived_at: nextStatus === "archived" ? new Date().toISOString() : listing.archived_at
  };

  const { data, error } = await supabase.from("listings").update(patch).eq("id", listing.id).select(LISTING_SELECT).single();
  if (error || !data) return jsonError(error?.message || "掲載ステータスを更新できませんでした。", 400);

  if (isAdmin && actor.user.id !== listing.owner_id) {
    await recordAdminAction(supabase, {
      adminId: actor.user.id,
      actionType: `listing_${action}`,
      targetType: "listing",
      targetId: listing.id,
      reason
    });
    await createMarketplaceNotification(supabase, {
      recipientId: listing.owner_id,
      actorId: actor.user.id,
      type: "listing_moderated",
      title: "掲載ステータスが更新されました",
      body: reason,
      actionUrl: `/apps/roomshare/listings/${listing.id}`,
      listingId: listing.id
    });
  }

  return NextResponse.json({ item: data });
}

async function fetchListingById(supabase, listingId) {
  const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("id", listingId).maybeSingle();
  if (error) throw new Error(error.message || "掲載を読み込めませんでした。");
  return data || null;
}

async function fetchViewer(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return { user: null, profile: null };

  const {
    data: { user }
  } = await supabase.auth.getUser(token);

  if (!user) return { user: null, profile: null };
  const profile = await fetchMarketplaceProfile(supabase, user.id);
  return { user, profile };
}

async function fetchFavoriteListingIds(supabase, userId, listingIds) {
  if (!userId || !listingIds.length) return [];
  const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", userId).in("listing_id", listingIds);
  return (data || []).map((item) => item.listing_id);
}

function canReadListing(listing, viewerId, isAdmin) {
  if (!listing || listing.deleted_at) return false;
  if (isAdmin || listing.owner_id === viewerId) return true;
  return listing.status === "published" && listing.owner?.account_status === "active";
}

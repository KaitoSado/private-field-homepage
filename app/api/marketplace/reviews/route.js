import { NextResponse } from "next/server";
import { canReviewApplication } from "@/lib/marketplace-access";
import { parseWithSchema, reviewCreateSchema } from "@/lib/marketplace-validation";
import { getMarketplaceAdminClient, jsonError, requireMarketplaceUser } from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const url = new URL(request.url);
  const listingId = url.searchParams.get("listing_id") || "";
  const userId = url.searchParams.get("user_id") || "";

  let query = supabase
    .from("reviews")
    .select("id, service_type, reviewer_id, reviewee_id, target_type, target_id, listing_id, application_id, rating, comment, status, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, username, display_name, avatar_url), reviewee:profiles!reviews_reviewee_id_fkey(id, username, display_name, avatar_url)")
    .eq("service_type", "roomshare")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(80);

  if (listingId) query = query.eq("listing_id", listingId);
  if (userId) query = query.eq("reviewee_id", userId);

  const { data, error } = await query;
  if (error) return jsonError(error.message || "レビューを読み込めませんでした。", 400);
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(reviewCreateSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, listing_id, applicant_id, owner_id, status")
    .eq("id", parsed.data.application_id)
    .maybeSingle();

  if (appError) return jsonError(appError.message || "問い合わせを読み込めませんでした。", 400);
  if (!application) return jsonError("問い合わせが見つかりません。", 404);

  const isParticipant = application.applicant_id === auth.user.id || application.owner_id === auth.user.id;
  if (![application.applicant_id, application.owner_id].includes(parsed.data.reviewee_id)) {
    return jsonError("レビュー相手がこのやりとりの参加者ではありません。", 400);
  }
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("reviewer_id", auth.user.id)
    .eq("reviewee_id", parsed.data.reviewee_id)
    .eq("target_type", "application")
    .eq("target_id", application.id)
    .maybeSingle();

  const decision = canReviewApplication({
    reviewerId: auth.user.id,
    revieweeId: parsed.data.reviewee_id,
    applicationStatus: application.status,
    isParticipant,
    hasExistingReview: Boolean(existing)
  });
  if (!decision.allowed) return jsonError(decision.reason, 403);

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      service_type: "roomshare",
      reviewer_id: auth.user.id,
      reviewee_id: parsed.data.reviewee_id,
      target_type: "application",
      target_id: application.id,
      listing_id: application.listing_id,
      application_id: application.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      status: "published"
    })
    .select("*")
    .single();

  if (error || !data) return jsonError(error?.message || "レビューを保存できませんでした。", 400);
  return NextResponse.json({ item: data });
}

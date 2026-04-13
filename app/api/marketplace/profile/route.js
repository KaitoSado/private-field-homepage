import { NextResponse } from "next/server";
import { marketplaceProfileSchema, parseWithSchema } from "@/lib/marketplace-validation";
import { getBearerToken, getMarketplaceAdminClient, jsonError } from "@/lib/marketplace-server";
import { resolveUsername } from "@/lib/profile-path";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await fetchUser(supabase, request);
  if (auth.response) return auth.response;

  const profile = await fetchProfile(supabase, auth.user.id);
  const verification = await fetchLatestVerification(supabase, auth.user.id);

  return NextResponse.json({
    profile,
    identityVerification: verification || { status: "unverified", verification_type: "identity" }
  });
}

export async function PATCH(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await fetchUser(supabase, request);
  if (auth.response) return auth.response;

  const current = await fetchProfile(supabase, auth.user.id);
  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(marketplaceProfileSchema, {
    ...body,
    username: body.username || current?.username || ""
  });

  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const username = resolveUsername(parsed.data.username || current?.username, auth.user.email || "", auth.user.id);
  const payload = {
    id: auth.user.id,
    username,
    display_name: parsed.data.display_name,
    bio: parsed.data.bio,
    age_label: parsed.data.age_label,
    location: parsed.data.location,
    avatar_url: parsed.data.avatar_url,
    discoverable: current?.discoverable ?? true
  };

  const { data, error } = await supabase.from("profiles").upsert(payload).select("id, username, display_name, bio, age_label, location, avatar_url, role, account_status, keio_verified").single();
  if (error || !data) return jsonError(error?.message || "プロフィールを保存できませんでした。", 400);

  return NextResponse.json({ profile: data });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await fetchUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const verificationType = `${body.verification_type || "identity"}`.trim();
  if (!["identity", "driver_license", "age", "address"].includes(verificationType)) {
    return jsonError("本人確認種別が不正です。", 400);
  }

  const { data, error } = await supabase
    .from("identity_verifications")
    .insert({
      user_id: auth.user.id,
      service_type: "roomshare",
      verification_type: verificationType,
      status: "pending",
      submitted_at: new Date().toISOString(),
      metadata: {
        document_storage: "not_collected_in_mvp"
      }
    })
    .select("*")
    .single();

  if (error || !data) return jsonError(error?.message || "本人確認リクエストを保存できませんでした。", 400);
  return NextResponse.json({ identityVerification: data });
}

async function fetchUser(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return { user: null, response: jsonError("ログインが必要です。", 401) };

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) return { user: null, response: jsonError("認証を確認できませんでした。", 401) };
  return { user, response: null };
}

async function fetchProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, age_label, location, avatar_url, role, account_status, keio_verified, discoverable")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message || "プロフィールを読み込めませんでした。");
  return data || null;
}

async function fetchLatestVerification(supabase, userId) {
  const { data, error } = await supabase
    .from("identity_verifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || "本人確認ステータスを読み込めませんでした。");
  return data || null;
}

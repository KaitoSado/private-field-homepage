import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TITLE_LIMIT = 120;
const CAMPUS_LIMIT = 80;
const BODY_LIMIT = 2000;
const CATEGORY_OPTIONS = new Set(["ノート共有", "過去問交換", "空きコマ同行", "機材貸し借り", "引っ越し手伝い", "その他"]);
const MODE_OPTIONS = new Set(["お願い", "提供"]);
const STATUS_OPTIONS = new Set(["募集中", "成立", "停止中"]);

function normalizeValue(value) {
  return `${value || ""}`.trim();
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "書き込むにはログインが必要です。" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "認証を確認できませんでした。" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const payload = {
    title: normalizeValue(body.title),
    category: normalizeValue(body.category),
    help_mode: normalizeValue(body.help_mode),
    campus: normalizeValue(body.campus),
    status: normalizeValue(body.status || "募集中"),
    body: normalizeValue(body.body)
  };

  if (!payload.title || !payload.body || !payload.category || !payload.help_mode) {
    return NextResponse.json({ error: "タイトル、カテゴリ、募集種別、内容は必須です。" }, { status: 400 });
  }

  if (payload.title.length > TITLE_LIMIT || payload.campus.length > CAMPUS_LIMIT || payload.body.length > BODY_LIMIT) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  if (!CATEGORY_OPTIONS.has(payload.category) || !MODE_OPTIONS.has(payload.help_mode) || !STATUS_OPTIONS.has(payload.status)) {
    return NextResponse.json({ error: "入力値が不正です。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("help_requests")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select("id, author_id, title, category, help_mode, campus, status, body, created_at, updated_at, profiles!help_requests_author_id_fkey(id, username, display_name, avatar_url, keio_verified)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "助け合い投稿の保存に失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "認証を確認できませんでした。" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = normalizeValue(body.id);
  const payload = {
    title: normalizeValue(body.title),
    category: normalizeValue(body.category),
    help_mode: normalizeValue(body.help_mode),
    campus: normalizeValue(body.campus),
    status: normalizeValue(body.status || "募集中"),
    body: normalizeValue(body.body)
  };

  if (!id || !payload.title || !payload.body || !payload.category || !payload.help_mode) {
    return NextResponse.json({ error: "更新対象、タイトル、カテゴリ、募集種別、内容は必須です。" }, { status: 400 });
  }

  if (payload.title.length > TITLE_LIMIT || payload.campus.length > CAMPUS_LIMIT || payload.body.length > BODY_LIMIT) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  if (!CATEGORY_OPTIONS.has(payload.category) || !MODE_OPTIONS.has(payload.help_mode) || !STATUS_OPTIONS.has(payload.status)) {
    return NextResponse.json({ error: "入力値が不正です。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("help_requests")
    .update(payload)
    .eq("id", id)
    .eq("author_id", user.id)
    .select("id, author_id, title, category, help_mode, campus, status, body, created_at, updated_at, profiles!help_requests_author_id_fkey(id, username, display_name, avatar_url, keio_verified)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || "助け合い投稿の更新に失敗しました。" }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "この投稿は編集できません。" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

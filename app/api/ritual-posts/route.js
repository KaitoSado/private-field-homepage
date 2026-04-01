import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TITLE_LIMIT = 120;
const TIMING_LIMIT = 80;
const BODY_LIMIT = 2000;
const ROOM_OPTIONS = new Set(["呪詛ログ", "祈祷室", "院生ロビー", "一緒に見る", "生存確認"]);
const VIBE_OPTIONS = new Set(["吐き出したい", "祈ってほしい", "雑談したい", "募集したい", "生存報告"]);

const SELECT_QUERY =
  "id, author_id, room, vibe, title, timing_label, body, created_at, updated_at, profiles!grad_ritual_posts_author_id_fkey(id, username, display_name, avatar_url, keio_verified)";

function normalizeValue(value) {
  return `${value || ""}`.trim();
}

function normalizePayload(body) {
  return {
    room: normalizeValue(body.room || "呪詛ログ"),
    vibe: normalizeValue(body.vibe || "吐き出したい"),
    title: normalizeValue(body.title),
    timing_label: normalizeValue(body.timing_label),
    body: normalizeValue(body.body)
  };
}

function validatePayload(payload) {
  if (!payload.room || !payload.vibe || !payload.title || !payload.body) {
    return "部屋、空気感、タイトル、内容は必須です。";
  }

  if (
    payload.title.length > TITLE_LIMIT ||
    payload.timing_label.length > TIMING_LIMIT ||
    payload.body.length > BODY_LIMIT
  ) {
    return "入力が長すぎます。";
  }

  if (!ROOM_OPTIONS.has(payload.room) || !VIBE_OPTIONS.has(payload.vibe)) {
    return "入力値が不正です。";
  }

  return "";
}

async function resolveUser(request, supabase) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { error: NextResponse.json({ error: "書き込むにはログインが必要です。" }, { status: 401 }) };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: NextResponse.json({ error: "認証を確認できませんでした。" }, { status: 401 }) };
  }

  return { user };
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { user, error } = await resolveUser(request, supabase);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const payload = normalizePayload(body);
  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("grad_ritual_posts")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select(SELECT_QUERY)
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || "書き込みに失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { user, error } = await resolveUser(request, supabase);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const id = normalizeValue(body.id);
  const payload = normalizePayload(body);
  const validationError = validatePayload(payload);

  if (!id) {
    return NextResponse.json({ error: "更新対象が見つかりません。" }, { status: 400 });
  }

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("grad_ritual_posts")
    .update(payload)
    .eq("id", id)
    .eq("author_id", user.id)
    .select(SELECT_QUERY)
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "更新に失敗しました。" }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "この書き込みは編集できません。" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

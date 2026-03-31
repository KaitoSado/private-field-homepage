import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const NOTE_LIMIT = 2000;
const TEXT_LIMIT = 120;

export async function POST(request) {
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
  const payload = {
    course_name: `${body.course_name || ""}`.trim(),
    instructor: `${body.instructor || ""}`.trim(),
    campus: `${body.campus || ""}`.trim(),
    term_label: `${body.term_label || ""}`.trim(),
    weekday: `${body.weekday || ""}`.trim(),
    period_label: `${body.period_label || ""}`.trim(),
    body: `${body.body || ""}`.trim()
  };

  if (!payload.course_name || !payload.body) {
    return NextResponse.json({ error: "授業名とメモは必須です。" }, { status: 400 });
  }

  if (
    payload.course_name.length > TEXT_LIMIT ||
    payload.instructor.length > TEXT_LIMIT ||
    payload.campus.length > TEXT_LIMIT ||
    payload.term_label.length > TEXT_LIMIT ||
    payload.weekday.length > 20 ||
    payload.period_label.length > 40 ||
    payload.body.length > NOTE_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_notes")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select(
      "id, author_id, course_name, instructor, campus, term_label, weekday, period_label, body, created_at, updated_at, profiles!class_notes_author_id_fkey(id, username, display_name, avatar_url)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "授業情報の保存に失敗しました。" }, { status: 400 });
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
  const noteId = `${body.id || ""}`.trim();
  const payload = {
    course_name: `${body.course_name || ""}`.trim(),
    instructor: `${body.instructor || ""}`.trim(),
    campus: `${body.campus || ""}`.trim(),
    term_label: `${body.term_label || ""}`.trim(),
    weekday: `${body.weekday || ""}`.trim(),
    period_label: `${body.period_label || ""}`.trim(),
    body: `${body.body || ""}`.trim()
  };

  if (!noteId || !payload.course_name || !payload.body) {
    return NextResponse.json({ error: "更新対象、授業名、メモは必須です。" }, { status: 400 });
  }

  if (
    payload.course_name.length > TEXT_LIMIT ||
    payload.instructor.length > TEXT_LIMIT ||
    payload.campus.length > TEXT_LIMIT ||
    payload.term_label.length > TEXT_LIMIT ||
    payload.weekday.length > 20 ||
    payload.period_label.length > 40 ||
    payload.body.length > NOTE_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_notes")
    .update(payload)
    .eq("id", noteId)
    .eq("author_id", user.id)
    .select(
      "id, author_id, course_name, instructor, campus, term_label, weekday, period_label, body, created_at, updated_at, profiles!class_notes_author_id_fkey(id, username, display_name, avatar_url)"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || "授業情報の更新に失敗しました。" }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "この反応は編集できません。" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const NOTE_LIMIT = 2000;
const TEXT_LIMIT = 120;
const VERDICT_OPTIONS = new Set(["S", "A", "B", "C", "D"]);
const SCOPE_OPTIONS = new Set(["", "学部", "大学院", "共通"]);

function normalizeScore(value) {
  const raw = `${value ?? ""}`.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

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
    course_scope: `${body.course_scope || ""}`.trim(),
    instructor: `${body.instructor || ""}`.trim(),
    campus: `${body.campus || ""}`.trim(),
    term_label: `${body.term_label || ""}`.trim(),
    weekday: `${body.weekday || ""}`.trim(),
    period_label: `${body.period_label || ""}`.trim(),
    easy_score: normalizeScore(body.easy_score),
    s_score: normalizeScore(body.s_score),
    evaluation_type: `${body.evaluation_type || ""}`.trim(),
    attendance_policy: `${body.attendance_policy || ""}`.trim(),
    assignment_load: normalizeScore(body.assignment_load),
    quality_score: normalizeScore(body.quality_score),
    verdict_grade: `${body.verdict_grade || ""}`.trim().toUpperCase(),
    body: `${body.body || ""}`.trim()
  };

  if (!payload.course_name || !payload.body) {
    return NextResponse.json({ error: "授業名とメモは必須です。" }, { status: 400 });
  }

  if (
    payload.course_name.length > TEXT_LIMIT ||
    payload.course_scope.length > 20 ||
    payload.instructor.length > TEXT_LIMIT ||
    payload.campus.length > TEXT_LIMIT ||
    payload.term_label.length > TEXT_LIMIT ||
    payload.weekday.length > 20 ||
    payload.period_label.length > 40 ||
    payload.evaluation_type.length > 40 ||
    payload.attendance_policy.length > 40 ||
    payload.verdict_grade.length > 4 ||
    payload.body.length > NOTE_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  if (
    (payload.easy_score !== null && (payload.easy_score < 1 || payload.easy_score > 5)) ||
    (payload.s_score !== null && (payload.s_score < 1 || payload.s_score > 5)) ||
    (payload.assignment_load !== null && (payload.assignment_load < 1 || payload.assignment_load > 5)) ||
    (payload.quality_score !== null && (payload.quality_score < 1 || payload.quality_score > 5))
  ) {
    return NextResponse.json({ error: "評価スコアは 1〜5 で入力してください。" }, { status: 400 });
  }

  if (payload.verdict_grade && !VERDICT_OPTIONS.has(payload.verdict_grade)) {
    return NextResponse.json({ error: "判決は S〜D で入力してください。" }, { status: 400 });
  }

  if (!SCOPE_OPTIONS.has(payload.course_scope)) {
    return NextResponse.json({ error: "区分は 学部 / 大学院 / 共通 で入力してください。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_notes")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select(
      "id, author_id, course_name, course_scope, instructor, campus, term_label, weekday, period_label, easy_score, s_score, evaluation_type, attendance_policy, assignment_load, quality_score, verdict_grade, body, created_at, updated_at, profiles!class_notes_author_id_fkey(id, username, display_name, avatar_url)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "授業情報の保存に失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({ item: { ...data, helpful_count: 0 } });
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
    course_scope: `${body.course_scope || ""}`.trim(),
    instructor: `${body.instructor || ""}`.trim(),
    campus: `${body.campus || ""}`.trim(),
    term_label: `${body.term_label || ""}`.trim(),
    weekday: `${body.weekday || ""}`.trim(),
    period_label: `${body.period_label || ""}`.trim(),
    easy_score: normalizeScore(body.easy_score),
    s_score: normalizeScore(body.s_score),
    evaluation_type: `${body.evaluation_type || ""}`.trim(),
    attendance_policy: `${body.attendance_policy || ""}`.trim(),
    assignment_load: normalizeScore(body.assignment_load),
    quality_score: normalizeScore(body.quality_score),
    verdict_grade: `${body.verdict_grade || ""}`.trim().toUpperCase(),
    body: `${body.body || ""}`.trim()
  };

  if (!noteId || !payload.course_name || !payload.body) {
    return NextResponse.json({ error: "更新対象、授業名、メモは必須です。" }, { status: 400 });
  }

  if (
    payload.course_name.length > TEXT_LIMIT ||
    payload.course_scope.length > 20 ||
    payload.instructor.length > TEXT_LIMIT ||
    payload.campus.length > TEXT_LIMIT ||
    payload.term_label.length > TEXT_LIMIT ||
    payload.weekday.length > 20 ||
    payload.period_label.length > 40 ||
    payload.evaluation_type.length > 40 ||
    payload.attendance_policy.length > 40 ||
    payload.verdict_grade.length > 4 ||
    payload.body.length > NOTE_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  if (
    (payload.easy_score !== null && (payload.easy_score < 1 || payload.easy_score > 5)) ||
    (payload.s_score !== null && (payload.s_score < 1 || payload.s_score > 5)) ||
    (payload.assignment_load !== null && (payload.assignment_load < 1 || payload.assignment_load > 5)) ||
    (payload.quality_score !== null && (payload.quality_score < 1 || payload.quality_score > 5))
  ) {
    return NextResponse.json({ error: "評価スコアは 1〜5 で入力してください。" }, { status: 400 });
  }

  if (payload.verdict_grade && !VERDICT_OPTIONS.has(payload.verdict_grade)) {
    return NextResponse.json({ error: "判決は S〜D で入力してください。" }, { status: 400 });
  }

  if (!SCOPE_OPTIONS.has(payload.course_scope)) {
    return NextResponse.json({ error: "区分は 学部 / 大学院 / 共通 で入力してください。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("class_notes")
    .update(payload)
    .eq("id", noteId)
    .eq("author_id", user.id)
    .select(
      "id, author_id, course_name, course_scope, instructor, campus, term_label, weekday, period_label, easy_score, s_score, evaluation_type, attendance_policy, assignment_load, quality_score, verdict_grade, body, created_at, updated_at, profiles!class_notes_author_id_fkey(id, username, display_name, avatar_url)"
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

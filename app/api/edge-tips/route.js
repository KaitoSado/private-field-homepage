import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TITLE_LIMIT = 120;
const CATEGORY_LIMIT = 40;
const CAMPUS_LIMIT = 80;
const BODY_LIMIT = 2000;
const ALLOWED_CATEGORIES = new Set(["学割", "無料", "助成", "食費", "交通", "ソフト", "住まい", "学内", "バイト", "その他"]);

function normalizeUrl(value) {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return "";
  }

  return "";
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
    title: `${body.title || ""}`.trim(),
    category: `${body.category || ""}`.trim(),
    campus: `${body.campus || ""}`.trim(),
    link_url: normalizeUrl(body.link_url),
    body: `${body.body || ""}`.trim()
  };

  if (!payload.title || !payload.body || !payload.category) {
    return NextResponse.json({ error: "タイトル、カテゴリ、内容は必須です。" }, { status: 400 });
  }

  if (
    payload.title.length > TITLE_LIMIT ||
    payload.category.length > CATEGORY_LIMIT ||
    payload.campus.length > CAMPUS_LIMIT ||
    payload.body.length > BODY_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  if (!ALLOWED_CATEGORIES.has(payload.category)) {
    return NextResponse.json({ error: "カテゴリが不正です。" }, { status: 400 });
  }

  if (`${body.link_url || ""}`.trim() && !payload.link_url) {
    return NextResponse.json({ error: "リンクは http/https の URL で入力してください。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("edge_tips")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select("id, author_id, title, category, campus, link_url, body, created_at, updated_at, profiles!edge_tips_author_id_fkey(id, username, display_name, avatar_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "エッジ情報の保存に失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

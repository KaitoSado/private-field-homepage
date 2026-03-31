import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TITLE_LIMIT = 140;
const EXCERPT_LIMIT = 240;
const BODY_LIMIT = 12000;
const PRICE_LIMIT = 40;

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
    title: `${body.title || ""}`.trim(),
    excerpt: `${body.excerpt || ""}`.trim(),
    body: `${body.body || ""}`.trim(),
    price_label: `${body.price_label || ""}`.trim()
  };

  if (!payload.title || !payload.body) {
    return NextResponse.json({ error: "タイトルと本文は必須です。" }, { status: 400 });
  }

  if (
    payload.title.length > TITLE_LIMIT ||
    payload.excerpt.length > EXCERPT_LIMIT ||
    payload.body.length > BODY_LIMIT ||
    payload.price_label.length > PRICE_LIMIT
  ) {
    return NextResponse.json({ error: "入力が長すぎます。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("special_articles")
    .insert({
      author_id: user.id,
      ...payload
    })
    .select("id, author_id, title, excerpt, body, price_label, created_at, updated_at, profiles!special_articles_author_id_fkey(id, username, display_name, avatar_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "特別記事の保存に失敗しました。" }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}

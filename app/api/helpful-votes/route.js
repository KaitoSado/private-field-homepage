import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TARGET_TYPES = new Set(["class_note", "edge_tip"]);

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const token = getBearerToken(request);
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
  const targetType = `${body.targetType || body.target_type || ""}`.trim();
  const targetId = `${body.targetId || body.target_id || ""}`.trim();

  if (!TARGET_TYPES.has(targetType) || !targetId) {
    return NextResponse.json({ error: "投票対象が不正です。" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("cast_helpful_vote", {
    p_voter_id: user.id,
    p_target_type: targetType,
    p_target_id: targetId
  });

  if (error) {
    const message = error.message || "役に立った投票に失敗しました。";

    if (message.includes("already voted")) {
      return NextResponse.json({ error: "この投稿にはすでに投票しています。" }, { status: 409 });
    }

    if (message.includes("no evaluation credits")) {
      return NextResponse.json({ error: "今週の評価ポイントを使い切りました。" }, { status: 400 });
    }

    if (message.includes("cannot vote for own content")) {
      return NextResponse.json({ error: "自分の投稿には投票できません。" }, { status: 400 });
    }

    if (message.includes("target not found")) {
      return NextResponse.json({ error: "投票対象が見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json(data);
}

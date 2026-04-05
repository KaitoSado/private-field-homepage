import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function formatSummary(row) {
  if (!row) {
    return {
      point_balance: 0,
      contribution_score: 0,
      reputation_title: "芽生え",
      evaluation_credits: 0,
      evaluation_cycle_started_at: null
    };
  }

  return {
    point_balance: row.point_balance || 0,
    contribution_score: row.contribution_score || 0,
    reputation_title: row.reputation_title || "芽生え",
    evaluation_credits: row.evaluation_credits || 0,
    evaluation_cycle_started_at: row.evaluation_cycle_started_at || null
  };
}

export async function GET(request) {
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

  const { data: refreshed, error: refreshError } = await supabase.rpc("refresh_economy_account", {
    p_user_id: user.id
  });

  if (refreshError) {
    return NextResponse.json({ error: refreshError.message || "ポイント情報を取得できませんでした。" }, { status: 400 });
  }

  const summaryRow = Array.isArray(refreshed) ? refreshed[0] : refreshed;
  const { data: votes, error: votesError } = await supabase
    .from("helpful_votes")
    .select("target_type, target_id")
    .eq("voter_id", user.id);

  if (votesError) {
    return NextResponse.json({ error: votesError.message || "投票情報を取得できませんでした。" }, { status: 400 });
  }

  const votedTargets = {
    class_note: [],
    edge_tip: []
  };

  for (const vote of votes || []) {
    if (vote.target_type === "class_note") {
      votedTargets.class_note.push(vote.target_id);
    } else if (vote.target_type === "edge_tip") {
      votedTargets.edge_tip.push(vote.target_id);
    }
  }

  return NextResponse.json({
    summary: formatSummary(summaryRow),
    votedTargets
  });
}

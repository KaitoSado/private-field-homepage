import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { UNIVERSITY_BY_KEY, UNIVERSITY_OPTIONS, getUniversityLabel, isValidUniversityKey } from "@/lib/university-ranking";

export const dynamic = "force-dynamic";

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

async function resolveUser(supabase, request) {
  const token = getBearerToken(request);
  if (!token) return null;

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

async function fetchActiveProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.account_status === "active" ? data : null;
}

function isMissingTableError(error) {
  return error?.code === "42P01" || `${error?.message || ""}`.includes("university_ranking_votes");
}

async function buildRankingPayload(supabase, userId = "") {
  const { data: votes, error } = await supabase.from("university_ranking_votes").select("university_key, created_at");

  if (error) {
    if (isMissingTableError(error)) {
      return {
        schemaReady: false,
        totalVotes: 0,
        results: [],
        ownVote: null,
        error: "投票用テーブルがまだ live DB に反映されていません。"
      };
    }
    throw error;
  }

  const counts = new Map();
  for (const vote of votes || []) {
    if (!UNIVERSITY_BY_KEY.has(vote.university_key)) continue;
    counts.set(vote.university_key, (counts.get(vote.university_key) || 0) + 1);
  }

  const totalVotes = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  const results = UNIVERSITY_OPTIONS.map((university) => {
    const votesForUniversity = counts.get(university.key) || 0;
    return {
      ...university,
      votes: votesForUniversity,
      share: totalVotes ? votesForUniversity / totalVotes : 0
    };
  }).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "ja"));

  let ownVote = null;
  if (userId) {
    const { data: ownVoteRow, error: ownVoteError } = await supabase
      .from("university_ranking_votes")
      .select("university_key, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (ownVoteError && !isMissingTableError(ownVoteError)) {
      throw ownVoteError;
    }

    if (ownVoteRow?.university_key) {
      ownVote = {
        universityKey: ownVoteRow.university_key,
        universityName: getUniversityLabel(ownVoteRow.university_key),
        createdAt: ownVoteRow.created_at
      };
    }
  }

  return {
    schemaReady: true,
    totalVotes,
    results,
    ownVote
  };
}

export async function GET(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await resolveUser(supabase, request);
    const payload = await buildRankingPayload(supabase, user?.id || "");
    return NextResponse.json(payload, { status: payload.schemaReady ? 200 : 503 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "ランキングの取得に失敗しました。" }, { status: 500 });
  }
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "投票するにはログインが必要です。" }, { status: 401 });
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "認証を確認できませんでした。" }, { status: 401 });
  }

  const profile = await fetchActiveProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: "有効なプロフィールがあるアカウントだけ投票できます。" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const universityKey = `${body.universityKey || body.university_key || ""}`.trim();

  if (!isValidUniversityKey(universityKey)) {
    return NextResponse.json({ error: "大学を選んでください。" }, { status: 400 });
  }

  const { error } = await supabase.from("university_ranking_votes").insert({
    user_id: user.id,
    university_key: universityKey
  });

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "投票用テーブルがまだ live DB に反映されていません。" }, { status: 503 });
    }

    if (error.code === "23505") {
      return NextResponse.json({ error: "このアカウントではすでに投票済みです。" }, { status: 409 });
    }

    return NextResponse.json({ error: error.message || "投票に失敗しました。" }, { status: 400 });
  }

  const payload = await buildRankingPayload(supabase, user.id);
  return NextResponse.json(payload);
}

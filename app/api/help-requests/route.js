import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const TITLE_LIMIT = 120;
const CAMPUS_LIMIT = 80;
const BODY_LIMIT = 2000;
const REWARD_LIMIT = 500;
const CATEGORY_OPTIONS = new Set(["ノート共有", "過去問交換", "空きコマ同行", "機材貸し借り", "引っ越し手伝い", "その他"]);
const MODE_OPTIONS = new Set(["お願い", "提供"]);
const HELP_REQUEST_SELECT = `
  id,
  author_id,
  accepted_helper_id,
  title,
  category,
  help_mode,
  campus,
  status,
  reward_points,
  reward_escrowed,
  body,
  completed_at,
  created_at,
  updated_at,
  profiles!help_requests_author_id_fkey(id, username, display_name, avatar_url, keio_verified),
  accepted_helper:profiles!help_requests_accepted_helper_id_fkey(id, username, display_name, avatar_url, keio_verified)
`;

function normalizeValue(value) {
  return `${value || ""}`.trim();
}

function normalizePoints(value) {
  const parsed = Number.parseInt(`${value ?? 0}`, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function deriveReputationTitle(score) {
  if (score >= 2000) return "伝説";
  if (score >= 1000) return "先駆者";
  if (score >= 500) return "守護者";
  if (score >= 200) return "匠";
  if (score >= 50) return "旅人";
  return "芽生え";
}

async function ensureEconomyAccount(supabase, userId) {
  const { error } = await supabase.rpc("refresh_economy_account", {
    p_user_id: userId
  });

  if (error) {
    throw new Error(error.message || "ポイント口座を準備できませんでした。");
  }
}

async function fetchEconomyAccount(supabase, userId) {
  await ensureEconomyAccount(supabase, userId);

  const { data, error } = await supabase
    .from("economy_accounts")
    .select("user_id, point_balance, contribution_score, reputation_title, evaluation_credits")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "ポイント口座を読み込めませんでした。");
  }

  return data;
}

async function deriveUserReputationTitle(supabase, userId, score) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message || "称号情報を読み込めませんでした。");
  }

  if (data?.role === "admin") {
    return "創造主";
  }

  return deriveReputationTitle(score);
}

async function reserveRewardPoints(supabase, { userId, amount, requestId, title }) {
  if (amount <= 0) return;

  const account = await fetchEconomyAccount(supabase, userId);
  if (account.point_balance < amount) {
    throw new Error("報酬ptが足りません。拠点で残高を確認してください。");
  }

  const nextBalance = account.point_balance - amount;

  const { error: updateError } = await supabase
    .from("economy_accounts")
    .update({ point_balance: nextBalance })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message || "報酬ptを預けられませんでした。");
  }

  const { error: transactionError } = await supabase.from("point_transactions").insert({
    user_id: userId,
    direction: "debit",
    amount,
    kind: "help_request_escrow",
    meta: {
      request_id: requestId,
      request_title: title
    }
  });

  if (transactionError) {
    await supabase.from("economy_accounts").update({ point_balance: account.point_balance }).eq("user_id", userId);
    throw new Error(transactionError.message || "報酬ptの預け入れを記録できませんでした。");
  }
}

async function creditRewardPoints(supabase, { userId, amount, counterpartyUserId, kind, meta, contributionDelta = 0 }) {
  if (amount <= 0) return;

  const account = await fetchEconomyAccount(supabase, userId);
  const nextContribution = account.contribution_score + contributionDelta;
  const nextBalance = account.point_balance + amount;
  const nextTitle = await deriveUserReputationTitle(supabase, userId, nextContribution);

  const { error: updateError } = await supabase
    .from("economy_accounts")
    .update({
      point_balance: nextBalance,
      contribution_score: nextContribution,
      reputation_title: nextTitle
    })
    .eq("user_id", userId);

  if (updateError) {
    throw new Error(updateError.message || "ポイント残高を更新できませんでした。");
  }

  const { error: transactionError } = await supabase.from("point_transactions").insert({
    user_id: userId,
    counterparty_user_id: counterpartyUserId || null,
    direction: "credit",
    amount,
    kind,
    meta
  });

  if (transactionError) {
    await supabase
      .from("economy_accounts")
      .update({
        point_balance: account.point_balance,
        contribution_score: account.contribution_score,
        reputation_title: account.reputation_title
      })
      .eq("user_id", userId);
    throw new Error(transactionError.message || "ポイント履歴を記録できませんでした。");
  }
}

async function fetchHelpRequest(supabase, requestId) {
  const { data, error } = await supabase
    .from("help_requests")
    .select(HELP_REQUEST_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "助け合い募集を読み込めませんでした。");
  }

  return data;
}

async function fetchHelpRequestFeedback(supabase, requestId, fromUserId) {
  const { data, error } = await supabase
    .from("help_request_feedback")
    .select("id")
    .eq("help_request_id", requestId)
    .eq("from_user_id", fromUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "相互評価の状態を読み込めませんでした。");
  }

  return data;
}

async function fetchSessionUser(supabase, request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return {
      user: null,
      error: NextResponse.json({ error: "ログインが必要です。" }, { status: 401 })
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "認証を確認できませんでした。" }, { status: 401 })
    };
  }

  return { user, error: null };
}

function buildBasePayload(body) {
  return {
    title: normalizeValue(body.title),
    category: normalizeValue(body.category),
    help_mode: normalizeValue(body.help_mode),
    campus: normalizeValue(body.campus),
    body: normalizeValue(body.body)
  };
}

function validateBasePayload(payload) {
  if (!payload.title || !payload.body || !payload.category || !payload.help_mode) {
    throw new Error("タイトル、カテゴリ、募集種別、内容は必須です。");
  }

  if (payload.title.length > TITLE_LIMIT || payload.campus.length > CAMPUS_LIMIT || payload.body.length > BODY_LIMIT) {
    throw new Error("入力が長すぎます。");
  }

  if (!CATEGORY_OPTIONS.has(payload.category) || !MODE_OPTIONS.has(payload.help_mode)) {
    throw new Error("入力値が不正です。");
  }
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { user, error: authError } = await fetchSessionUser(supabase, request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const payload = buildBasePayload(body);
  const rewardPoints = payload.help_mode === "お願い" ? normalizePoints(body.reward_points) : 0;

  try {
    validateBasePayload(payload);
    if (rewardPoints > REWARD_LIMIT) {
      throw new Error(`報酬ptは ${REWARD_LIMIT} までです。`);
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || "入力値が不正です。" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("help_requests")
    .insert({
      author_id: user.id,
      ...payload,
      status: "募集中",
      reward_points: rewardPoints,
      reward_escrowed: 0
    })
    .select(HELP_REQUEST_SELECT)
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message || "助け合い投稿の保存に失敗しました。" }, { status: 400 });
  }

  if (rewardPoints > 0) {
    try {
      await reserveRewardPoints(supabase, {
        userId: user.id,
        amount: rewardPoints,
        requestId: inserted.id,
        title: inserted.title
      });

      const { data: lockedItem, error: lockError } = await supabase
        .from("help_requests")
        .update({ reward_escrowed: rewardPoints })
        .eq("id", inserted.id)
        .eq("author_id", user.id)
        .select(HELP_REQUEST_SELECT)
        .single();

      if (lockError || !lockedItem) {
        throw new Error(lockError?.message || "報酬ptの預け入れを保存できませんでした。");
      }

      return NextResponse.json({ item: lockedItem });
    } catch (error) {
      await supabase.from("help_requests").delete().eq("id", inserted.id).eq("author_id", user.id);
      return NextResponse.json({ error: error.message || "報酬ptの預け入れに失敗しました。" }, { status: 400 });
    }
  }

  return NextResponse.json({ item: inserted });
}

export async function PATCH(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  const { user, error: authError } = await fetchSessionUser(supabase, request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const id = normalizeValue(body.id);
  const action = normalizeValue(body.action);

  if (!id) {
    return NextResponse.json({ error: "更新対象が見つかりません。" }, { status: 400 });
  }

  let currentItem;

  try {
    currentItem = await fetchHelpRequest(supabase, id);
  } catch (error) {
    return NextResponse.json({ error: error.message || "助け合い投稿の読み込みに失敗しました。" }, { status: 400 });
  }

  if (!currentItem) {
    return NextResponse.json({ error: "対象の募集が見つかりません。" }, { status: 404 });
  }

  if (action === "claim") {
    if (currentItem.author_id === user.id) {
      return NextResponse.json({ error: "自分の募集は引き受けられません。" }, { status: 400 });
    }

    if (currentItem.help_mode !== "お願い") {
      return NextResponse.json({ error: "提供募集は引き受けできません。" }, { status: 400 });
    }

    if (currentItem.status !== "募集中" || currentItem.accepted_helper_id) {
      return NextResponse.json({ error: "この募集はすでに動いています。" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("help_requests")
      .update({
        accepted_helper_id: user.id,
        status: "成立"
      })
      .eq("id", id)
      .eq("status", "募集中")
      .is("accepted_helper_id", null)
      .select(HELP_REQUEST_SELECT)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "募集を引き受けられませんでした。" }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  }

  if (action === "complete") {
    if (currentItem.author_id !== user.id) {
      return NextResponse.json({ error: "完了できるのは依頼者だけです。" }, { status: 403 });
    }

    if (currentItem.status !== "成立" || !currentItem.accepted_helper_id) {
      return NextResponse.json({ error: "この募集はまだ完了できません。" }, { status: 400 });
    }

    const payout = Math.max(0, Number(currentItem.reward_escrowed || 0));

    try {
      if (payout > 0) {
        await creditRewardPoints(supabase, {
          userId: currentItem.accepted_helper_id,
          amount: payout,
          counterpartyUserId: currentItem.author_id,
          kind: "help_request_reward",
          contributionDelta: 3,
          meta: {
            request_id: currentItem.id,
            request_title: currentItem.title,
            requester_id: currentItem.author_id
          }
        });
      }
    } catch (error) {
      return NextResponse.json({ error: error.message || "支払い処理に失敗しました。" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("help_requests")
      .update({
        status: "完了",
        reward_escrowed: 0,
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("author_id", user.id)
      .select(HELP_REQUEST_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "完了状態に更新できませんでした。" }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  }

  if (action === "stop") {
    if (currentItem.author_id !== user.id) {
      return NextResponse.json({ error: "停止できるのは投稿者だけです。" }, { status: 403 });
    }

    if (currentItem.status === "完了") {
      return NextResponse.json({ error: "完了済みの募集は停止できません。" }, { status: 400 });
    }

    const refundAmount = Math.max(0, Number(currentItem.reward_escrowed || 0));

    try {
      if (refundAmount > 0) {
        await creditRewardPoints(supabase, {
          userId: currentItem.author_id,
          amount: refundAmount,
          kind: "help_request_refund",
          meta: {
            request_id: currentItem.id,
            request_title: currentItem.title
          }
        });
      }
    } catch (error) {
      return NextResponse.json({ error: error.message || "返金処理に失敗しました。" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("help_requests")
      .update({
        status: "停止中",
        accepted_helper_id: null,
        reward_escrowed: 0
      })
      .eq("id", id)
      .eq("author_id", user.id)
      .select(HELP_REQUEST_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "募集の停止に失敗しました。" }, { status: 400 });
    }

    return NextResponse.json({ item: data });
  }

  if (action === "feedback") {
    if (currentItem.status !== "完了" || !currentItem.accepted_helper_id) {
      return NextResponse.json({ error: "完了済みの助け合いだけ評価できます。" }, { status: 400 });
    }

    const isRequester = currentItem.author_id === user.id;
    const isHelper = currentItem.accepted_helper_id === user.id;

    if (!isRequester && !isHelper) {
      return NextResponse.json({ error: "当事者だけが相互評価できます。" }, { status: 403 });
    }

    const targetUserId = isRequester ? currentItem.accepted_helper_id : currentItem.author_id;

    try {
      const existingFeedback = await fetchHelpRequestFeedback(supabase, currentItem.id, user.id);
      if (existingFeedback) {
        return NextResponse.json({ error: "この助け合いにはすでに評価を送っています。" }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ error: error.message || "相互評価の状態を読み込めませんでした。" }, { status: 400 });
    }

    let insertedFeedback = null;

    try {
      const { data: feedback, error: feedbackError } = await supabase
        .from("help_request_feedback")
        .insert({
          help_request_id: currentItem.id,
          from_user_id: user.id,
          to_user_id: targetUserId,
          kind: "thanks",
          points_awarded: 1,
          contribution_awarded: 2
        })
        .select("id")
        .single();

      if (feedbackError || !feedback) {
        throw new Error(feedbackError?.message || "相互評価を保存できませんでした。");
      }

      insertedFeedback = feedback;

      await creditRewardPoints(supabase, {
        userId: targetUserId,
        amount: 1,
        counterpartyUserId: user.id,
        kind: "help_request_feedback",
        contributionDelta: 2,
        meta: {
          request_id: currentItem.id,
          request_title: currentItem.title,
          from_user_id: user.id
        }
      });
    } catch (error) {
      if (insertedFeedback?.id) {
        await supabase.from("help_request_feedback").delete().eq("id", insertedFeedback.id);
      }

      return NextResponse.json({ error: error.message || "相互評価に失敗しました。" }, { status: 400 });
    }

    const refreshedItem = await fetchHelpRequest(supabase, currentItem.id);
    return NextResponse.json({ item: refreshedItem, feedbackRecorded: true });
  }

  const payload = buildBasePayload(body);

  try {
    validateBasePayload(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "入力値が不正です。" }, { status: 400 });
  }

  if (currentItem.author_id !== user.id) {
    return NextResponse.json({ error: "この投稿は編集できません。" }, { status: 403 });
  }

  if (currentItem.status === "完了") {
    return NextResponse.json({ error: "完了済みの募集は編集できません。" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("help_requests")
    .update(payload)
    .eq("id", id)
    .eq("author_id", user.id)
    .select(HELP_REQUEST_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message || "助け合い投稿の更新に失敗しました。" }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "この投稿は編集できません。" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

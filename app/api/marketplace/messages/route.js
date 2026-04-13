import { NextResponse } from "next/server";
import { canAccessThread, canManageMarketplace, canSendMessage } from "@/lib/marketplace-access";
import { messageCreateSchema, parseWithSchema } from "@/lib/marketplace-validation";
import {
  THREAD_SELECT,
  createMarketplaceNotification,
  getMarketplaceAdminClient,
  hasBlockBetween,
  jsonError,
  requireMarketplaceUser
} from "@/lib/marketplace-server";

export async function GET(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const threadId = url.searchParams.get("thread_id") || "";
  const isAdmin = canManageMarketplace(auth.profile);

  if (threadId) {
    const thread = await fetchThread(supabase, threadId);
    if (!thread) return jsonError("スレッドが見つかりません。", 404);
    if (!canAccessThread({ viewerId: auth.user.id, participantIds: [thread.participant_a_id, thread.participant_b_id], isAdmin })) {
      return jsonError("このスレッドは閲覧できません。", 403);
    }

    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, thread_id, sender_id, body, message_type, read_at, created_at, sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)")
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return jsonError(error.message || "メッセージを読み込めませんでした。", 400);
    return NextResponse.json({ thread, messages: messages || [] });
  }

  const { data, error } = await supabase
    .from("message_threads")
    .select(THREAD_SELECT)
    .or(`participant_a_id.eq.${auth.user.id},participant_b_id.eq.${auth.user.id}`)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(80);

  if (error) return jsonError(error.message || "スレッド一覧を読み込めませんでした。", 400);
  return NextResponse.json({ items: data || [] });
}

export async function POST(request) {
  const supabase = getMarketplaceAdminClient();
  if (!supabase) return jsonError("Supabase admin client is not configured.", 500);

  const auth = await requireMarketplaceUser(supabase, request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseWithSchema(messageCreateSchema, body);
  if (!parsed.ok) return jsonError(parsed.errors[0] || "入力値が不正です。", 400, { errors: parsed.errors });

  const thread = await fetchThread(supabase, parsed.data.thread_id);
  if (!thread) return jsonError("スレッドが見つかりません。", 404);

  const participantIds = [thread.participant_a_id, thread.participant_b_id];
  const recipientId = participantIds.find((id) => id !== auth.user.id);
  const blocked = await hasBlockBetween(supabase, thread.participant_a_id, thread.participant_b_id);
  const decision = canSendMessage({
    viewerId: auth.user.id,
    senderId: auth.user.id,
    participantIds,
    threadStatus: thread.status,
    isBlocked: blocked
  });

  if (!decision.allowed) return jsonError(decision.reason, 403);

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      thread_id: thread.id,
      sender_id: auth.user.id,
      body: parsed.data.body
    })
    .select("id, thread_id, sender_id, body, message_type, read_at, created_at, sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url)")
    .single();

  if (error || !message) return jsonError(error?.message || "メッセージを送信できませんでした。", 400);

  await supabase.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", thread.id);

  await createMarketplaceNotification(supabase, {
    recipientId,
    actorId: auth.user.id,
    type: "message_received",
    title: "メッセージが届きました",
    body: thread.subject,
    actionUrl: `/apps/roomshare/messages/${thread.id}`,
    listingId: thread.listing_id,
    applicationId: thread.application_id,
    messageThreadId: thread.id
  });

  return NextResponse.json({ item: message });
}

async function fetchThread(supabase, threadId) {
  const { data, error } = await supabase.from("message_threads").select(THREAD_SELECT).eq("id", threadId).maybeSingle();
  if (error) throw new Error(error.message || "スレッドを読み込めませんでした。");
  return data || null;
}

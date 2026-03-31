import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientId = `${payload?.recipientId || ""}`.trim();
  const question = `${payload?.question || ""}`.trim();

  if (!recipientId || !question) {
    return NextResponse.json({ error: "Recipient and question are required." }, { status: 400 });
  }

  if (question.length > 280) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }

  const { data: recipient, error: recipientError } = await supabase
    .from("profiles")
    .select("id, username, account_status")
    .eq("id", recipientId)
    .maybeSingle();

  if (recipientError || !recipient || recipient.account_status !== "active") {
    return NextResponse.json({ error: "Recipient profile not found." }, { status: 404 });
  }

  let senderProfileId = null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (token) {
    const {
      data: { user }
    } = await supabase.auth.getUser(token);

    if (user?.id && recipient.username === "kaito-sado") {
      senderProfileId = user.id;
    }
  }

  const { data, error } = await supabase
    .from("anonymous_questions")
    .insert({
      recipient_id: recipient.id,
      sender_profile_id: senderProfileId,
      question
    })
    .select("id, question, answer, created_at, updated_at, sender_profile_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || "Failed to send question." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, item: data });
}

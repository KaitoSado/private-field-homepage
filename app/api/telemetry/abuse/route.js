import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const payload = await request.json().catch(() => ({}));
  const kind = `${payload.kind || "unknown"}`.slice(0, 80);
  const description = `${payload.description || ""}`.slice(0, 1000);

  await supabase.from("abuse_events").insert({
    profile_id: payload.profileId || null,
    kind,
    description,
    metadata: payload.metadata || {}
  });

  if (payload.alert) {
    await supabase.from("admin_alerts").insert({
      level: payload.level || "warning",
      type: kind,
      title: `${kind} detected`,
      body: description,
      metadata: payload.metadata || {}
    });
  }

  return NextResponse.json({ ok: true });
}

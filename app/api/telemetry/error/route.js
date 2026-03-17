import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const payload = await request.json().catch(() => ({}));
  const level = `${payload.level || "error"}`.slice(0, 20);
  const message = `${payload.message || "Unknown error"}`.slice(0, 1000);

  await supabase.from("telemetry_errors").insert({
    level,
    message,
    pathname: `${payload.pathname || ""}`.slice(0, 300),
    source: `${payload.source || "client"}`.slice(0, 120),
    stack: `${payload.stack || ""}`.slice(0, 8000),
    metadata: {
      raw: payload.metadata || null
    }
  });

  if (level === "error") {
    await supabase.from("admin_alerts").insert({
      level: "error",
      type: "telemetry_error",
      title: "Client error captured",
      body: message,
      metadata: {
        pathname: `${payload.pathname || ""}`.slice(0, 300),
        source: `${payload.source || "client"}`.slice(0, 120)
      }
    });
  }

  return NextResponse.json({ ok: true });
}

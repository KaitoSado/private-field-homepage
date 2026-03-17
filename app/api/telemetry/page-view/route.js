import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true });
  }

  const payload = await request.json().catch(() => ({}));
  const headerList = await headers();

  await supabase.from("telemetry_page_views").insert({
    path: `${payload.path || "/"}`.slice(0, 300),
    referrer: `${payload.referrer || ""}`.slice(0, 500),
    user_agent: `${headerList.get("user-agent") || ""}`.slice(0, 500)
  });

  return NextResponse.json({ ok: true });
}

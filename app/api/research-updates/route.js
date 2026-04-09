import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  fetchResearchSessionUser,
  toResearchErrorResponse,
  updateResearchReview,
  upsertResearchUpdate
} from "@/lib/research-progress-server";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await fetchResearchSessionUser(supabase, request);
    const body = await request.json().catch(() => ({}));
    const item = await upsertResearchUpdate({
      supabase,
      userId: user.id,
      body
    });

    return NextResponse.json({ item });
  } catch (error) {
    const response = toResearchErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function PATCH(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await fetchResearchSessionUser(supabase, request);
    const body = await request.json().catch(() => ({}));
    const item = await updateResearchReview({
      supabase,
      userId: user.id,
      body
    });

    return NextResponse.json({ item });
  } catch (error) {
    const response = toResearchErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

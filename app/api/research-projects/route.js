import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  createResearchProject,
  fetchResearchSessionUser,
  toResearchErrorResponse,
  updateResearchProject
} from "@/lib/research-progress-server";

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await fetchResearchSessionUser(supabase, request);
    const body = await request.json().catch(() => ({}));
    const project = await createResearchProject({
      supabase,
      actorId: user.id,
      body
    });

    return NextResponse.json({ project });
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
    const project = await updateResearchProject({
      supabase,
      actorId: user.id,
      body
    });

    return NextResponse.json({ project });
  } catch (error) {
    const response = toResearchErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

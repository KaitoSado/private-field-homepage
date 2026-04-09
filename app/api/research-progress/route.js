import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  createResearchGroup,
  fetchResearchSessionUser,
  getResearchGroupsIndexData,
  getResearchProgressGroupData,
  toResearchErrorResponse,
  upsertResearchGroupMember
} from "@/lib/research-progress-server";
import { getResearchWeekStart } from "@/lib/research-progress";

export async function GET(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await fetchResearchSessionUser(supabase, request);
    const { searchParams } = new URL(request.url);
    const slug = `${searchParams.get("slug") || ""}`.trim();
    const weekStart = `${searchParams.get("weekStart") || ""}`.trim() || getResearchWeekStart();

    if (slug) {
      const payload = await getResearchProgressGroupData({
        supabase,
        userId: user.id,
        slug,
        weekStart
      });
      return NextResponse.json(payload);
    }

    const payload = await getResearchGroupsIndexData({
      supabase,
      userId: user.id,
      weekStart
    });
    return NextResponse.json(payload);
  } catch (error) {
    const response = toResearchErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client is not configured." }, { status: 500 });
  }

  try {
    const user = await fetchResearchSessionUser(supabase, request);
    const body = await request.json().catch(() => ({}));
    const group = await createResearchGroup({
      supabase,
      userId: user.id,
      body
    });

    return NextResponse.json({
      group,
      href: `/apps/research-progress/${group.slug}`
    });
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
    const member = await upsertResearchGroupMember({
      supabase,
      actorId: user.id,
      body
    });

    return NextResponse.json({ member });
  } catch (error) {
    const response = toResearchErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

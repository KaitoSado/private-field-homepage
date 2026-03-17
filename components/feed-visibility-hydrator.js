"use client";

import { useEffect, useMemo } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function FeedVisibilityHydrator() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    async function run() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active || !session) return;

      const [{ data: blocks }, { data: mutes }] = await Promise.all([
        supabase.from("blocks").select("blocked_id").eq("blocker_id", session.user.id),
        supabase.from("mutes").select("muted_id").eq("muter_id", session.user.id)
      ]);

      if (!active) return;

      const hiddenIds = new Set([
        ...(blocks || []).map((row) => row.blocked_id),
        ...(mutes || []).map((row) => row.muted_id)
      ]);

      for (const id of hiddenIds) {
        document.querySelectorAll(`[data-profile-id="${id}"], [data-author-id="${id}"]`).forEach((element) => {
          element.setAttribute("hidden", "hidden");
        });
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [supabase]);

  return null;
}

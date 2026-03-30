"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchOwnProfilePath } from "@/lib/profile-path";

export function MeRedirectPanel() {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [message, setMessage] = useState("自分の公開ページへ移動しています...");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!supabase) {
        setMessage("Supabase の環境変数が未設定です。");
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        router.replace("/auth?next=/me");
        return;
      }

      const next = await fetchOwnProfilePath(supabase, session.user);
      if (!active) return;

      router.replace(next);
      router.refresh();
    }

    run();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <section className="surface empty-state">
      <h1>マイページへ移動中</h1>
      <p>{message}</p>
    </section>
  );
}

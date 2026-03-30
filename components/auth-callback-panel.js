"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchOwnProfilePath } from "@/lib/profile-path";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthCallbackPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [message, setMessage] = useState("認証を処理しています...");

  useEffect(() => {
    let active = true;

    async function run() {
      if (!supabase) {
        setMessage("Supabase の環境変数が未設定です。`.env.local` を確認してください。");
        return;
      }

      const code = searchParams.get("code");
      const next = searchParams.get("next");

      if (!code) {
        setMessage("認証コードが見つかりません。メール内のURLをもう一度開いてください。");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;

      if (error) {
        setMessage(error.message);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();
      const resolvedNext = next || (await fetchOwnProfilePath(supabase, session?.user));

      setMessage("認証が完了しました。移動します...");
      router.replace(resolvedNext);
      router.refresh();
    }

    run();

    return () => {
      active = false;
    };
  }, [router, searchParams, supabase]);

  return (
    <section className="surface empty-state">
      <h1>認証中</h1>
      <p>{message}</p>
    </section>
  );
}

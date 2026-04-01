"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { fetchOwnProfileMeta } from "@/lib/profile-path";

export function MeRedirectPanel() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [state, setState] = useState({
    loading: true,
    authenticated: false,
    path: "/auth",
    role: "user"
  });

  useEffect(() => {
    let active = true;

    async function run() {
      if (!supabase) {
        if (!active) return;
        setState({
          loading: false,
          authenticated: false,
          path: "/auth",
          role: "user"
        });
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session?.user) {
        setState({
          loading: false,
          authenticated: false,
          path: "/auth",
          role: "user"
        });
        return;
      }

      const nextMeta = await fetchOwnProfileMeta(supabase, session.user);
      if (!active) return;

      setState({
        loading: false,
        authenticated: true,
        path: typeof nextMeta === "string" ? nextMeta : nextMeta.path,
        role: typeof nextMeta === "string" ? "user" : nextMeta.role || "user"
      });
    }

    run();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (state.loading) {
    return (
      <section className="surface empty-state">
        <h1>ハブを準備しています</h1>
      </section>
    );
  }

  if (!state.authenticated) {
    return (
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <h1>ログインしてください</h1>
        </div>
        <div className="hero-actions">
          <Link href="/auth?next=/me" className="button button-primary">
            ログイン / 新規登録
          </Link>
          <Link href="/explore" className="button button-secondary">
            発見を見る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="dashboard-layout">
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <h1>ハブ</h1>
        </div>
        <div className="hero-actions">
          <Link href={state.path} className="button button-primary">
            自分の公開ページへ
          </Link>
          <Link href="/notifications" className="button button-secondary">
            通知を見る
          </Link>
        </div>
      </section>

      <section className="section-grid my-page-grid">
        <Link href={state.path} className="surface feature-card">
          <h2>公開ページを開く</h2>
        </Link>

        <Link href="/explore" className="surface feature-card">
          <h2>発見</h2>
        </Link>

        <Link href="/settings" className="surface feature-card">
          <h2>設定</h2>
        </Link>

        <Link href="/notifications" className="surface feature-card">
          <h2>通知</h2>
        </Link>

        {state.role === "admin" ? (
          <>
            <Link href="/admin" className="surface feature-card">
              <h2>モデレーション</h2>
            </Link>
            <Link href="/ops" className="surface feature-card">
              <h2>運用ログ</h2>
            </Link>
          </>
        ) : null}
      </section>
    </div>
  );
}

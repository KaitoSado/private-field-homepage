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
        <h1>My Page を準備しています</h1>
        <p>自分の公開ページとよく使う導線を読み込んでいます。</p>
      </section>
    );
  }

  if (!state.authenticated) {
    return (
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <p className="eyebrow">My Page</p>
          <h1>ログインすると、自分の公開ページが入口になります。</h1>
          <p className="headline">
            ここからプロフィール、記事、通知、設定へ入ります。まずはログインか新規登録をしてください。
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/auth?next=/me" className="button button-primary">
            ログイン / 新規登録
          </Link>
          <Link href="/explore" className="button button-secondary">
            Explore を見る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="dashboard-layout">
      <section className="surface dashboard-hero my-page-gate">
        <div className="dashboard-hero-head">
          <p className="eyebrow">My Page</p>
          <h1>自分の公開ページを起点に動く。</h1>
          <p className="headline">
            プロフィール編集や記事追加は公開ページ側で行い、ここは入口として使います。
          </p>
        </div>
        <div className="hero-actions">
          <Link href="/notifications" className="button button-secondary">
            通知を見る
          </Link>
        </div>
      </section>

      <section className="section-grid my-page-grid">
        <Link href="/explore" className="surface feature-card">
          <p className="eyebrow">Explore</p>
          <h2>他のページを探す</h2>
          <p>公開ページ、記事、タグから人やトピックを辿れます。</p>
        </Link>

        <Link href="/settings" className="surface feature-card">
          <p className="eyebrow">Settings</p>
          <h2>アカウント設定</h2>
          <p>メール、パスワード、公開範囲などの基本設定を管理します。</p>
        </Link>

        <Link href="/notifications" className="surface feature-card">
          <p className="eyebrow">Notifications</p>
          <h2>反応を見る</h2>
          <p>フォロー、コメント、いいね、更新の通知をまとめて確認します。</p>
        </Link>

        {state.role === "admin" ? (
          <>
            <Link href="/admin" className="surface feature-card">
              <p className="eyebrow">Admin</p>
              <h2>モデレーション</h2>
              <p>通報確認、公開制御、コメント削除などの運用を行います。</p>
            </Link>
            <Link href="/ops" className="surface feature-card">
              <p className="eyebrow">Ops</p>
              <h2>運用ログ</h2>
              <p>テレメトリと運用状況を確認します。</p>
            </Link>
          </>
        ) : null}
      </section>
    </div>
  );
}

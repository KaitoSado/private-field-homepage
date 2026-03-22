"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { withBrowserTimeout } from "@/lib/browser-timeout";

export function AccountSettingsPanel() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("読み込み中...");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setStatus("Supabase の環境変数が未設定です。");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session: currentSession }
        } = await withBrowserTimeout(
          supabase.auth.getSession(),
          8000,
          "セッションの確認がタイムアウトしました。再試行してください。"
        );

        if (!mounted) return;
        setSession(currentSession);
        setEmail(currentSession?.user?.email || "");

        if (!currentSession) {
          setStatus("ログインしてください。");
          return;
        }

        const { data: profileRow, error } = await withBrowserTimeout(
          supabase
            .from("profiles")
            .select("id, username, display_name, discoverable, account_status")
            .eq("id", currentSession.user.id)
            .maybeSingle(),
          8000,
          "アカウント設定の取得がタイムアウトしました。再試行してください。"
        );

        if (!mounted) return;
        if (error) {
          setStatus(error.message);
        } else {
          setProfile(profileRow);
          setStatus("設定を読み込みました。");
        }
      } catch (error) {
        if (!mounted) return;
        setStatus(error?.message || "アカウント設定の読み込みに失敗しました。");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [supabase, reloadToken]);

  async function saveProfileSettings(event) {
    event.preventDefault();
    if (!supabase || !session || !profile) return;

    setSavingProfile(true);
    setStatus("");

    const { error } = await supabase
      .from("profiles")
      .update({ discoverable: profile.discoverable })
      .eq("id", session.user.id);

    setStatus(error ? error.message : "アカウント表示設定を保存しました。");
    setSavingProfile(false);
  }

  async function changeEmail(event) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;

    setSavingEmail(true);
    setStatus("");

    const { error } = await supabase.auth.updateUser({
      email: email.trim()
    });

    setStatus(
      error ? error.message : "確認メールを送信しました。新しいメールアドレス側で確認を完了してください。"
    );
    setSavingEmail(false);
  }

  async function changePassword(event) {
    event.preventDefault();
    if (!supabase || password.length < 8) return;

    setSavingPassword(true);
    setStatus("");

    const { error } = await supabase.auth.updateUser({
      password
    });

    setStatus(error ? error.message : "パスワードを更新しました。");
    setPassword("");
    setSavingPassword(false);
  }

  if (!hasSupabaseConfig) {
    return <section className="surface empty-state">Supabase の環境変数が未設定です。</section>;
  }

  if (loading) {
    return (
      <section className="surface empty-state">
        <h1>読み込み中...</h1>
        <p>{status}</p>
        <button type="button" className="button button-secondary" onClick={() => setReloadToken((current) => current + 1)}>
          再試行
        </button>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="surface empty-state">
        <h1>アカウント設定はログイン後に使えます</h1>
        <Link href="/auth" className="button button-primary">
          ログインへ
        </Link>
      </section>
    );
  }

  return (
    <div className="stack-list">
      <section className="surface dashboard-hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>アカウント設定</h1>
          <p>{status}</p>
        </div>
        <div className="hero-actions">
          <Link href="/dashboard" className="button button-secondary">
            ダッシュボード
          </Link>
        </div>
      </section>

      <section className="section-grid admin-grid">
        <form className="surface form-stack" onSubmit={saveProfileSettings}>
          <div>
            <p className="eyebrow">Account</p>
            <h2>公開設定</h2>
          </div>
          <p className="status-text">現在のアカウント状態: {profile?.account_status || "unknown"}</p>
          <p className="field-hint">初期状態では Explore とおすすめに表示されます。非公開にしたい場合だけここで外してください。</p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(profile?.discoverable)}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  discoverable: event.target.checked
                }))
              }
            />
            <span>プロフィールを公開表示する</span>
          </label>
          <button type="submit" className="button button-primary" disabled={savingProfile}>
            {savingProfile ? "保存中..." : "表示設定を保存"}
          </button>
        </form>

        <form className="surface form-stack" onSubmit={changeEmail}>
          <div>
            <p className="eyebrow">Security</p>
            <h2>メールアドレス変更</h2>
          </div>
          <label className="field">
            <span>新しいメールアドレス</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <button type="submit" className="button button-primary" disabled={savingEmail}>
            {savingEmail ? "送信中..." : "確認メールを送る"}
          </button>
        </form>
      </section>

      <form className="surface form-stack" onSubmit={changePassword}>
        <div>
          <p className="eyebrow">Password</p>
          <h2>パスワード変更</h2>
        </div>
        <label className="field">
          <span>新しいパスワード</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>
        <button type="submit" className="button button-primary" disabled={savingPassword}>
          {savingPassword ? "更新中..." : "パスワードを変更"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import { fetchOwnProfilePath } from "@/lib/profile-path";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthPanel() {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("default");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [contactTrap, setContactTrap] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) return;
    if (contactTrap.trim()) {
      setMessage("送信できませんでした。");
      setMessageTone("error");
      await reportAbuseClient({
        kind: "auth_honeypot_hit",
        description: `honeypot field filled during ${mode}`,
        alert: true,
        metadata: {
          mode
        }
      });
      return;
    }

    const limit = checkRateLimit(`auth-${mode}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!limit.allowed) {
      setMessage(`試行回数が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      setMessageTone("error");
      await reportAbuseClient({
        kind: "auth_rate_limited",
        description: `auth ${mode} rate limited`,
        alert: true,
        metadata: {
          mode,
          count: limit.count
        }
      });
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageTone("default");

    try {
      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        if (error) throw error;
        if (data.session) {
          const next = await fetchOwnProfilePath(supabase, data.session.user);
          setMessage("アカウントを作成しました。公開ページへ移動します。");
          setMessageTone("success");
          markRateLimitAction(`auth-${mode}`);
          router.push(next);
          router.refresh();
          window.location.assign(next);
          return;
        }
        markRateLimitAction(`auth-${mode}`);
        setMessage("確認メールを送信しました。メール内リンクから認証を完了してください。");
        setMessageTone("success");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const {
          data: { session }
        } = await supabase.auth.getSession();
        const next = await fetchOwnProfilePath(supabase, session?.user);
        setMessage("ログインしました。公開ページへ移動します。");
        setMessageTone("success");
        markRateLimitAction(`auth-${mode}`);
        router.push(next);
        router.refresh();
        window.location.assign(next);
      }
    } catch (error) {
      setMessage(error.message || "認証に失敗しました。");
      setMessageTone("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!supabase || !email) {
      setMessage("パスワード再設定メールを送るには、先にメールアドレスを入力してください。");
      setMessageTone("error");
      return;
    }

    setSendingReset(true);
    setMessage("");
    setMessageTone("default");

    try {
      const redirectTo = `${window.location.origin}/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMessage("パスワード再設定メールを送信しました。");
      setMessageTone("success");
    } catch (error) {
      setMessage(error.message || "パスワード再設定メールの送信に失敗しました。");
      setMessageTone("error");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="surface auth-card">
      {!hasSupabaseConfig ? (
        <p className="status-text">
          `.env.local` に Supabase の URL と anon key を設定してください。設定後に認証フォームが動作します。
        </p>
      ) : null}

      <div className="tab-row">
        <button
          type="button"
          className={`tab-button ${mode === "signin" ? "active" : ""}`}
          onClick={() => setMode("signin")}
        >
          ログイン
        </button>
        <button
          type="button"
          className={`tab-button ${mode === "signup" ? "active" : ""}`}
          onClick={() => setMode("signup")}
        >
          新規登録
        </button>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field honeypot-field" aria-hidden="true">
          <span>leave empty</span>
          <input
            value={contactTrap}
            onChange={(event) => setContactTrap(event.target.value)}
            name="contact_me_by_fax_only"
            tabIndex={-1}
            autoComplete="new-password"
          />
        </label>

        <label className="field">
          <span>メールアドレス</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>

        <label className="field">
          <span>パスワード</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>

        <button type="submit" className="button button-primary full-width" disabled={loading || !hasSupabaseConfig}>
          {loading ? "送信中..." : mode === "signup" ? "アカウント作成" : "ログイン"}
        </button>
      </form>

      {mode === "signin" ? (
        <button
          type="button"
          className="text-button"
          disabled={sendingReset || !hasSupabaseConfig}
          onClick={handleResetPassword}
        >
          {sendingReset ? "送信中..." : "パスワードを忘れた場合"}
        </button>
      ) : null}

      <p className={`status-text status-${messageTone}`}>{message || "登録後は自分の公開ページをそのまま編集できます。"}</p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchOwnProfilePath } from "@/lib/profile-path";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ResetPasswordPanel() {
  const router = useRouter();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? "メールから遷移した後、新しいパスワードを設定してください。"
      : "Supabase の環境変数が未設定です。`.env.local` を確認してください。"
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const next = await fetchOwnProfilePath(supabase, session?.user);
      setMessage("パスワードを更新しました。公開ページへ移動します...");
      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface auth-card">
      <div className="auth-copy-block">
        <p className="eyebrow">Reset password</p>
        <h1>新しいパスワードを設定</h1>
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
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

        <button
          type="submit"
          className="button button-primary full-width"
          disabled={loading || !hasSupabaseConfig}
        >
          {loading ? "更新中..." : "パスワードを更新"}
        </button>
      </form>

      <p className="status-text">{message}</p>
    </section>
  );
}

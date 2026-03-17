"use client";

import { useEffect, useMemo, useState } from "react";
import { checkRateLimit, formatRetryAfter, markRateLimitAction, reportAbuseClient } from "@/lib/abuse-client";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function ReportAction({ targetProfileId = null, targetPostId = null, label = "通報" }) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const supabase = useMemo(() => (hasSupabaseConfig ? getSupabaseBrowserClient() : null), [hasSupabaseConfig]);
  const [session, setSession] = useState(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) {
        setSession(currentSession);
      }
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleReport() {
    if (!supabase || !session) {
      setMessage("通報するにはログインしてください。");
      return;
    }

    if (targetProfileId && session.user.id === targetProfileId) {
      setMessage("自分自身は通報できません。");
      return;
    }

    const limit = checkRateLimit("report-create", { windowMs: 60 * 60 * 1000, max: 3 });
    if (!limit.allowed) {
      setMessage(`通報の送信が多すぎます。${formatRetryAfter(limit.retryAfterMs)}後に再試行してください。`);
      await reportAbuseClient({
        profileId: session.user.id,
        kind: "report_rate_limited",
        description: "report action rate limited",
        alert: true,
        metadata: {
          count: limit.count
        }
      });
      return;
    }

    const reason = window.prompt("通報理由を入力してください。例: spam, harassment, impersonation");
    if (!reason?.trim()) return;
    const details = window.prompt("補足があれば入力してください。任意です。") || "";

    setSending(true);
    setMessage("");

    const payload = {
      reporter_id: session.user.id,
      reason: reason.trim().slice(0, 120),
      details: details.trim().slice(0, 500),
      target_profile_id: targetProfileId,
      target_post_id: targetPostId
    };

    const { error } = await supabase.from("reports").insert(payload);

    if (error) {
      setMessage(error.message);
    } else {
      markRateLimitAction("report-create");
      void reportAbuseClient({
        profileId: session.user.id,
        kind: "report_created",
        description: reason.trim(),
        alert: true,
        metadata: {
          targetProfileId,
          targetPostId
        }
      });
      setMessage("通報を受け付けました。");
    }

    setSending(false);
  }

  return (
    <div className="report-action">
      <button type="button" className="button button-ghost" onClick={handleReport} disabled={sending}>
        {sending ? "送信中..." : label}
      </button>
      {message ? <p className="status-text">{message}</p> : null}
    </div>
  );
}

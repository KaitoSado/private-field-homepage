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
  const [economy, setEconomy] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [economyStatus, setEconomyStatus] = useState("");

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

      const [nextMeta] = await Promise.all([
        fetchOwnProfileMeta(supabase, session.user),
        loadEconomy(supabase, session.user.id, {
          onEconomy: (nextEconomy) => {
            if (!active) return;
            setEconomy(nextEconomy);
          },
          onTransactions: (nextTransactions) => {
            if (!active) return;
            setTransactions(nextTransactions);
          },
          onStatus: (nextStatus) => {
            if (!active) return;
            setEconomyStatus(nextStatus);
          }
        })
      ]);

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

  useEffect(() => {
    if (!supabase || !state.authenticated) return;

    let active = true;

    async function refresh() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!active || !session?.user?.id) return;

      await loadEconomy(supabase, session.user.id, {
        onEconomy: (nextEconomy) => {
          if (!active) return;
          setEconomy(nextEconomy);
        },
        onTransactions: (nextTransactions) => {
          if (!active) return;
          setTransactions(nextTransactions);
        },
        onStatus: (nextStatus) => {
          if (!active) return;
          setEconomyStatus(nextStatus);
        }
      });
    }

    function handleFocus() {
      refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, state.authenticated]);

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

      <section className="section-grid my-page-economy">
        <div className="surface feature-card my-page-economy-card">
          <h2>ポイント</h2>
          {economy ? (
            <div className="economy-status-strip" aria-label="ポイント状況">
              <div className="economy-chip">
                <strong>{economy.point_balance}</strong>
                <span>保有pt</span>
              </div>
              <div className="economy-chip">
                <strong>{economy.evaluation_credits}</strong>
                <span>今週の評価票</span>
              </div>
              <div className="economy-chip">
                <strong>{economy.reputation_title}</strong>
                <span>称号</span>
              </div>
            </div>
          ) : null}
          {economyStatus ? <p className="muted">{economyStatus}</p> : null}
          <div className="hero-actions">
            <Link href="/apps/classes" className="button button-ghost">
              裏シラバスで使う
            </Link>
            <Link href="/apps/edge" className="button button-ghost">
              エッジ情報で使う
            </Link>
            <button
              type="button"
              className="button button-ghost"
              onClick={async () => {
                const {
                  data: { session }
                } = await supabase.auth.getSession();

                if (!session?.user?.id) return;

                await loadEconomy(supabase, session.user.id, {
                  onEconomy: setEconomy,
                  onTransactions: setTransactions,
                  onStatus: setEconomyStatus
                });
              }}
            >
              更新
            </button>
          </div>
        </div>

        <div className="surface feature-card my-page-transactions-card">
          <h2>最近の増減</h2>
          {transactions.length ? (
            <div className="my-page-transaction-list">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="my-page-transaction-row">
                  <div className="my-page-transaction-copy">
                    <strong>{formatTransactionLabel(transaction)}</strong>
                    <span>{formatTransactionMeta(transaction)}</span>
                  </div>
                  <div className="my-page-transaction-side">
                    <strong className={transaction.direction === "credit" ? "status-success" : "status-error"}>
                      {transaction.direction === "credit" ? "+" : "-"}
                      {transaction.amount}pt
                    </strong>
                    <span>{formatShortDate(transaction.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">まだポイントの増減はありません。</p>
          )}
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

async function loadEconomy(supabase, userId, handlers) {
  try {
    const [{ data: refreshed, error: refreshError }, { data: history, error: historyError }] = await Promise.all([
      supabase.rpc("refresh_economy_account", {
        p_user_id: userId
      }),
      supabase
        .from("point_transactions")
        .select("id, direction, amount, kind, meta, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12)
    ]);

    if (refreshError) throw refreshError;
    if (historyError) throw historyError;

    const summaryRow = Array.isArray(refreshed) ? refreshed[0] : refreshed;
    handlers.onEconomy(summaryRow || null);
    handlers.onTransactions(history || []);
    handlers.onStatus("");
  } catch (error) {
    handlers.onEconomy(null);
    handlers.onTransactions([]);
    handlers.onStatus(error.message || "ポイント状況を読み込めませんでした。");
  }
}

function formatTransactionLabel(transaction) {
  if (transaction.kind === "helpful_reward") {
    return "役に立った報酬";
  }

  if (transaction.kind === "help_request_escrow") {
    return "助け合いの預け入れ";
  }

  if (transaction.kind === "help_request_reward") {
    return "助け合い報酬";
  }

  if (transaction.kind === "help_request_refund") {
    return "助け合いの返金";
  }

  return transaction.kind || "ポイント移動";
}

function formatTransactionMeta(transaction) {
  if (transaction.meta?.request_title) {
    return transaction.meta.request_title;
  }

  const targetType = transaction.meta?.target_type;
  if (targetType === "class_note") {
    return "裏シラバス";
  }

  if (targetType === "edge_tip") {
    return "エッジ情報";
  }

  return "コミュニティ経済";
}

function formatShortDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

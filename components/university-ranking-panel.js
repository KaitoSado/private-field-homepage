"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { UNIVERSITY_OPTIONS } from "@/lib/university-ranking";

const initialRanking = UNIVERSITY_OPTIONS.map((university) => ({
  ...university,
  votes: 0,
  share: 0
}));

export function UniversityRankingPanel() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [ranking, setRanking] = useState(initialRanking);
  const [totalVotes, setTotalVotes] = useState(0);
  const [ownVote, setOwnVote] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("読み込み中です。");
  const [submitting, setSubmitting] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(currentSession);
      await loadRanking(currentSession);
    }

    bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      await loadRanking(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const selectedUniversity = useMemo(
    () => UNIVERSITY_OPTIONS.find((university) => university.key === selectedKey) || null,
    [selectedKey]
  );

  const filteredUniversities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return UNIVERSITY_OPTIONS;

    return UNIVERSITY_OPTIONS.filter((university) =>
      [university.name, university.area, university.type].join(" ").toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  async function loadRanking(currentSession = session) {
    try {
      const response = await fetch("/api/university-ranking", {
        headers: currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {}
      });
      const payload = await response.json().catch(() => ({}));

      setSchemaReady(payload.schemaReady !== false);
      if (payload.results?.length) setRanking(payload.results);
      setTotalVotes(payload.totalVotes || 0);
      setOwnVote(payload.ownVote || null);
      setStatus(payload.error || "");
    } catch {
      setStatus("ランキングの読み込みに失敗しました。");
    }
  }

  async function submitVote(event) {
    event.preventDefault();

    if (!session?.user) {
      setStatus("投票するにはログインが必要です。");
      return;
    }

    if (!selectedKey) {
      setStatus("大学を選んでください。");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();

      const response = await fetch("/api/university-ranking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentSession?.access_token ? { Authorization: `Bearer ${currentSession.access_token}` } : {})
        },
        body: JSON.stringify({ universityKey: selectedKey })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "投票に失敗しました。");
      }

      setRanking(payload.results || initialRanking);
      setTotalVotes(payload.totalVotes || 0);
      setOwnVote(payload.ownVote || null);
      setSelectedKey("");
      setStatus("投票しました。");
    } catch (error) {
      setStatus(error.message || "投票に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="university-ranking-shell">
      <section className="university-ranking-hero">
        <div>
          <p className="eyebrow">Campus Vote</p>
          <h1>日本版・世界大学ランキング</h1>
          <p>どの大学が一番いいか、1アカウント1回だけ投票するシンプルなランキングです。</p>
        </div>
        <div className="university-ranking-stats" aria-label="投票状況">
          <span>総投票</span>
          <strong>{totalVotes}</strong>
        </div>
      </section>

      <section className="university-ranking-layout">
        <section className="university-ranking-vote-panel">
          <div className="university-ranking-section-head">
            <h2>投票する</h2>
            {ownVote ? <span>{ownVote.universityName} に投票済み</span> : <span>一票だけ</span>}
          </div>

          {!session ? (
            <div className="university-ranking-login">
              <p>ログインすると投票できます。ランキングの閲覧はログインなしで見られます。</p>
              <Link className="button button-primary" href="/auth?next=/apps/university-ranking">
                ログインして投票
              </Link>
            </div>
          ) : null}

          <form onSubmit={submitVote} className="university-ranking-form">
            <label>
              <span>大学を探す</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="大学名・地域・種別"
                disabled={Boolean(ownVote)}
              />
            </label>

            <div className="university-ranking-option-grid">
              {filteredUniversities.map((university) => (
                <button
                  key={university.key}
                  type="button"
                  className={`university-ranking-option ${selectedKey === university.key ? "is-selected" : ""}`}
                  onClick={() => setSelectedKey(university.key)}
                  disabled={Boolean(ownVote)}
                >
                  <strong>{university.name}</strong>
                  <span>
                    {university.area} / {university.type}
                  </span>
                </button>
              ))}
            </div>

            <button className="button button-primary full-width" type="submit" disabled={!session || !selectedUniversity || Boolean(ownVote) || submitting || !schemaReady}>
              {submitting ? "投票中" : selectedUniversity ? `${selectedUniversity.name} に投票` : "大学を選ぶ"}
            </button>
          </form>

          {status ? <p className="university-ranking-status">{status}</p> : null}
        </section>

        <section className="university-ranking-board">
          <div className="university-ranking-section-head">
            <h2>現在のランキング</h2>
            <span>{totalVotes ? "リアルタイム集計" : "まだ投票なし"}</span>
          </div>

          <ol className="university-ranking-list">
            {ranking.slice(0, 20).map((university, index) => (
              <li key={university.key} className={university.votes ? "" : "is-empty"}>
                <div className="university-ranking-rank">{index + 1}</div>
                <div className="university-ranking-result-main">
                  <div className="university-ranking-result-copy">
                    <strong>{university.name}</strong>
                    <span>
                      {university.area} / {university.type}
                    </span>
                  </div>
                  <div className="university-ranking-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(university.share * 100, university.votes ? 6 : 0)}%` }} />
                  </div>
                </div>
                <div className="university-ranking-votes">{university.votes}</div>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

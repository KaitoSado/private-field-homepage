"use client";

import { useEffect, useMemo, useState } from "react";

const tabs = [
  { id: "tictactoe", label: "Tic-Tac-Toe" },
  { id: "reaction", label: "Reaction Tap" },
  { id: "memory", label: "Memory Flip" }
];

const memoryIcons = ["◉", "△", "☾", "✦", "☀", "◇"];

export function GameArcade() {
  const [activeTab, setActiveTab] = useState("tictactoe");

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head">
        <div className="section-copy">
          <p className="eyebrow">Games</p>
          <h1 className="page-title">ちょっと遊べるゲームハブ</h1>
          <p>Apps の中で、そのまま遊べる軽いゲームをまとめています。まずは短く遊べる 3 本を入れています。</p>
        </div>
        <div className="surface feature-card arcade-hero-card">
          <p className="eyebrow">Arcade</p>
          <h2>切り替えてすぐ遊ぶ。</h2>
          <p>盤面系、反射神経系、記憶系を並べています。今後ここにゲームを増やせます。</p>
        </div>
      </section>

      <section className="section-grid">
        <div className="arcade-tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`signature-filter-chip ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "tictactoe" ? <TicTacToeGame /> : null}
        {activeTab === "reaction" ? <ReactionTapGame /> : null}
        {activeTab === "memory" ? <MemoryFlipGame /> : null}
      </section>
    </div>
  );
}

function TicTacToeGame() {
  const [cells, setCells] = useState(Array(9).fill(""));
  const [turn, setTurn] = useState("X");

  const winner = useMemo(() => getWinner(cells), [cells]);
  const isDraw = !winner && cells.every(Boolean);

  function place(index) {
    if (cells[index] || winner) return;
    const next = [...cells];
    next[index] = turn;
    setCells(next);
    setTurn((current) => (current === "X" ? "O" : "X"));
  }

  function reset() {
    setCells(Array(9).fill(""));
    setTurn("X");
  }

  return (
    <div className="arcade-panel-grid">
      <div className="surface arcade-game-card">
        <div className="section-copy">
          <p className="eyebrow">Board game</p>
          <h2>Tic-Tac-Toe</h2>
          <p>{winner ? `${winner} の勝ち` : isDraw ? "引き分け" : `${turn} のターン`}</p>
        </div>
        <div className="arcade-board">
          {cells.map((cell, index) => (
            <button key={index} type="button" className="arcade-board-cell" onClick={() => place(index)}>
              {cell}
            </button>
          ))}
        </div>
        <div className="hero-actions">
          <button type="button" className="button button-secondary" onClick={reset}>
            もう一度
          </button>
        </div>
      </div>

      <div className="surface arcade-side-card">
        <p className="eyebrow">How to play</p>
        <h3>3つ揃えたら勝ち</h3>
        <p>単純ですが、Apps にゲームがある状態を作る最初の一本としてちょうどいいので入れています。</p>
      </div>
    </div>
  );
}

function ReactionTapGame() {
  const [phase, setPhase] = useState("idle");
  const [message, setMessage] = useState("スタートを押すと、色が変わった瞬間を測定します。");
  const [best, setBest] = useState(null);
  const [startAt, setStartAt] = useState(0);

  useEffect(() => {
    if (phase !== "waiting") return undefined;
    const delay = 1000 + Math.random() * 2500;
    const timer = window.setTimeout(() => {
      setPhase("ready");
      setStartAt(performance.now());
      setMessage("今！");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function start() {
    setPhase("waiting");
    setMessage("まだ押さないでください...");
  }

  function tap() {
    if (phase === "waiting") {
      setPhase("idle");
      setMessage("早押しです。もう一度。");
      return;
    }

    if (phase === "ready") {
      const time = Math.round(performance.now() - startAt);
      setBest((current) => (current === null ? time : Math.min(current, time)));
      setPhase("idle");
      setMessage(`${time}ms`);
    }
  }

  return (
    <div className="arcade-panel-grid">
      <div className={`surface arcade-game-card arcade-reaction-card is-${phase}`}>
        <div className="section-copy">
          <p className="eyebrow">Reflex</p>
          <h2>Reaction Tap</h2>
          <p>{message}</p>
        </div>
        <button type="button" className="arcade-reaction-stage" onClick={phase === "idle" ? start : tap}>
          {phase === "idle" ? "スタート" : phase === "waiting" ? "待機中" : "タップ"}
        </button>
        <div className="inline-meta">
          <span>{best === null ? "best --" : `best ${best}ms`}</span>
        </div>
      </div>

      <div className="surface arcade-side-card">
        <p className="eyebrow">Rule</p>
        <h3>緑になった瞬間に押す</h3>
        <p>早押しすると失敗扱いです。単発で気軽に遊べる反射神経ゲームです。</p>
      </div>
    </div>
  );
}

function MemoryFlipGame() {
  const [cards, setCards] = useState(() => buildMemoryDeck());
  const [openIds, setOpenIds] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (openIds.length !== 2) return undefined;
    const [firstId, secondId] = openIds;
    const first = cards.find((card) => card.id === firstId);
    const second = cards.find((card) => card.id === secondId);

    if (first?.symbol === second?.symbol) {
      setMatchedIds((current) => [...current, firstId, secondId]);
      setOpenIds([]);
      return undefined;
    }

    const timer = window.setTimeout(() => setOpenIds([]), 700);
    return () => window.clearTimeout(timer);
  }, [cards, openIds]);

  function flip(id) {
    if (openIds.length === 2 || openIds.includes(id) || matchedIds.includes(id)) return;
    setOpenIds((current) => [...current, id]);
    setMoves((current) => current + 1);
  }

  function reset() {
    setCards(buildMemoryDeck());
    setOpenIds([]);
    setMatchedIds([]);
    setMoves(0);
  }

  const cleared = matchedIds.length === cards.length;

  return (
    <div className="arcade-panel-grid">
      <div className="surface arcade-game-card">
        <div className="section-copy">
          <p className="eyebrow">Memory</p>
          <h2>Memory Flip</h2>
          <p>{cleared ? `クリアしました。${moves} 手` : `${moves} 手で進行中`}</p>
        </div>
        <div className="arcade-memory-grid">
          {cards.map((card) => {
            const open = openIds.includes(card.id) || matchedIds.includes(card.id);
            return (
              <button key={card.id} type="button" className={`arcade-memory-card ${open ? "is-open" : ""}`} onClick={() => flip(card.id)}>
                <span>{open ? card.symbol : "?"}</span>
              </button>
            );
          })}
        </div>
        <div className="hero-actions">
          <button type="button" className="button button-secondary" onClick={reset}>
            リセット
          </button>
        </div>
      </div>

      <div className="surface arcade-side-card">
        <p className="eyebrow">Hint</p>
        <h3>同じ記号を揃える</h3>
        <p>短時間で終わる記憶ゲームです。ゲームハブの中でも一番軽く遊べます。</p>
      </div>
    </div>
  );
}

function getWinner(cells) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }

  return "";
}

function buildMemoryDeck() {
  return [...memoryIcons, ...memoryIcons]
    .map((symbol, index) => ({ id: `${symbol}-${index}`, symbol }))
    .sort(() => Math.random() - 0.5);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { BreakoutGame } from "@/components/breakout-game";

const tabs = [
  { id: "breakout", label: "Breakout" },
  { id: "tetris", label: "Tetris" },
  { id: "tictactoe", label: "Tic-Tac-Toe" },
  { id: "reaction", label: "Reaction Tap" },
  { id: "memory", label: "Memory Flip" }
];

const memoryIcons = ["◉", "△", "☾", "✦", "☀", "◇"];
const TETRIS_WIDTH = 10;
const TETRIS_HEIGHT = 20;
const TETRIS_SHAPES = {
  I: {
    color: "#6ee7f9",
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1]
    ]
  },
  O: {
    color: "#ffd166",
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1]
    ]
  },
  T: {
    color: "#c084fc",
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ]
  },
  L: {
    color: "#fb923c",
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ]
  },
  J: {
    color: "#60a5fa",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1]
    ]
  },
  S: {
    color: "#4ade80",
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ]
  },
  Z: {
    color: "#f87171",
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ]
  }
};

export function GameArcade() {
  const [activeTab, setActiveTab] = useState("breakout");

  return (
    <div className="dashboard-layout">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">ちょっと遊べるゲームハブ</h1>
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

        {activeTab === "breakout" ? <BreakoutGame /> : null}
        {activeTab === "tetris" ? <TetrisGame /> : null}
        {activeTab === "tictactoe" ? <TicTacToeGame /> : null}
        {activeTab === "reaction" ? <ReactionTapGame /> : null}
        {activeTab === "memory" ? <MemoryFlipGame /> : null}
      </section>
    </div>
  );
}

function TetrisGame() {
  const [state, setState] = useState(() => createTetrisState());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickTetris(current));
    }, state.gameOver || state.paused ? 1000 : Math.max(160, 620 - state.level * 45));

    return () => window.clearInterval(interval);
  }, [state.gameOver, state.level, state.paused]);

  useEffect(() => {
    function handleKey(event) {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "r", "R", "p", "P"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();

      setState((current) => {
        if (event.key === "r" || event.key === "R") return createTetrisState();
        if (event.key === "p" || event.key === "P") return { ...current, paused: !current.paused };
        if (current.gameOver) return current;
        if (current.paused) return current;
        if (event.key === "ArrowLeft") return movePiece(current, -1, 0);
        if (event.key === "ArrowRight") return movePiece(current, 1, 0);
        if (event.key === "ArrowDown") return movePiece(current, 0, 1);
        if (event.key === "ArrowUp") return rotatePiece(current);
        if (event.key === " ") return hardDrop(current);
        return current;
      });
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const board = paintBoard(state.board, state.current);

  return (
    <div className="arcade-panel-grid arcade-panel-grid-wide">
      <div className="surface arcade-game-card arcade-tetris-card">
        <div className="section-copy">
          <h2>Tetris</h2>
          <p>
            {state.gameOver
              ? "Game over. R でリスタート"
              : state.paused
                ? "一時停止中。P で再開"
                : "← → ↓ で移動、↑ で回転、Space で即落下、P で一時停止"}
          </p>
        </div>

        <div className="arcade-tetris-layout">
          <div className="arcade-tetris-board">
            {board.map((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <span
                  key={`${rowIndex}-${columnIndex}`}
                  className={`arcade-tetris-cell ${cell ? "is-filled" : ""}`}
                  style={cell ? { background: cell } : undefined}
                />
              ))
            )}
          </div>

          <div className="surface arcade-side-card arcade-tetris-side">
            <div className="stats-grid">
              <div className="stat-tile">
                <strong>{state.score}</strong>
                <span>Score</span>
              </div>
              <div className="stat-tile">
                <strong>{state.lines}</strong>
                <span>Lines</span>
              </div>
              <div className="stat-tile">
                <strong>{state.level}</strong>
                <span>Level</span>
              </div>
            </div>

            <div>
              <p className="eyebrow">Next</p>
              <div className="arcade-tetris-next">
                {renderMiniPiece(state.next).map((row, rowIndex) =>
                  row.map((cell, columnIndex) => (
                    <span
                      key={`${rowIndex}-${columnIndex}`}
                      className={`arcade-tetris-mini-cell ${cell ? "is-filled" : ""}`}
                      style={cell ? { background: cell } : undefined}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="hero-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setState((current) => ({ ...current, paused: !current.paused }))}
              >
                {state.paused ? "再開" : "一時停止"}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setState(createTetrisState())}>
                リセット
              </button>
            </div>
          </div>
        </div>
      </div>
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

function createTetrisState() {
  const current = createPiece(randomShapeKey());
  const next = createPiece(randomShapeKey());

  return {
    board: createEmptyBoard(),
    current,
    next,
    score: 0,
    lines: 0,
    level: 1,
    paused: false,
    gameOver: false
  };
}

function createEmptyBoard() {
  return Array.from({ length: TETRIS_HEIGHT }, () => Array(TETRIS_WIDTH).fill(""));
}

function randomShapeKey() {
  const keys = Object.keys(TETRIS_SHAPES);
  return keys[Math.floor(Math.random() * keys.length)];
}

function createPiece(key) {
  return {
    key,
    x: 3,
    y: 0,
    cells: TETRIS_SHAPES[key].cells.map(([x, y]) => [x, y]),
    color: TETRIS_SHAPES[key].color
  };
}

function tickTetris(state) {
  if (state.gameOver || state.paused) return state;
  const moved = attemptPiece(state, { ...state.current, y: state.current.y + 1 });
  if (moved) return moved;
  return lockPiece(state);
}

function movePiece(state, dx, dy) {
  if (state.gameOver || state.paused) return state;
  const nextPiece = { ...state.current, x: state.current.x + dx, y: state.current.y + dy };
  return attemptPiece(state, nextPiece) || (dy > 0 ? lockPiece(state) : state);
}

function rotatePiece(state) {
  if (state.gameOver || state.paused) return state;
  const rotatedCells = state.current.cells.map(([x, y]) => [y, 3 - x]);
  const candidate = { ...state.current, cells: rotatedCells };
  return attemptPiece(state, candidate) || attemptPiece(state, { ...candidate, x: candidate.x - 1 }) || attemptPiece(state, { ...candidate, x: candidate.x + 1 }) || state;
}

function hardDrop(state) {
  if (state.gameOver || state.paused) return state;
  let current = state;
  while (true) {
    const moved = attemptPiece(current, { ...current.current, y: current.current.y + 1 });
    if (!moved) {
      return lockPiece(current, true);
    }
    current = moved;
  }
}

function attemptPiece(state, candidate) {
  return canPlace(state.board, candidate) ? { ...state, current: candidate } : null;
}

function canPlace(board, piece) {
  return piece.cells.every(([cellX, cellY]) => {
    const x = piece.x + cellX;
    const y = piece.y + cellY;
    if (x < 0 || x >= TETRIS_WIDTH || y < 0 || y >= TETRIS_HEIGHT) return false;
    return !board[y][x];
  });
}

function lockPiece(state, fromDrop = false) {
  const board = state.board.map((row) => [...row]);

  for (const [cellX, cellY] of state.current.cells) {
    const x = state.current.x + cellX;
    const y = state.current.y + cellY;
    if (y < 0) {
      return { ...state, gameOver: true };
    }
    board[y][x] = state.current.color;
  }

  const remainingRows = board.filter((row) => row.some((cell) => !cell));
  const cleared = TETRIS_HEIGHT - remainingRows.length;
  while (remainingRows.length < TETRIS_HEIGHT) {
    remainingRows.unshift(Array(TETRIS_WIDTH).fill(""));
  }

  const nextCurrent = { ...state.next, x: 3, y: 0 };
  const next = createPiece(randomShapeKey());
  const nextLines = state.lines + cleared;
  const nextLevel = Math.max(1, Math.floor(nextLines / 10) + 1);
  const nextScore = state.score + scoreForLines(cleared) + (fromDrop ? 8 : 0);
  const nextState = {
    board: remainingRows,
    current: nextCurrent,
    next,
    score: nextScore,
    lines: nextLines,
    level: nextLevel,
    paused: false,
    gameOver: !canPlace(remainingRows, nextCurrent)
  };

  return nextState;
}

function scoreForLines(lines) {
  if (lines === 1) return 100;
  if (lines === 2) return 250;
  if (lines === 3) return 450;
  if (lines >= 4) return 800;
  return 0;
}

function paintBoard(board, current) {
  const nextBoard = board.map((row) => [...row]);

  for (const [cellX, cellY] of current.cells) {
    const x = current.x + cellX;
    const y = current.y + cellY;
    if (x >= 0 && x < TETRIS_WIDTH && y >= 0 && y < TETRIS_HEIGHT) {
      nextBoard[y][x] = current.color;
    }
  }

  return nextBoard;
}

function renderMiniPiece(piece) {
  const grid = Array.from({ length: 4 }, () => Array(4).fill(""));
  for (const [x, y] of piece.cells) {
    if (grid[y] && typeof grid[y][x] !== "undefined") {
      grid[y][x] = piece.color;
    }
  }
  return grid;
}

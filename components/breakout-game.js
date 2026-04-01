"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 520;
const PADDLE_Y = 484;
const PADDLE_HEIGHT = 14;
const PADDLE_BASE_WIDTH = 110;
const PADDLE_WIDE_WIDTH = 170;
const PADDLE_SPEED = 560;
const BALL_RADIUS = 8;
const ITEM_SIZE = 16;
const ITEM_SPEED = 140;
const START_LIVES = 3;
const BRICK_ROWS = 6;
const BRICK_COLUMNS = 10;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const BRICK_OFFSET_X = 28;
const BRICK_OFFSET_Y = 60;
const WIDE_DURATION = 12000;
const PIERCE_DURATION = 10000;
const ITEM_DROP_CHANCE = 0.28;

const itemTypes = [
  { type: "multiball", color: "#7dd3fc", label: "MULTI" },
  { type: "wide", color: "#f9c74f", label: "WIDE" },
  { type: "pierce", color: "#f472b6", label: "PIERCE" }
];

export function BreakoutGame() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gameRef = useRef(createGameState());
  const keysRef = useRef({ left: false, right: false });
  const [hud, setHud] = useState(buildHud(gameRef.current));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    function syncHud() {
      const nextHud = buildHud(gameRef.current);
      setHud((current) =>
        current.score === nextHud.score &&
        current.lives === nextHud.lives &&
        current.status === nextHud.status &&
        current.wideLeft === nextHud.wideLeft &&
        current.pierceLeft === nextHud.pierceLeft
          ? current
          : nextHud
      );
    }

    function frame(timestamp) {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimeRef.current) / 1000, 0.032);
      lastTimeRef.current = timestamp;

      updateGame(gameRef.current, delta, keysRef.current);
      drawGame(context, gameRef.current);
      syncHud();
      animationRef.current = window.requestAnimationFrame(frame);
    }

    animationRef.current = window.requestAnimationFrame(frame);

    function onKeyDown(event) {
      if (event.key === "ArrowLeft") {
        keysRef.current.left = true;
        event.preventDefault();
      }
      if (event.key === "ArrowRight") {
        keysRef.current.right = true;
        event.preventDefault();
      }
      if (event.key === "Enter") {
        if (gameRef.current.status !== "playing") {
          gameRef.current = createGameState();
          setHud(buildHud(gameRef.current));
        }
        if (gameRef.current.status === "start") {
          gameRef.current.status = "playing";
        }
        event.preventDefault();
      }
      if (event.key === "p" || event.key === "P") {
        if (gameRef.current.status === "playing") {
          gameRef.current.status = "paused";
        } else if (gameRef.current.status === "paused") {
          gameRef.current.status = "playing";
        }
        setHud(buildHud(gameRef.current));
        event.preventDefault();
      }
    }

    function onKeyUp(event) {
      if (event.key === "ArrowLeft") keysRef.current.left = false;
      if (event.key === "ArrowRight") keysRef.current.right = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="arcade-panel-grid arcade-panel-grid-wide">
      <div className="surface arcade-game-card arcade-breakout-card">
        <div className="section-copy">
          <h2>Breakout</h2>
          <p>
            {hud.status === "start" ? "Enterでスタート" : null}
            {hud.status === "playing" ? "← → で移動、Pで一時停止" : null}
            {hud.status === "paused" ? "一時停止中。Pで再開" : null}
            {hud.status === "gameover" ? "ゲームオーバー。Enterで再開" : null}
            {hud.status === "clear" ? "クリア。Enterで再開" : null}
          </p>
        </div>

        <div className="arcade-breakout-hud">
          <div className="stat-tile">
            <strong>{hud.score}</strong>
            <span>Score</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.lives}</strong>
            <span>Lives</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.wideLeft || "--"}</strong>
            <span>Wide</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.pierceLeft || "--"}</strong>
            <span>Pierce</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="arcade-breakout-canvas"
        />
      </div>

      <div className="surface arcade-side-card">
        <h3>アイテム</h3>
        <p>`multiball` はボール追加、`wide` はパドル拡張、`pierce` は一定時間ブロック貫通です。</p>
      </div>
    </div>
  );
}

function createGameState() {
  return {
    status: "start",
    score: 0,
    lives: START_LIVES,
    paddle: {
      x: CANVAS_WIDTH / 2 - PADDLE_BASE_WIDTH / 2,
      width: PADDLE_BASE_WIDTH
    },
    balls: [createBall()],
    bricks: createBricks(),
    items: [],
    effects: {
      wideUntil: 0,
      pierceUntil: 0
    }
  };
}

function createBall(extraVelocityX = 0) {
  return {
    x: CANVAS_WIDTH / 2,
    y: PADDLE_Y - 20,
    vx: extraVelocityX || randomBallVelocityX(),
    vy: -280,
    radius: BALL_RADIUS
  };
}

function createBricks() {
  const colors = ["#7dd3fc", "#a7f3d0", "#fde68a", "#fca5a5", "#c4b5fd", "#f9a8d4"];
  return Array.from({ length: BRICK_ROWS * BRICK_COLUMNS }, (_, index) => {
    const row = Math.floor(index / BRICK_COLUMNS);
    const col = index % BRICK_COLUMNS;
    return {
      id: `${row}-${col}`,
      x: BRICK_OFFSET_X + col * (BRICK_WIDTH + BRICK_GAP),
      y: BRICK_OFFSET_Y + row * (BRICK_HEIGHT + BRICK_GAP),
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      color: colors[row % colors.length],
      alive: true
    };
  });
}

function updateGame(game, delta, keys) {
  updateEffects(game);

  if (game.status !== "playing") return;

  const direction = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const maxX = CANVAS_WIDTH - game.paddle.width;
  game.paddle.x = clamp(game.paddle.x + direction * PADDLE_SPEED * delta, 0, maxX);

  const nextBalls = [];
  for (const ball of game.balls) {
    updateBall(game, ball, delta);
    if (ball.y - ball.radius <= CANVAS_HEIGHT) {
      nextBalls.push(ball);
    }
  }
  game.balls = nextBalls;

  updateItems(game, delta);

  if (!game.bricks.some((brick) => brick.alive)) {
    game.status = "clear";
    return;
  }

  if (!game.balls.length) {
    game.lives -= 1;
    if (game.lives <= 0) {
      game.status = "gameover";
      return;
    }
    resetRound(game);
  }
}

function updateBall(game, ball, delta) {
  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  }

  if (
    ball.y + ball.radius >= PADDLE_Y &&
    ball.y - ball.radius <= PADDLE_Y + PADDLE_HEIGHT &&
    ball.x >= game.paddle.x &&
    ball.x <= game.paddle.x + game.paddle.width &&
    ball.vy > 0
  ) {
    const hit = (ball.x - (game.paddle.x + game.paddle.width / 2)) / (game.paddle.width / 2);
    const speed = Math.hypot(ball.vx, ball.vy) + 8;
    const angle = hit * 1.05;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -Math.abs(speed * Math.cos(angle));
    ball.y = PADDLE_Y - ball.radius - 1;
  }

  const pierceActive = game.effects.pierceUntil > performance.now();
  for (const brick of game.bricks) {
    if (!brick.alive) continue;
    if (!circleRectCollision(ball, brick)) continue;

    brick.alive = false;
    game.score += 100;
    maybeSpawnItem(game, brick);

    if (!pierceActive) {
      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft || minOverlap === overlapRight) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
    }
    break;
  }
}

function updateItems(game, delta) {
  const nextItems = [];
  for (const item of game.items) {
    item.y += ITEM_SPEED * delta;
    if (
      item.y + ITEM_SIZE >= PADDLE_Y &&
      item.y <= PADDLE_Y + PADDLE_HEIGHT &&
      item.x + ITEM_SIZE >= game.paddle.x &&
      item.x <= game.paddle.x + game.paddle.width
    ) {
      applyItem(game, item.type);
      continue;
    }
    if (item.y <= CANVAS_HEIGHT) {
      nextItems.push(item);
    }
  }
  game.items = nextItems;
}

function applyItem(game, type) {
  const now = performance.now();

  if (type === "multiball") {
    const baseBall = game.balls[0] || createBall();
    game.balls.push({
      ...baseBall,
      x: baseBall.x + 12,
      vx: baseBall.vx * -1 || -randomBallVelocityX(),
      vy: baseBall.vy
    });
    return;
  }

  if (type === "wide") {
    game.effects.wideUntil = now + WIDE_DURATION;
    game.paddle.width = PADDLE_WIDE_WIDTH;
    game.paddle.x = clamp(game.paddle.x, 0, CANVAS_WIDTH - game.paddle.width);
    return;
  }

  if (type === "pierce") {
    game.effects.pierceUntil = now + PIERCE_DURATION;
  }
}

function updateEffects(game) {
  const now = performance.now();
  if (game.effects.wideUntil <= now && game.paddle.width !== PADDLE_BASE_WIDTH) {
    game.paddle.width = PADDLE_BASE_WIDTH;
    game.paddle.x = clamp(game.paddle.x, 0, CANVAS_WIDTH - game.paddle.width);
  }
}

function resetRound(game) {
  game.status = "playing";
  game.paddle = {
    x: CANVAS_WIDTH / 2 - PADDLE_BASE_WIDTH / 2,
    width: game.effects.wideUntil > performance.now() ? PADDLE_WIDE_WIDTH : PADDLE_BASE_WIDTH
  };
  game.balls = [createBall()];
  game.items = [];
}

function maybeSpawnItem(game, brick) {
  if (Math.random() > ITEM_DROP_CHANCE) return;
  const seed = itemTypes[Math.floor(Math.random() * itemTypes.length)];
  game.items.push({
    type: seed.type,
    color: seed.color,
    label: seed.label,
    x: brick.x + brick.width / 2 - ITEM_SIZE / 2,
    y: brick.y + brick.height / 2 - ITEM_SIZE / 2
  });
}

function drawGame(context, game) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#0f1722");
  gradient.addColorStop(1, "#131c26");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBricks(context, game.bricks);
  drawItems(context, game.items);
  drawPaddle(context, game.paddle, game.effects.wideUntil > performance.now());
  drawBalls(context, game.balls, game.effects.pierceUntil > performance.now());

  if (game.status !== "playing") {
    drawOverlay(context, game.status);
  }
}

function drawBricks(context, bricks) {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    context.fillStyle = brick.color;
    context.fillRect(brick.x, brick.y, brick.width, brick.height);
    context.fillStyle = "rgba(255,255,255,0.16)";
    context.fillRect(brick.x, brick.y, brick.width, 4);
  }
}

function drawPaddle(context, paddle, wideActive) {
  context.fillStyle = wideActive ? "#f9c74f" : "#f4f1ea";
  context.fillRect(paddle.x, PADDLE_Y, paddle.width, PADDLE_HEIGHT);
}

function drawBalls(context, balls, pierceActive) {
  for (const ball of balls) {
    context.beginPath();
    context.fillStyle = pierceActive ? "#f472b6" : "#f8fafc";
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawItems(context, items) {
  context.font = "10px IBM Plex Mono";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const item of items) {
    context.fillStyle = item.color;
    context.fillRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);
    context.fillStyle = "#0f1722";
    context.fillText(item.label[0], item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2 + 0.5);
  }
}

function drawOverlay(context, status) {
  context.fillStyle = "rgba(8, 12, 18, 0.55)";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = "#f8fafc";
  context.textAlign = "center";
  context.font = '700 24px "IBM Plex Mono"';

  let text = "Enterでスタート";
  if (status === "paused") text = "一時停止";
  if (status === "gameover") text = "Game Over";
  if (status === "clear") text = "Clear";
  context.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 8);

  context.font = '400 14px "IBM Plex Mono"';
  if (status === "gameover" || status === "clear" || status === "start") {
    context.fillText("Enterで再開", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 26);
  }
}

function buildHud(game) {
  return {
    score: game.score,
    lives: game.lives,
    status: game.status,
    wideLeft: formatEffectLeft(game.effects.wideUntil),
    pierceLeft: formatEffectLeft(game.effects.pierceUntil)
  };
}

function formatEffectLeft(until) {
  const left = Math.max(0, until - performance.now());
  if (!left) return "";
  return `${(left / 1000).toFixed(1)}s`;
}

function circleRectCollision(ball, rect) {
  const nearestX = clamp(ball.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(ball.y, rect.y, rect.y + rect.height);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBallVelocityX() {
  return (Math.random() * 2 - 1) * 120;
}

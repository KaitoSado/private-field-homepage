"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;
const WORLD_WIDTH = 1700;

const PHYSICS = {
  gravity: 1900,
  jumpVelocity: 760,
  waterJumpVelocity: 430,
  flapGravityScale: 0.36,
  waterBuoyancy: 1260,
  waterGravityScale: 0.28,
  moveSpeed: 300,
  waterMoveSpeed: 170,
  groundAcceleration: 2600,
  airAcceleration: 1800,
  waterAcceleration: 980,
  waterDragX: 0.9,
  waterDragY: 0.93,
  maxFallSpeed: 920,
  maxWaterFallSpeed: 220
};

const PLAYER = {
  width: 50,
  height: 38
};

const START_POINT = {
  x: 96,
  y: 352
};

const WATER = {
  x: 690,
  y: 312,
  width: 360,
  height: 208
};

const GOAL = {
  x: 1568,
  y: 272,
  width: 52,
  height: 128
};

const SOLIDS = [
  { x: 0, y: 400, width: 670, height: 120, type: "ground" },
  { x: 670, y: 430, width: 420, height: 90, type: "ground" },
  { x: 1090, y: 400, width: 610, height: 120, type: "ground" },
  { x: 768, y: 282, width: 132, height: 18, type: "platform" },
  { x: 980, y: 336, width: 118, height: 18, type: "platform" },
  { x: 1208, y: 300, width: 150, height: 18, type: "platform" }
];

export function DuckPlatformerGame() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const gameRef = useRef(createGameState());
  const inputRef = useRef({
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
  });
  const [hud, setHud] = useState(buildHud(gameRef.current));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    function syncHud() {
      const nextHud = buildHud(gameRef.current);
      setHud((current) =>
        current.status === nextHud.status &&
        current.mode === nextHud.mode &&
        current.resets === nextHud.resets
          ? current
          : nextHud
      );
    }

    function frame(timestamp) {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.032);
      lastFrameRef.current = timestamp;

      updateGame(gameRef.current, inputRef.current, delta);
      drawGame(context, gameRef.current, timestamp);
      syncHud();
      animationRef.current = window.requestAnimationFrame(frame);
    }

    animationRef.current = window.requestAnimationFrame(frame);

    function handleKeyDown(event) {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        inputRef.current.left = true;
        event.preventDefault();
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        inputRef.current.right = true;
        event.preventDefault();
      }

      if (event.key === " " || event.code === "Space") {
        if (!inputRef.current.jump) inputRef.current.jumpPressed = true;
        inputRef.current.jump = true;
        event.preventDefault();
      }

      if (event.key === "Enter") {
        if (gameRef.current.status === "start" || gameRef.current.status === "clear") {
          gameRef.current = createGameState();
          gameRef.current.status = "playing";
        }
        event.preventDefault();
      }
    }

    function handleKeyUp(event) {
      if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
        inputRef.current.left = false;
      }

      if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
        inputRef.current.right = false;
      }

      if (event.key === " " || event.code === "Space") {
        inputRef.current.jump = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="arcade-panel-grid">
      <div className="surface arcade-game-card arcade-platformer-card">
        <div className="section-copy">
          <h2>Duck Run</h2>
          <p>
            {hud.status === "start" ? "Enterでスタート" : null}
            {hud.status === "playing" ? "← → / A D で移動、Space でジャンプ。空中で長押しすると羽ばたいてゆっくり落下。" : null}
            {hud.status === "clear" ? "クリア。Enterで再開" : null}
          </p>
        </div>

        <div className="arcade-breakout-hud">
          <div className="stat-tile">
            <strong>{hud.mode}</strong>
            <span>Mode</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.resets}</strong>
            <span>Resets</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.status === "clear" ? "GOAL" : "RUN"}</strong>
            <span>State</span>
          </div>
          <div className="stat-tile">
            <strong>池あり</strong>
            <span>Stage</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="arcade-platformer-canvas"
        />
      </div>

      <div className="surface arcade-side-card arcade-platformer-side">
        <div className="stats-grid">
          <div className="stat-tile">
            <strong>地上</strong>
            <span>速く走れて高く跳べる</span>
          </div>
          <div className="stat-tile">
            <strong>空中</strong>
            <span>Space長押しで羽ばたき</span>
          </div>
          <div className="stat-tile">
            <strong>水中</strong>
            <span>遅いが自然に浮く</span>
          </div>
          <div className="stat-tile">
            <strong>Goal</strong>
            <span>右端の旗へ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function createGameState() {
  const player = createPlayer();
  return {
    status: "start",
    resets: 0,
    player,
    cameraX: 0
  };
}

function createPlayer() {
  return {
    x: START_POINT.x,
    y: START_POINT.y,
    width: PLAYER.width,
    height: PLAYER.height,
    vx: 0,
    vy: 0,
    onGround: false,
    inWater: false,
    facing: 1
  };
}

function buildHud(game) {
  const { player } = game;
  let mode = "Ground";
  if (!player.onGround && !player.inWater) mode = "Air";
  if (player.inWater) mode = "Water";

  return {
    status: game.status,
    resets: game.resets,
    mode
  };
}

function updateGame(game, input, delta) {
  if (game.status !== "playing") return;

  const { player } = game;
  player.inWater = intersects(player, WATER);

  if (input.jumpPressed) {
    if (player.onGround) {
      player.vy = -(player.inWater ? PHYSICS.waterJumpVelocity : PHYSICS.jumpVelocity);
      player.onGround = false;
    } else if (player.inWater) {
      player.vy = Math.min(player.vy, -PHYSICS.waterJumpVelocity * 0.86);
    }
  }

  applyHorizontalMovement(player, input, delta);
  applyVerticalForces(player, input, delta);
  movePlayer(player, delta);

  player.inWater = intersects(player, WATER);
  if (player.x + player.width >= GOAL.x && player.x <= GOAL.x + GOAL.width && player.y + player.height >= GOAL.y) {
    game.status = "clear";
  }

  if (player.y > CANVAS_HEIGHT + 160) {
    resetPlayer(game);
  }

  game.cameraX = clamp(player.x - CANVAS_WIDTH * 0.34, 0, WORLD_WIDTH - CANVAS_WIDTH);
  input.jumpPressed = false;
}

function applyHorizontalMovement(player, input, delta) {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction !== 0) player.facing = direction;

  const targetSpeed = direction * (player.inWater ? PHYSICS.waterMoveSpeed : PHYSICS.moveSpeed);
  const acceleration = player.inWater
    ? PHYSICS.waterAcceleration
    : player.onGround
      ? PHYSICS.groundAcceleration
      : PHYSICS.airAcceleration;

  player.vx = approach(player.vx, targetSpeed, acceleration * delta);

  if (player.inWater) {
    player.vx *= Math.pow(PHYSICS.waterDragX, delta * 60);
  } else if (direction === 0 && player.onGround) {
    player.vx = approach(player.vx, 0, PHYSICS.groundAcceleration * 0.9 * delta);
  }
}

function applyVerticalForces(player, input, delta) {
  if (player.inWater) {
    const waterSurface = WATER.y + 12;
    const bodyCenter = player.y + player.height * 0.55;
    const submerge = clamp((bodyCenter - waterSurface) / (WATER.height - 12), 0, 1);

    player.vy += PHYSICS.gravity * PHYSICS.waterGravityScale * delta;
    player.vy -= PHYSICS.waterBuoyancy * submerge * delta;
    player.vy *= Math.pow(PHYSICS.waterDragY, delta * 60);
    player.vy = clamp(player.vy, -520, PHYSICS.maxWaterFallSpeed);
    return;
  }

  const gravityScale = input.jump && player.vy > 0 ? PHYSICS.flapGravityScale : 1;
  player.vy += PHYSICS.gravity * gravityScale * delta;
  player.vy = Math.min(player.vy, PHYSICS.maxFallSpeed);
}

function movePlayer(player, delta) {
  player.x += player.vx * delta;
  resolveHorizontal(player);
  player.x = clamp(player.x, 0, WORLD_WIDTH - player.width);

  player.y += player.vy * delta;
  player.onGround = false;
  resolveVertical(player);
}

function resolveHorizontal(player) {
  for (const solid of SOLIDS) {
    if (!intersects(player, solid)) continue;
    if (player.vx > 0) {
      player.x = solid.x - player.width;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.width;
    }
    player.vx = 0;
  }
}

function resolveVertical(player) {
  for (const solid of SOLIDS) {
    if (!intersects(player, solid)) continue;
    if (player.vy > 0) {
      player.y = solid.y - player.height;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = solid.y + solid.height;
      player.vy = 0;
    }
  }
}

function resetPlayer(game) {
  game.player = createPlayer();
  game.resets += 1;
  game.cameraX = 0;
}

function drawGame(context, game, timestamp) {
  const { player, cameraX } = game;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawSky(context);
  drawBackdrop(context, cameraX);
  drawWater(context, cameraX, timestamp);
  drawSolids(context, cameraX);
  drawGoal(context, cameraX, timestamp);
  drawStartMarker(context, cameraX);
  drawDuck(context, player, cameraX, timestamp);
  drawOverlay(context, game);
}

function drawSky(context) {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#dff7ff");
  gradient.addColorStop(0.5, "#c7eff7");
  gradient.addColorStop(1, "#96cdb7");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawBackdrop(context, cameraX) {
  context.fillStyle = "rgba(72, 120, 138, 0.12)";
  for (let index = 0; index < 5; index += 1) {
    const hillX = index * 360 - cameraX * 0.22;
    context.beginPath();
    context.moveTo(hillX - 120, CANVAS_HEIGHT);
    context.quadraticCurveTo(hillX + 20, 200, hillX + 180, CANVAS_HEIGHT);
    context.closePath();
    context.fill();
  }
}

function drawWater(context, cameraX, timestamp) {
  const x = WATER.x - cameraX;
  const y = WATER.y;
  const wave = Math.sin(timestamp / 240) * 3;

  context.fillStyle = "rgba(85, 176, 223, 0.45)";
  context.fillRect(x, y, WATER.width, WATER.height);

  context.fillStyle = "rgba(53, 124, 188, 0.22)";
  context.fillRect(x, y + 36, WATER.width, WATER.height - 36);

  context.strokeStyle = "rgba(229, 250, 255, 0.92)";
  context.lineWidth = 3;
  context.beginPath();
  for (let offset = 0; offset <= WATER.width; offset += 24) {
    const px = x + offset;
    const py = y + 12 + Math.sin((offset + timestamp / 5) / 18) * wave;
    if (offset === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.stroke();
}

function drawSolids(context, cameraX) {
  for (const solid of SOLIDS) {
    const x = solid.x - cameraX;
    if (x + solid.width < -80 || x > CANVAS_WIDTH + 80) continue;

    if (solid.type === "platform") {
      context.fillStyle = "#766657";
      context.fillRect(x, solid.y, solid.width, solid.height);
      context.fillStyle = "#c7a97d";
      context.fillRect(x + 6, solid.y + 4, solid.width - 12, 5);
      continue;
    }

    const groundGradient = context.createLinearGradient(0, solid.y, 0, solid.y + solid.height);
    groundGradient.addColorStop(0, "#5f9b63");
    groundGradient.addColorStop(0.18, "#86b75a");
    groundGradient.addColorStop(0.2, "#876a47");
    groundGradient.addColorStop(1, "#6a5037");
    context.fillStyle = groundGradient;
    context.fillRect(x, solid.y, solid.width, solid.height);
  }
}

function drawGoal(context, cameraX, timestamp) {
  const x = GOAL.x - cameraX;
  const flutter = Math.sin(timestamp / 180) * 6;

  context.fillStyle = "#7a5b35";
  context.fillRect(x + 8, GOAL.y - 60, 8, GOAL.height + 60);
  context.fillStyle = "#ff8c61";
  context.beginPath();
  context.moveTo(x + 16, GOAL.y - 56);
  context.lineTo(x + 16, GOAL.y - 18);
  context.lineTo(x + 52 + flutter, GOAL.y - 36);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(23, 29, 36, 0.15)";
  context.lineWidth = 2;
  context.strokeRect(x, GOAL.y, GOAL.width, GOAL.height);
}

function drawStartMarker(context, cameraX) {
  const x = 82 - cameraX;
  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  context.fillRect(x, 308, 68, 34);
  context.fillStyle = "#406066";
  context.font = '12px "IBM Plex Mono", monospace';
  context.fillText("START", x + 12, 329);
}

function drawDuck(context, player, cameraX, timestamp) {
  const x = player.x - cameraX;
  const y = player.y;
  const wingLift = !player.onGround && !player.inWater ? Math.sin(timestamp / 110) * 6 : 0;

  if (player.inWater) {
    context.strokeStyle = "rgba(240, 252, 255, 0.75)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(x + player.width * 0.54, WATER.y + 14, 26, 5, 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.fillStyle = "#f9d26a";
  context.beginPath();
  context.ellipse(x + 25, y + 24, 21, 15, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#f2bc41";
  context.beginPath();
  context.ellipse(x + 19, y + 21 - wingLift * 0.18, 11, 8 + Math.abs(wingLift) * 0.15, -0.4 * player.facing, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#fde28a";
  context.beginPath();
  context.arc(x + 34, y + 13, 10, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff8b4c";
  context.beginPath();
  if (player.facing >= 0) {
    context.moveTo(x + 42, y + 14);
    context.lineTo(x + 56, y + 18);
    context.lineTo(x + 42, y + 22);
  } else {
    context.moveTo(x + 26, y + 14);
    context.lineTo(x + 12, y + 18);
    context.lineTo(x + 26, y + 22);
  }
  context.closePath();
  context.fill();

  context.fillStyle = "#1f2d39";
  context.beginPath();
  context.arc(x + (player.facing >= 0 ? 36 : 31), y + 12, 2.4, 0, Math.PI * 2);
  context.fill();
}

function drawOverlay(context, game) {
  if (game.status === "playing") return;

  context.fillStyle = "rgba(9, 18, 28, 0.24)";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = "#f7f7f2";
  context.textAlign = "center";
  context.font = '700 30px "Fraunces", "Iowan Old Style", serif';
  context.fillText(game.status === "clear" ? "GOAL!" : "Duck Run", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
  context.font = '15px "IBM Plex Mono", monospace';
  context.fillText(
    game.status === "clear" ? "Enterでやり直し" : "Enterでスタート",
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 28
  );
  context.textAlign = "start";
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, amount) {
  if (current < target) return Math.min(current + amount, target);
  if (current > target) return Math.max(current - amount, target);
  return target;
}

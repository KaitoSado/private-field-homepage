"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;

const PLAYER_SIZE = {
  width: 50,
  height: 38
};

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

const ENEMY_TYPES = {
  walker: {
    label: "Walker",
    width: 34,
    height: 28,
    color: "#d36757",
    speed: 84,
    stompable: true,
    kind: "ground"
  },
  flyer: {
    label: "Flyer",
    width: 36,
    height: 26,
    color: "#8267df",
    speed: 120,
    stompable: false,
    kind: "fly"
  },
  skimmer: {
    label: "Skimmer",
    width: 38,
    height: 22,
    color: "#4fa2d4",
    speed: 92,
    stompable: false,
    kind: "water"
  },
  hopper: {
    label: "Hopper",
    width: 34,
    height: 30,
    color: "#53a86b",
    speed: 72,
    jumpVelocity: 420,
    jumpInterval: 1.4,
    stompable: true,
    kind: "ground"
  },
  charger: {
    label: "Charger",
    width: 44,
    height: 28,
    color: "#874d44",
    speed: 56,
    dashSpeed: 260,
    dashDuration: 0.48,
    aggroRange: 160,
    dashCooldown: 1.35,
    stompable: true,
    kind: "ground"
  }
};

const STAGE_CONFIGS = {
  stage1: {
    id: "stage1",
    label: "Stage 1",
    name: "Pond Lesson",
    worldWidth: 1700,
    fallLimit: 760,
    start: { x: 96, y: 352 },
    goal: { x: 1568, y: 272, width: 52, height: 128 },
    checkpoints: [],
    waters: [{ x: 690, y: 312, width: 360, height: 208 }],
    solids: [
      { x: 0, y: 400, width: 670, height: 120, type: "ground" },
      { x: 670, y: 430, width: 420, height: 90, type: "ground" },
      { x: 1090, y: 400, width: 610, height: 120, type: "ground" },
      { x: 768, y: 282, width: 132, height: 18, type: "platform" },
      { x: 980, y: 336, width: 118, height: 18, type: "platform" },
      { x: 1208, y: 300, width: 150, height: 18, type: "platform" }
    ],
    enemies: [
      { type: "skimmer", x: 812, y: 320, patrolLeft: 740, patrolRight: 1008 },
      { type: "walker", x: 1260, y: 372, patrolLeft: 1160, patrolRight: 1500 }
    ]
  },
  stage2: {
    id: "stage2",
    label: "Stage 2",
    name: "Three Route Marsh",
    worldWidth: 5200,
    fallLimit: 820,
    start: { x: 92, y: 352 },
    goal: { x: 5070, y: 252, width: 54, height: 148 },
    checkpoints: [
      {
        x: 3048,
        y: 182,
        respawn: { x: 2990, y: 194 },
        label: "MID"
      }
    ],
    waters: [
      { x: 660, y: 324, width: 300, height: 196 },
      { x: 1840, y: 330, width: 380, height: 190 },
      { x: 2880, y: 334, width: 320, height: 186 },
      { x: 3720, y: 338, width: 380, height: 182 }
    ],
    solids: [
      { x: 0, y: 400, width: 620, height: 120, type: "ground" },
      { x: 620, y: 430, width: 360, height: 90, type: "ground" },
      { x: 980, y: 400, width: 460, height: 120, type: "ground" },
      { x: 1490, y: 400, width: 330, height: 120, type: "ground" },
      { x: 1820, y: 438, width: 460, height: 82, type: "ground" },
      { x: 2280, y: 400, width: 520, height: 120, type: "ground" },
      { x: 2860, y: 442, width: 380, height: 78, type: "ground" },
      { x: 3240, y: 400, width: 400, height: 120, type: "ground" },
      { x: 3700, y: 448, width: 440, height: 72, type: "ground" },
      { x: 4140, y: 400, width: 1060, height: 120, type: "ground" },
      { x: 760, y: 312, width: 120, height: 18, type: "platform" },
      { x: 930, y: 262, width: 120, height: 18, type: "platform" },
      { x: 1110, y: 298, width: 130, height: 18, type: "platform" },
      { x: 1320, y: 244, width: 120, height: 18, type: "platform" },
      { x: 1690, y: 304, width: 120, height: 18, type: "platform" },
      { x: 1960, y: 254, width: 120, height: 18, type: "platform" },
      { x: 2140, y: 206, width: 120, height: 18, type: "platform" },
      { x: 2460, y: 330, width: 120, height: 18, type: "platform" },
      { x: 2670, y: 280, width: 120, height: 18, type: "platform" },
      { x: 2940, y: 232, width: 130, height: 18, type: "platform" },
      { x: 3170, y: 272, width: 120, height: 18, type: "platform" },
      { x: 3460, y: 216, width: 130, height: 18, type: "platform" },
      { x: 3840, y: 306, width: 120, height: 18, type: "platform" },
      { x: 4020, y: 252, width: 120, height: 18, type: "platform" },
      { x: 4240, y: 220, width: 140, height: 18, type: "platform" },
      { x: 4470, y: 268, width: 120, height: 18, type: "platform" },
      { x: 4680, y: 214, width: 120, height: 18, type: "platform" },
      { x: 4900, y: 250, width: 110, height: 18, type: "platform" }
    ],
    enemies: [
      { type: "walker", x: 540, y: 372, patrolLeft: 360, patrolRight: 610 },
      { type: "skimmer", x: 806, y: 332, patrolLeft: 714, patrolRight: 928 },
      { type: "flyer", x: 1180, y: 222, patrolLeft: 1070, patrolRight: 1380, floatAmplitude: 18 },
      { type: "hopper", x: 1328, y: 370, patrolLeft: 1180, patrolRight: 1420 },
      { type: "walker", x: 1600, y: 372, patrolLeft: 1510, patrolRight: 1760 },
      { type: "skimmer", x: 2020, y: 338, patrolLeft: 1890, patrolRight: 2180 },
      { type: "flyer", x: 2088, y: 164, patrolLeft: 1940, patrolRight: 2200, floatAmplitude: 14 },
      { type: "charger", x: 2510, y: 372, patrolLeft: 2360, patrolRight: 2760 },
      { type: "skimmer", x: 3000, y: 342, patrolLeft: 2910, patrolRight: 3170 },
      { type: "hopper", x: 3340, y: 372, patrolLeft: 3260, patrolRight: 3600 },
      { type: "flyer", x: 3490, y: 180, patrolLeft: 3380, patrolRight: 3590, floatAmplitude: 20 },
      { type: "skimmer", x: 3920, y: 346, patrolLeft: 3760, patrolRight: 4060 },
      { type: "charger", x: 4410, y: 372, patrolLeft: 4280, patrolRight: 4640 },
      { type: "hopper", x: 4572, y: 238, patrolLeft: 4470, patrolRight: 4592 },
      { type: "flyer", x: 4740, y: 172, patrolLeft: 4630, patrolRight: 4930, floatAmplitude: 16 },
      { type: "walker", x: 4870, y: 372, patrolLeft: 4780, patrolRight: 5030 }
    ]
  }
};

const STAGE_IDS = Object.keys(STAGE_CONFIGS);

export function DuckPlatformerGame() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const gameRef = useRef(createGameState("stage1"));
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
        current.deaths === nextHud.deaths &&
        current.hp === nextHud.hp &&
        current.stageId === nextHud.stageId &&
        current.checkpointLabel === nextHud.checkpointLabel
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
        if (gameRef.current.status === "ready") {
          gameRef.current.status = "playing";
        } else if (gameRef.current.status === "clear") {
          gameRef.current = createGameState(gameRef.current.stageId, true);
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

  function selectStage(stageId) {
    gameRef.current = createGameState(stageId);
    setHud(buildHud(gameRef.current));
  }

  return (
    <div className="arcade-panel-grid">
      <div className="surface arcade-game-card arcade-platformer-card">
        <div className="section-copy">
          <h2>Duck Run</h2>
          <p>
            {hud.status === "ready" ? `${hud.stageName} を選択中。Enterで開始` : null}
            {hud.status === "playing"
              ? "← → / A D で移動、Spaceでジャンプ。空中長押しで羽ばたき、水中では浮力を使って進む。"
              : null}
            {hud.status === "clear" ? `${hud.stageName} クリア。Enterで再開` : null}
          </p>
        </div>

        <div className="arcade-platformer-stage-row">
          {STAGE_IDS.map((stageId) => {
            const stage = STAGE_CONFIGS[stageId];
            const isActive = hud.stageId === stageId;
            return (
              <button
                key={stageId}
                type="button"
                className={`arcade-platformer-stage-button ${isActive ? "is-active" : ""}`}
                onClick={() => selectStage(stageId)}
              >
                <strong>{stage.label}</strong>
                <span>{stage.name}</span>
              </button>
            );
          })}
        </div>

        <div className="arcade-breakout-hud">
          <div className="stat-tile">
            <strong>{hud.stageLabel}</strong>
            <span>Stage</span>
          </div>
          <div className="stat-tile">
            <strong>{"♥".repeat(hud.hp)}</strong>
            <span>HP</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.checkpointLabel}</strong>
            <span>Checkpoint</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.deaths}</strong>
            <span>Falls / Deaths</span>
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
            <span>羽ばたきでゆっくり落下</span>
          </div>
          <div className="stat-tile">
            <strong>水中</strong>
            <span>遅いが自然に浮く</span>
          </div>
          <div className="stat-tile">
            <strong>中間</strong>
            <span>Stage 2 で途中復帰</span>
          </div>
        </div>

        <div className="arcade-platformer-legend">
          <div>
            <span className="arcade-platformer-swatch is-stompable" />
            <span>踏める敵: Walker / Hopper / Charger</span>
          </div>
          <div>
            <span className="arcade-platformer-swatch is-air" />
            <span>空敵: Flyer</span>
          </div>
          <div>
            <span className="arcade-platformer-swatch is-water" />
            <span>水面敵: Skimmer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function createGameState(stageId, autoStart = false) {
  const stage = STAGE_CONFIGS[stageId];
  return {
    status: autoStart ? "playing" : "ready",
    stageId,
    stage,
    time: 0,
    deaths: 0,
    hp: 3,
    maxHp: 3,
    cameraX: 0,
    activeCheckpointIndex: -1,
    player: createPlayer(stage.start),
    enemies: createEnemies(stage.enemies)
  };
}

function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    width: PLAYER_SIZE.width,
    height: PLAYER_SIZE.height,
    vx: 0,
    vy: 0,
    prevX: spawn.x,
    prevY: spawn.y,
    onGround: false,
    inWater: false,
    currentWater: null,
    facing: 1,
    invincibleUntil: 0
  };
}

function createEnemies(specs) {
  return specs.map((spec, index) => {
    const stats = ENEMY_TYPES[spec.type];
    return {
      id: `${spec.type}-${index}`,
      type: spec.type,
      x: spec.x,
      y: spec.y,
      width: stats.width,
      height: stats.height,
      vx: 0,
      vy: 0,
      dir: spec.dir ?? 1,
      alive: true,
      patrolLeft: spec.patrolLeft ?? spec.x - 80,
      patrolRight: spec.patrolRight ?? spec.x + 80,
      baseX: spec.x,
      baseY: spec.y,
      floatAmplitude: spec.floatAmplitude ?? 10,
      phase: spec.phase ?? index * 0.9,
      jumpTimer: spec.jumpTimer ?? stats.jumpInterval ?? 1,
      dashTime: 0,
      dashCooldown: 0,
      onGround: false
    };
  });
}

function buildHud(game) {
  const { player, stage } = game;
  let mode = "Ground";
  if (!player.onGround && !player.inWater) mode = "Air";
  if (player.inWater) mode = "Water";

  const checkpoint = game.activeCheckpointIndex >= 0 ? stage.checkpoints[game.activeCheckpointIndex] : null;

  return {
    status: game.status,
    mode,
    deaths: game.deaths,
    hp: game.hp,
    stageId: game.stageId,
    stageLabel: stage.label,
    stageName: stage.name,
    checkpointLabel: checkpoint?.label ?? "START"
  };
}

function updateGame(game, input, delta) {
  if (game.status !== "playing") {
    input.jumpPressed = false;
    return;
  }

  const { stage, player } = game;
  game.time += delta;

  updateCheckpoints(game);

  player.prevX = player.x;
  player.prevY = player.y;
  player.currentWater = getIntersectingWater(player, stage.waters);
  player.inWater = Boolean(player.currentWater);

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
  movePlayer(player, stage, delta);

  player.currentWater = getIntersectingWater(player, stage.waters);
  player.inWater = Boolean(player.currentWater);

  updateEnemies(game, delta);
  resolveEnemyCollisions(game);

  if (touchesGoal(player, stage.goal)) {
    game.status = "clear";
  }

  if (player.y > stage.fallLimit) {
    respawnFromCheckpoint(game);
  }

  game.cameraX = clamp(player.x - CANVAS_WIDTH * 0.36, 0, stage.worldWidth - CANVAS_WIDTH);
  input.jumpPressed = false;
}

function updateCheckpoints(game) {
  const playerCenter = game.player.x + game.player.width * 0.5;
  for (let index = 0; index < game.stage.checkpoints.length; index += 1) {
    const checkpoint = game.stage.checkpoints[index];
    if (playerCenter >= checkpoint.x && index > game.activeCheckpointIndex) {
      game.activeCheckpointIndex = index;
    }
  }
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
  if (player.inWater && player.currentWater) {
    const waterSurface = player.currentWater.y + 12;
    const bodyCenter = player.y + player.height * 0.55;
    const submerge = clamp((bodyCenter - waterSurface) / (player.currentWater.height - 12), 0, 1);

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

function movePlayer(player, stage, delta) {
  player.x += player.vx * delta;
  resolveHorizontal(player, stage.solids);
  player.x = clamp(player.x, 0, stage.worldWidth - player.width);

  player.y += player.vy * delta;
  player.onGround = false;
  resolveVertical(player, stage.solids);
}

function resolveHorizontal(entity, solids) {
  for (const solid of solids) {
    if (!intersects(entity, solid)) continue;
    if (entity.vx > 0) {
      entity.x = solid.x - entity.width;
    } else if (entity.vx < 0) {
      entity.x = solid.x + solid.width;
    }
    entity.vx = 0;
  }
}

function resolveVertical(entity, solids) {
  for (const solid of solids) {
    if (!intersects(entity, solid)) continue;
    if (entity.vy > 0) {
      entity.y = solid.y - entity.height;
      entity.vy = 0;
      entity.onGround = true;
    } else if (entity.vy < 0) {
      entity.y = solid.y + solid.height;
      entity.vy = 0;
    }
  }
}

function updateEnemies(game, delta) {
  const { stage, player } = game;
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    const stats = ENEMY_TYPES[enemy.type];
    if (stats.kind === "fly") {
      updateFlyerEnemy(enemy, stats, delta);
      continue;
    }
    if (stats.kind === "water") {
      updateWaterEnemy(enemy, stats, delta);
      continue;
    }
    updateGroundEnemy(enemy, stats, player, stage.solids, delta);
  }
}

function updateFlyerEnemy(enemy, stats, delta) {
  enemy.phase += delta * 3.2;
  enemy.x += enemy.dir * stats.speed * delta;
  if (enemy.x < enemy.patrolLeft) {
    enemy.x = enemy.patrolLeft;
    enemy.dir = 1;
  } else if (enemy.x + enemy.width > enemy.patrolRight) {
    enemy.x = enemy.patrolRight - enemy.width;
    enemy.dir = -1;
  }
  enemy.y = enemy.baseY + Math.sin(enemy.phase) * enemy.floatAmplitude;
}

function updateWaterEnemy(enemy, stats, delta) {
  enemy.phase += delta * 2.4;
  enemy.x += enemy.dir * stats.speed * delta;
  if (enemy.x < enemy.patrolLeft) {
    enemy.x = enemy.patrolLeft;
    enemy.dir = 1;
  } else if (enemy.x + enemy.width > enemy.patrolRight) {
    enemy.x = enemy.patrolRight - enemy.width;
    enemy.dir = -1;
  }
  enemy.y = enemy.baseY + Math.sin(enemy.phase) * 8;
}

function updateGroundEnemy(enemy, stats, player, solids, delta) {
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;

  if (enemy.type === "hopper") {
    enemy.jumpTimer -= delta;
    if (enemy.onGround && enemy.jumpTimer <= 0) {
      enemy.vy = -stats.jumpVelocity;
      enemy.jumpTimer = stats.jumpInterval;
    }
  }

  if (enemy.type === "charger") {
    enemy.dashCooldown = Math.max(0, enemy.dashCooldown - delta);
    if (enemy.dashTime > 0) {
      enemy.dashTime -= delta;
    } else if (
      enemy.dashCooldown <= 0 &&
      Math.abs(centerX(player) - centerX(enemy)) < stats.aggroRange &&
      Math.abs(player.y - enemy.y) < 86
    ) {
      enemy.dir = centerX(player) >= centerX(enemy) ? 1 : -1;
      enemy.dashTime = stats.dashDuration;
      enemy.dashCooldown = stats.dashCooldown;
    }
  }

  const moveSpeed = enemy.type === "charger" && enemy.dashTime > 0 ? stats.dashSpeed : stats.speed;
  enemy.vx = moveSpeed * enemy.dir;
  enemy.vy = Math.min(enemy.vy + PHYSICS.gravity * 0.9 * delta, 900);

  enemy.x += enemy.vx * delta;
  const collidedSide = resolveEnemyHorizontal(enemy, solids);

  enemy.y += enemy.vy * delta;
  enemy.onGround = false;
  resolveVertical(enemy, solids);

  const exceededPatrol = enemy.x < enemy.patrolLeft || enemy.x + enemy.width > enemy.patrolRight;
  const missingGround = enemy.onGround && !hasGroundAhead(enemy, solids);

  if (collidedSide || exceededPatrol || missingGround) {
    enemy.dir *= -1;
    enemy.x = clamp(enemy.x, enemy.patrolLeft, enemy.patrolRight - enemy.width);
  }
}

function resolveEnemyHorizontal(enemy, solids) {
  let collided = false;
  for (const solid of solids) {
    if (!intersects(enemy, solid)) continue;
    if (enemy.vx > 0) {
      enemy.x = solid.x - enemy.width;
      collided = true;
    } else if (enemy.vx < 0) {
      enemy.x = solid.x + solid.width;
      collided = true;
    }
  }
  return collided;
}

function hasGroundAhead(enemy, solids) {
  const probeX = enemy.dir > 0 ? enemy.x + enemy.width + 4 : enemy.x - 4;
  const probeY = enemy.y + enemy.height + 4;
  return solids.some(
    (solid) => probeX >= solid.x && probeX <= solid.x + solid.width && probeY >= solid.y && probeY <= solid.y + solid.height
  );
}

function resolveEnemyCollisions(game) {
  const { player } = game;

  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    if (!intersects(player, enemy)) continue;

    const canStomp =
      ENEMY_TYPES[enemy.type].stompable &&
      player.vy > 140 &&
      player.prevY + player.height <= enemy.y + enemy.height * 0.55;

    if (canStomp) {
      enemy.alive = false;
      player.vy = -420;
      player.y = enemy.y - player.height - 2;
      continue;
    }

    damagePlayer(game, centerX(enemy));
  }
}

function damagePlayer(game, sourceX) {
  const { player } = game;
  if (game.time < player.invincibleUntil) return;

  game.hp -= 1;
  player.invincibleUntil = game.time + 1.15;
  player.vx = sourceX < centerX(player) ? 300 : -300;
  player.vy = -340;

  if (game.hp <= 0) {
    respawnFromCheckpoint(game);
  }
}

function respawnFromCheckpoint(game) {
  const checkpoint = game.activeCheckpointIndex >= 0 ? game.stage.checkpoints[game.activeCheckpointIndex] : null;
  const spawn = checkpoint?.respawn ?? game.stage.start;
  game.player = createPlayer(spawn);
  game.player.invincibleUntil = game.time + 0.9;
  game.enemies = createEnemies(game.stage.enemies);
  game.hp = game.maxHp;
  game.deaths += 1;
  game.cameraX = clamp(spawn.x - CANVAS_WIDTH * 0.36, 0, game.stage.worldWidth - CANVAS_WIDTH);
}

function touchesGoal(player, goal) {
  return player.x + player.width >= goal.x && player.x <= goal.x + goal.width && player.y + player.height >= goal.y;
}

function getIntersectingWater(entity, waters) {
  for (const water of waters) {
    if (intersects(entity, water)) return water;
  }
  return null;
}

function drawGame(context, game, timestamp) {
  const { player, cameraX, stage } = game;

  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawSky(context);
  drawBackdrop(context, cameraX, stage.worldWidth);
  drawWaters(context, cameraX, stage.waters, timestamp);
  drawSolids(context, cameraX, stage.solids);
  drawCheckpoints(context, cameraX, stage.checkpoints, game.activeCheckpointIndex);
  drawGoal(context, cameraX, stage.goal, timestamp);
  drawStartMarker(context, cameraX, stage.start);
  drawEnemies(context, cameraX, game.enemies, game.time);
  drawDuck(context, player, cameraX, timestamp, game.time);
  drawOverlay(context, game);
}

function drawSky(context) {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#dff7ff");
  gradient.addColorStop(0.52, "#c4eef7");
  gradient.addColorStop(1, "#8dc9ae");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawBackdrop(context, cameraX, worldWidth) {
  context.fillStyle = "rgba(72, 120, 138, 0.12)";
  const hillCount = Math.ceil(worldWidth / 340);
  for (let index = 0; index <= hillCount; index += 1) {
    const hillX = index * 340 - cameraX * 0.22;
    context.beginPath();
    context.moveTo(hillX - 120, CANVAS_HEIGHT);
    context.quadraticCurveTo(hillX + 20, 200 + (index % 2) * 24, hillX + 180, CANVAS_HEIGHT);
    context.closePath();
    context.fill();
  }
}

function drawWaters(context, cameraX, waters, timestamp) {
  for (const water of waters) {
    const x = water.x - cameraX;
    if (x + water.width < -80 || x > CANVAS_WIDTH + 80) continue;

    const wave = Math.sin(timestamp / 240) * 3;
    context.fillStyle = "rgba(85, 176, 223, 0.45)";
    context.fillRect(x, water.y, water.width, water.height);

    context.fillStyle = "rgba(53, 124, 188, 0.22)";
    context.fillRect(x, water.y + 36, water.width, water.height - 36);

    context.strokeStyle = "rgba(229, 250, 255, 0.92)";
    context.lineWidth = 3;
    context.beginPath();
    for (let offset = 0; offset <= water.width; offset += 24) {
      const px = x + offset;
      const py = water.y + 12 + Math.sin((offset + timestamp / 5) / 18) * wave;
      if (offset === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.stroke();
  }
}

function drawSolids(context, cameraX, solids) {
  for (const solid of solids) {
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

function drawCheckpoints(context, cameraX, checkpoints, activeIndex) {
  checkpoints.forEach((checkpoint, index) => {
    const x = checkpoint.x - cameraX;
    context.fillStyle = index <= activeIndex ? "#ffe09b" : "rgba(255, 255, 255, 0.82)";
    context.fillRect(x, checkpoint.y, 66, 28);
    context.fillStyle = "#406066";
    context.font = '11px "IBM Plex Mono", monospace';
    context.fillText(checkpoint.label, x + 13, checkpoint.y + 18);
    context.fillStyle = "#7a5b35";
    context.fillRect(x + 32, checkpoint.y + 28, 6, 64);
  });
}

function drawGoal(context, cameraX, goal, timestamp) {
  const x = goal.x - cameraX;
  const flutter = Math.sin(timestamp / 180) * 6;

  context.fillStyle = "#7a5b35";
  context.fillRect(x + 8, goal.y - 60, 8, goal.height + 60);
  context.fillStyle = "#ff8c61";
  context.beginPath();
  context.moveTo(x + 16, goal.y - 56);
  context.lineTo(x + 16, goal.y - 18);
  context.lineTo(x + 52 + flutter, goal.y - 36);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(23, 29, 36, 0.15)";
  context.lineWidth = 2;
  context.strokeRect(x, goal.y, goal.width, goal.height);
}

function drawStartMarker(context, cameraX, start) {
  const x = start.x - 12 - cameraX;
  context.fillStyle = "rgba(255, 255, 255, 0.86)";
  context.fillRect(x, start.y - 44, 68, 34);
  context.fillStyle = "#406066";
  context.font = '12px "IBM Plex Mono", monospace';
  context.fillText("START", x + 12, start.y - 23);
}

function drawEnemies(context, cameraX, enemies, time) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const x = enemy.x - cameraX;
    if (x + enemy.width < -60 || x > CANVAS_WIDTH + 60) continue;
    drawEnemy(context, enemy, x, time);
  }
}

function drawEnemy(context, enemy, screenX, time) {
  const stats = ENEMY_TYPES[enemy.type];
  const x = screenX;
  const y = enemy.y;

  if (enemy.type === "flyer") {
    context.fillStyle = stats.color;
    context.beginPath();
    context.ellipse(x + enemy.width * 0.5, y + enemy.height * 0.52, 18, 12, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255, 255, 255, 0.85)";
    context.beginPath();
    context.ellipse(x + 11, y + 8 + Math.sin(time * 9 + enemy.phase) * 2, 8, 4, -0.5, 0, Math.PI * 2);
    context.ellipse(x + enemy.width - 11, y + 8 + Math.sin(time * 9 + enemy.phase + 1.3) * 2, 8, 4, 0.5, 0, Math.PI * 2);
    context.fill();
  } else if (enemy.type === "skimmer") {
    context.fillStyle = stats.color;
    context.beginPath();
    context.ellipse(x + enemy.width * 0.5, y + enemy.height * 0.6, 18, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d9f3ff";
    context.fillRect(x + 4, y + enemy.height - 4, enemy.width - 8, 3);
  } else if (enemy.type === "hopper") {
    context.fillStyle = stats.color;
    context.fillRect(x + 4, y + 8, enemy.width - 8, enemy.height - 8);
    context.fillStyle = "#d7ffd8";
    context.fillRect(x + 8, y + 4, enemy.width - 16, 10);
  } else if (enemy.type === "charger") {
    context.fillStyle = stats.color;
    context.fillRect(x + 2, y + 8, enemy.width - 4, enemy.height - 8);
    context.fillStyle = "#f2c9a5";
    context.fillRect(x + (enemy.dir > 0 ? enemy.width - 14 : 4), y + 10, 10, 8);
  } else {
    context.fillStyle = stats.color;
    context.fillRect(x + 4, y + 6, enemy.width - 8, enemy.height - 6);
  }

  context.fillStyle = "#1f2d39";
  const eyeX = enemy.dir > 0 ? x + enemy.width - 12 : x + 10;
  context.beginPath();
  context.arc(eyeX, y + 11, 2, 0, Math.PI * 2);
  context.fill();
}

function drawDuck(context, player, cameraX, timestamp, time) {
  const x = player.x - cameraX;
  const y = player.y;
  const wingLift = !player.onGround && !player.inWater ? Math.sin(timestamp / 110) * 6 : 0;
  const blink = time < player.invincibleUntil && Math.floor(time * 14) % 2 === 0;

  if (blink) return;

  if (player.inWater && player.currentWater) {
    context.strokeStyle = "rgba(240, 252, 255, 0.75)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(x + player.width * 0.54, player.currentWater.y + 14, 26, 5, 0, 0, Math.PI * 2);
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
  context.fillText(game.stage.label, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 34);
  context.font = '700 24px "Fraunces", "Iowan Old Style", serif';
  context.fillText(game.status === "clear" ? "CLEAR!" : game.stage.name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 2);
  context.font = '15px "IBM Plex Mono", monospace';
  context.fillText(
    game.status === "clear" ? "Enterでやり直し" : "Enterでスタート",
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 38
  );
  context.textAlign = "start";
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function centerX(entity) {
  return entity.x + entity.width * 0.5;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function approach(current, target, amount) {
  if (current < target) return Math.min(current + amount, target);
  if (current > target) return Math.max(current - amount, target);
  return target;
}

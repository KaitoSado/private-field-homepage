"use client";

import { useEffect, useRef, useState } from "react";

const GRID_COLUMNS = 12;
const GRID_ROWS = 8;
const TILE_SIZE = 60;
const CANVAS_WIDTH = GRID_COLUMNS * TILE_SIZE;
const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE;
const START_LIVES = 20;
const START_COST = 140;

const ROUTE_CELLS = [
  [0, 3],
  [1, 3],
  [2, 3],
  [2, 2],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [5, 2],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
  [8, 4],
  [8, 5],
  [9, 5],
  [10, 5],
  [11, 5]
];

const PATH_POINTS = ROUTE_CELLS.map(([column, row]) => ({
  x: column * TILE_SIZE + TILE_SIZE / 2,
  y: row * TILE_SIZE + TILE_SIZE / 2
}));

const BUILDABLE_CELLS = buildBuildableCells();

const TOWER_TYPES = {
  archer: {
    label: "Archer",
    cost: 60,
    range: 150,
    damage: 15,
    attackInterval: 0.52,
    projectileSpeed: 380,
    color: "#84ccff",
    detail: "安価 / 単体 / 連射"
  },
  cannon: {
    label: "Cannon",
    cost: 110,
    range: 172,
    damage: 36,
    attackInterval: 1.35,
    projectileSpeed: 290,
    splashRadius: 54,
    color: "#f7b267",
    detail: "高火力 / 範囲"
  },
  ice: {
    label: "Ice",
    cost: 85,
    range: 145,
    damage: 8,
    attackInterval: 0.84,
    projectileSpeed: 340,
    slowFactor: 0.5,
    slowDuration: 1.5,
    color: "#8ef6e4",
    detail: "減速 / 低ダメージ"
  }
};

const ENEMY_TYPES = {
  normal: {
    label: "Normal",
    maxHp: 54,
    speed: 64,
    reward: 12,
    radius: 15,
    color: "#fb7185"
  },
  fast: {
    label: "Fast",
    maxHp: 34,
    speed: 98,
    reward: 10,
    radius: 13,
    color: "#facc15"
  },
  tank: {
    label: "Tank",
    maxHp: 122,
    speed: 40,
    reward: 18,
    radius: 18,
    color: "#a78bfa"
  }
};

const WAVE_DEFINITIONS = [
  [{ type: "normal", count: 6, spacing: 0.88 }],
  [
    { type: "normal", count: 7, spacing: 0.72 },
    { type: "fast", count: 3, spacing: 0.6, delay: 2.1 }
  ],
  [
    { type: "normal", count: 6, spacing: 0.68 },
    { type: "tank", count: 2, spacing: 1.35, delay: 1.8 }
  ],
  [
    { type: "fast", count: 7, spacing: 0.46 },
    { type: "normal", count: 5, spacing: 0.7, delay: 1.4 }
  ],
  [
    { type: "tank", count: 4, spacing: 1.15 },
    { type: "fast", count: 5, spacing: 0.58, delay: 2.6 }
  ],
  [
    { type: "normal", count: 10, spacing: 0.48 },
    { type: "fast", count: 8, spacing: 0.42, delay: 2.2 },
    { type: "tank", count: 3, spacing: 1.1, delay: 5.2 }
  ]
];

export function TowerDefenseGame() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const lastFrameRef = useRef(0);
  const gameRef = useRef(createTowerDefenseState("archer"));
  const [selectedTower, setSelectedTower] = useState("archer");
  const [hud, setHud] = useState(() => buildHud(gameRef.current));

  useEffect(() => {
    gameRef.current.selectedTower = selectedTower;
  }, [selectedTower]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    function syncHud() {
      const nextHud = buildHud(gameRef.current);
      setHud((current) =>
        current.lives === nextHud.lives &&
        current.cost === nextHud.cost &&
        current.score === nextHud.score &&
        current.wave === nextHud.wave &&
        current.totalWaves === nextHud.totalWaves &&
        current.status === nextHud.status &&
        current.selectedTower === nextHud.selectedTower
          ? current
          : nextHud
      );
    }

    function frame(timestamp) {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const delta = Math.min((timestamp - lastFrameRef.current) / 1000, 0.032);
      lastFrameRef.current = timestamp;

      updateTowerDefense(gameRef.current, delta);
      drawTowerDefense(context, gameRef.current);
      syncHud();
      animationRef.current = window.requestAnimationFrame(frame);
    }

    animationRef.current = window.requestAnimationFrame(frame);

    function handleCanvasMove(event) {
      const point = translatePointer(canvas, event.clientX, event.clientY);
      gameRef.current.hoveredCell = getGridCell(point.x, point.y);
    }

    function handleCanvasLeave() {
      gameRef.current.hoveredCell = null;
    }

    function handleCanvasClick(event) {
      const point = translatePointer(canvas, event.clientX, event.clientY);
      const cell = getGridCell(point.x, point.y);
      if (!cell) return;
      tryPlaceTower(gameRef.current, cell.column, cell.row);
      syncHud();
    }

    function handleKeyDown(event) {
      if (event.key === "Enter") {
        if (gameRef.current.status === "title") {
          gameRef.current.status = "playing";
          gameRef.current.notice = { text: "Wave 1 incoming", ttl: 1.4 };
        } else if (gameRef.current.status === "gameover" || gameRef.current.status === "clear") {
          gameRef.current = createTowerDefenseState(selectedTower);
        }
        syncHud();
      }

      if (event.key === "1") setSelectedTower("archer");
      if (event.key === "2") setSelectedTower("cannon");
      if (event.key === "3") setSelectedTower("ice");
    }

    canvas.addEventListener("mousemove", handleCanvasMove);
    canvas.addEventListener("mouseleave", handleCanvasLeave);
    canvas.addEventListener("click", handleCanvasClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener("mousemove", handleCanvasMove);
      canvas.removeEventListener("mouseleave", handleCanvasLeave);
      canvas.removeEventListener("click", handleCanvasClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTower]);

  function handleStartOrRestart() {
    if (gameRef.current.status === "title") {
      gameRef.current.status = "playing";
      gameRef.current.notice = { text: "Wave 1 incoming", ttl: 1.4 };
    } else {
      gameRef.current = createTowerDefenseState(selectedTower);
    }
    setHud(buildHud(gameRef.current));
  }

  return (
    <div className="arcade-panel-grid">
      <div className="surface arcade-game-card arcade-defense-card">
        <div className="section-copy">
          <h2>Tower Defense</h2>
          <p>
            {hud.status === "title" ? "Enter or Start で開始" : null}
            {hud.status === "playing" ? "塔を置いてゴールを守る" : null}
            {hud.status === "gameover" ? "ゲームオーバー。Enterで再開" : null}
            {hud.status === "clear" ? "クリア。Enterで再開" : null}
          </p>
        </div>

        <div className="arcade-defense-hud">
          <div className="stat-tile">
            <strong>{hud.lives}</strong>
            <span>Life</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.cost}</strong>
            <span>Cost</span>
          </div>
          <div className="stat-tile">
            <strong>
              {hud.wave}/{hud.totalWaves}
            </strong>
            <span>Wave</span>
          </div>
          <div className="stat-tile">
            <strong>{hud.score}</strong>
            <span>Score</span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="arcade-defense-canvas"
        />
      </div>

      <div className="surface arcade-side-card arcade-defense-side">
        <div className="section-copy">
          <p className="eyebrow">Selected</p>
          <h3>{TOWER_TYPES[selectedTower].label}</h3>
          <p>{TOWER_TYPES[selectedTower].detail}</p>
        </div>

        <div className="arcade-defense-tower-list">
          {Object.entries(TOWER_TYPES).map(([key, tower]) => (
            <button
              key={key}
              type="button"
              className={`arcade-defense-tower-button ${selectedTower === key ? "is-active" : ""}`}
              onClick={() => setSelectedTower(key)}
            >
              <strong>{tower.label}</strong>
              <span>{tower.cost} cost</span>
              <small>{tower.detail}</small>
            </button>
          ))}
        </div>

        <div className="arcade-defense-legend">
          <div>
            <span className="arcade-defense-swatch is-path" />
            ルート
          </div>
          <div>
            <span className="arcade-defense-swatch is-buildable" />
            配置可能
          </div>
          <div>
            <span className="arcade-defense-swatch is-goal" />
            ゴール
          </div>
        </div>

        <div className="hero-actions">
          <button type="button" className="button button-primary" onClick={handleStartOrRestart}>
            {hud.status === "title" ? "Start" : "Restart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function createTowerDefenseState(selectedTower) {
  return {
    status: "title",
    lives: START_LIVES,
    cost: START_COST,
    score: 0,
    selectedTower,
    towers: [],
    enemies: [],
    projectiles: [],
    effects: [],
    spawnQueue: [],
    currentWave: 0,
    waveTime: 0,
    interWaveTimer: 1.2,
    hoveredCell: null,
    enemyId: 1,
    projectileId: 1,
    effectId: 1,
    notice: { text: "Enterでスタート", ttl: 10 }
  };
}

function buildHud(game) {
  return {
    lives: game.lives,
    cost: game.cost,
    score: game.score,
    wave: Math.max(1, game.currentWave),
    totalWaves: WAVE_DEFINITIONS.length,
    status: game.status,
    selectedTower: game.selectedTower
  };
}

function buildBuildableCells() {
  const routeSet = new Set(ROUTE_CELLS.map(([column, row]) => `${column}:${row}`));
  const cells = new Set();

  for (const [column, row] of ROUTE_CELLS) {
    const candidates = [
      [column + 1, row],
      [column - 1, row],
      [column, row + 1],
      [column, row - 1]
    ];

    for (const [candidateColumn, candidateRow] of candidates) {
      if (
        candidateColumn < 0 ||
        candidateColumn >= GRID_COLUMNS ||
        candidateRow < 0 ||
        candidateRow >= GRID_ROWS
      ) {
        continue;
      }

      const key = `${candidateColumn}:${candidateRow}`;
      if (!routeSet.has(key)) cells.add(key);
    }
  }

  return cells;
}

function updateTowerDefense(game, delta) {
  updateEffects(game, delta);
  updateNotice(game, delta);

  if (game.status !== "playing") return;

  if (!game.spawnQueue.length && !game.enemies.length) {
    if (game.currentWave >= WAVE_DEFINITIONS.length) {
      game.status = "clear";
      game.notice = { text: "All waves cleared", ttl: 2.4 };
      return;
    }

    game.interWaveTimer -= delta;
    if (game.interWaveTimer <= 0) {
      startNextWave(game);
    }
  } else {
    updateSpawnQueue(game, delta);
  }

  updateTowers(game, delta);
  updateProjectiles(game, delta);
  updateEnemies(game, delta);

  game.enemies = game.enemies.filter((enemy) => enemy.alive);
  game.projectiles = game.projectiles.filter((projectile) => projectile.alive);
  game.effects = game.effects.filter((effect) => effect.life > 0);

  if (game.lives <= 0) {
    game.status = "gameover";
    game.notice = { text: "The core has fallen", ttl: 2.8 };
  }
}

function startNextWave(game) {
  const waveDefinition = WAVE_DEFINITIONS[game.currentWave];
  game.spawnQueue = buildSpawnQueue(waveDefinition);
  game.waveTime = 0;
  game.currentWave += 1;
  game.interWaveTimer = 2.1;
  game.notice = { text: `Wave ${game.currentWave}`, ttl: 1.4 };
}

function buildSpawnQueue(groups) {
  const events = [];

  for (const group of groups) {
    for (let index = 0; index < group.count; index += 1) {
      events.push({
        type: group.type,
        time: (group.delay || 0) + index * group.spacing
      });
    }
  }

  return events.sort((left, right) => left.time - right.time);
}

function updateSpawnQueue(game, delta) {
  game.waveTime += delta;

  while (game.spawnQueue.length && game.spawnQueue[0].time <= game.waveTime) {
    const next = game.spawnQueue.shift();
    game.enemies.push(createEnemy(game, next.type));
  }
}

function createEnemy(game, type) {
  const config = ENEMY_TYPES[type];
  const start = PATH_POINTS[0];

  return {
    id: game.enemyId++,
    type,
    x: start.x,
    y: start.y,
    hp: config.maxHp,
    maxHp: config.maxHp,
    speed: config.speed,
    reward: config.reward,
    radius: config.radius,
    color: config.color,
    routeIndex: 0,
    progress: 0,
    alive: true,
    slowTimer: 0,
    slowFactor: 1,
    flash: 0
  };
}

function createTower(column, row, type) {
  const config = TOWER_TYPES[type];
  return {
    id: `${column}:${row}`,
    column,
    row,
    x: column * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
    type,
    range: config.range,
    damage: config.damage,
    attackInterval: config.attackInterval,
    projectileSpeed: config.projectileSpeed,
    splashRadius: config.splashRadius || 0,
    slowFactor: config.slowFactor || 1,
    slowDuration: config.slowDuration || 0,
    cooldown: 0,
    flash: 0,
    color: config.color
  };
}

function updateEnemies(game, delta) {
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;

    enemy.flash = Math.max(0, enemy.flash - delta);
    if (enemy.slowTimer > 0) {
      enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
      if (enemy.slowTimer === 0) enemy.slowFactor = 1;
    }

    let remaining = enemy.speed * enemy.slowFactor * delta;

    while (remaining > 0 && enemy.routeIndex < PATH_POINTS.length - 1) {
      const target = PATH_POINTS[enemy.routeIndex + 1];
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= remaining) {
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.routeIndex += 1;
        remaining -= distance;
      } else {
        enemy.x += (dx / distance) * remaining;
        enemy.y += (dy / distance) * remaining;
        remaining = 0;
      }
    }

    if (enemy.routeIndex >= PATH_POINTS.length - 1) {
      enemy.alive = false;
      game.lives -= 1;
      game.notice = { text: "An enemy slipped through", ttl: 1.1 };
      continue;
    }

    const segmentStart = PATH_POINTS[enemy.routeIndex];
    const segmentEnd = PATH_POINTS[enemy.routeIndex + 1];
    const segmentLength = Math.hypot(segmentEnd.x - segmentStart.x, segmentEnd.y - segmentStart.y) || 1;
    const segmentTravel = Math.hypot(enemy.x - segmentStart.x, enemy.y - segmentStart.y);
    enemy.progress = enemy.routeIndex + segmentTravel / segmentLength;
  }
}

function updateTowers(game, delta) {
  for (const tower of game.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - delta);
    tower.flash = Math.max(0, tower.flash - delta);

    if (tower.cooldown > 0) continue;
    const target = pickTarget(game.enemies, tower);
    if (!target) continue;

    tower.cooldown = tower.attackInterval;
    tower.flash = 0.08;
    game.projectiles.push(createProjectile(game, tower, target));
  }
}

function pickTarget(enemies, tower) {
  let candidate = null;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (distance > tower.range) continue;
    if (!candidate || enemy.progress > candidate.progress) candidate = enemy;
  }

  return candidate;
}

function createProjectile(game, tower, target) {
  return {
    id: game.projectileId++,
    type: tower.type,
    x: tower.x,
    y: tower.y,
    targetId: target.id,
    aimX: target.x,
    aimY: target.y,
    speed: tower.projectileSpeed,
    damage: tower.damage,
    splashRadius: tower.splashRadius,
    slowFactor: tower.slowFactor,
    slowDuration: tower.slowDuration,
    color: tower.color,
    radius: tower.type === "cannon" ? 7 : 5,
    alive: true
  };
}

function updateProjectiles(game, delta) {
  for (const projectile of game.projectiles) {
    if (!projectile.alive) continue;

    const target = game.enemies.find((enemy) => enemy.id === projectile.targetId && enemy.alive);
    if (target) {
      projectile.aimX = target.x;
      projectile.aimY = target.y;
    }

    const dx = projectile.aimX - projectile.x;
    const dy = projectile.aimY - projectile.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
      resolveProjectileHit(game, projectile, projectile.aimX, projectile.aimY, target);
      continue;
    }

    const step = projectile.speed * delta;
    if (step >= distance) {
      resolveProjectileHit(game, projectile, projectile.aimX, projectile.aimY, target);
      continue;
    }

    projectile.x += (dx / distance) * step;
    projectile.y += (dy / distance) * step;
  }
}

function resolveProjectileHit(game, projectile, hitX, hitY, target) {
  if (projectile.type === "cannon") {
    for (const enemy of game.enemies) {
      if (!enemy.alive) continue;
      const distance = Math.hypot(enemy.x - hitX, enemy.y - hitY);
      if (distance <= projectile.splashRadius) applyHit(game, enemy, projectile.damage);
    }
    game.effects.push(createEffect(game, hitX, hitY, "#f7b267", projectile.splashRadius));
  } else {
    if (target && target.alive) {
      applyHit(game, target, projectile.damage);
      if (projectile.type === "ice") {
        target.slowTimer = Math.max(target.slowTimer, projectile.slowDuration);
        target.slowFactor = Math.min(target.slowFactor, projectile.slowFactor);
      }
      game.effects.push(createEffect(game, target.x, target.y, projectile.color, 18));
    }
  }

  projectile.alive = false;
}

function applyHit(game, enemy, damage) {
  enemy.hp -= damage;
  enemy.flash = 0.1;

  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    game.score += enemy.reward * 10;
    game.cost += enemy.reward;
    game.effects.push(createEffect(game, enemy.x, enemy.y, enemy.color, 30));
  }
}

function createEffect(game, x, y, color, maxRadius) {
  return {
    id: game.effectId++,
    x,
    y,
    color,
    radius: 8,
    maxRadius,
    life: 0.35
  };
}

function updateEffects(game, delta) {
  for (const effect of game.effects) {
    effect.life = Math.max(0, effect.life - delta);
    effect.radius = Math.min(effect.maxRadius, effect.radius + 140 * delta);
  }
}

function updateNotice(game, delta) {
  if (!game.notice) return;
  game.notice.ttl = Math.max(0, game.notice.ttl - delta);
  if (game.notice.ttl === 0) game.notice = null;
}

function tryPlaceTower(game, column, row) {
  if (game.status !== "playing") return;

  const cellKey = `${column}:${row}`;
  const towerConfig = TOWER_TYPES[game.selectedTower];
  const occupied = game.towers.some((tower) => tower.column === column && tower.row === row);

  if (!BUILDABLE_CELLS.has(cellKey) || occupied) {
    game.notice = { text: "ここには置けません", ttl: 0.9 };
    return;
  }

  if (game.cost < towerConfig.cost) {
    game.notice = { text: "コスト不足", ttl: 0.9 };
    return;
  }

  game.cost -= towerConfig.cost;
  game.towers.push(createTower(column, row, game.selectedTower));
}

function drawTowerDefense(context, game) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBoard(context);
  drawRoute(context);
  drawBuildableHighlights(context);
  drawHoveredCell(context, game);
  drawTowers(context, game.towers);
  drawEnemies(context, game.enemies);
  drawProjectiles(context, game.projectiles);
  drawEffects(context, game.effects);
  drawOverlay(context, game);
}

function drawBoard(context) {
  context.fillStyle = "#0d1520";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const x = column * TILE_SIZE;
      const y = row * TILE_SIZE;
      const key = `${column}:${row}`;
      const isRoute = ROUTE_CELLS.some(([routeColumn, routeRow]) => routeColumn === column && routeRow === row);

      context.fillStyle = isRoute ? "#253244" : BUILDABLE_CELLS.has(key) ? "#162330" : "#111b27";
      context.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
  }
}

function drawRoute(context) {
  context.save();
  context.lineWidth = 26;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(250, 203, 107, 0.18)";
  context.beginPath();
  context.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
  for (const point of PATH_POINTS.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.stroke();

  context.lineWidth = 10;
  context.strokeStyle = "rgba(250, 203, 107, 0.55)";
  context.stroke();

  const goal = PATH_POINTS[PATH_POINTS.length - 1];
  context.fillStyle = "#f87171";
  context.beginPath();
  context.arc(goal.x, goal.y, 14, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawBuildableHighlights(context) {
  context.save();
  context.fillStyle = "rgba(132, 204, 255, 0.09)";

  for (const key of BUILDABLE_CELLS) {
    const [column, row] = key.split(":").map(Number);
    const centerX = column * TILE_SIZE + TILE_SIZE / 2;
    const centerY = row * TILE_SIZE + TILE_SIZE / 2;
    context.beginPath();
    context.arc(centerX, centerY, 6, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawHoveredCell(context, game) {
  if (!game.hoveredCell) return;

  const { column, row } = game.hoveredCell;
  const key = `${column}:${row}`;
  const x = column * TILE_SIZE;
  const y = row * TILE_SIZE;
  const occupied = game.towers.some((tower) => tower.column === column && tower.row === row);

  context.save();
  context.strokeStyle = BUILDABLE_CELLS.has(key) && !occupied ? "rgba(110, 231, 249, 0.7)" : "rgba(248, 113, 113, 0.6)";
  context.lineWidth = 3;
  context.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6);

  if (BUILDABLE_CELLS.has(key) && !occupied) {
    const selected = TOWER_TYPES[game.selectedTower];
    const centerX = x + TILE_SIZE / 2;
    const centerY = y + TILE_SIZE / 2;
    context.fillStyle = `${selected.color}66`;
    context.beginPath();
    context.arc(centerX, centerY, 16, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `${selected.color}44`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(centerX, centerY, selected.range, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawTowers(context, towers) {
  for (const tower of towers) {
    context.save();
    context.translate(tower.x, tower.y);
    context.fillStyle = tower.color;
    context.beginPath();
    context.arc(0, 0, 16, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#0f1722";
    context.fillRect(-4, -18, 8, 20);

    if (tower.flash > 0) {
      context.strokeStyle = "rgba(255,255,255,0.8)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 22, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
}

function drawEnemies(context, enemies) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    context.save();
    context.translate(enemy.x, enemy.y);
    context.fillStyle = enemy.flash > 0 ? "#ffffff" : enemy.color;
    context.beginPath();
    context.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    context.fill();

    const hpWidth = enemy.radius * 2;
    context.fillStyle = "rgba(15, 23, 34, 0.8)";
    context.fillRect(-hpWidth / 2, -enemy.radius - 12, hpWidth, 5);
    context.fillStyle = "#7df59b";
    context.fillRect(-hpWidth / 2, -enemy.radius - 12, hpWidth * Math.max(0, enemy.hp / enemy.maxHp), 5);

    if (enemy.slowTimer > 0) {
      context.strokeStyle = "rgba(142, 246, 228, 0.8)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, enemy.radius + 4, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }
}

function drawProjectiles(context, projectiles) {
  for (const projectile of projectiles) {
    if (!projectile.alive) continue;
    context.fillStyle = projectile.color;
    context.beginPath();
    context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawEffects(context, effects) {
  for (const effect of effects) {
    const alpha = Math.max(0, effect.life / 0.35);
    context.strokeStyle = hexToRgba(effect.color, alpha);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawOverlay(context, game) {
  context.save();

  if (game.notice) {
    context.fillStyle = "rgba(15, 23, 34, 0.72)";
    context.fillRect(CANVAS_WIDTH / 2 - 120, 18, 240, 36);
    context.fillStyle = "#f8fafc";
    context.font = '600 15px "IBM Plex Mono", monospace';
    context.textAlign = "center";
    context.fillText(game.notice.text, CANVAS_WIDTH / 2, 41);
  }

  if (game.status === "playing") {
    context.restore();
    return;
  }

  context.fillStyle = "rgba(10, 15, 24, 0.74)";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = "#f8fafc";
  context.textAlign = "center";
  context.font = '700 42px "Fraunces", "Yu Mincho", serif';

  const title =
    game.status === "title" ? "Tower Defense" : game.status === "clear" ? "Clear" : "Game Over";
  context.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 28);

  context.font = '500 18px "IBM Plex Mono", monospace';
  const subline =
    game.status === "title"
      ? "Enter or Start で開始"
      : "Enter or Restart でやり直し";
  context.fillText(subline, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 16);
  context.restore();
}

function getGridCell(x, y) {
  if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return null;
  return {
    column: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE)
  };
}

function translatePointer(canvas, clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  return {
    x: (clientX - bounds.left) * scaleX,
    y: (clientY - bounds.top) * scaleY
  };
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

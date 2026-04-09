(function () {
  "use strict";

  if (!window.Matter) {
    const startButton = document.getElementById("startButton");
    const statusText = document.getElementById("statusText");
    if (startButton) startButton.disabled = true;
    if (statusText) statusText.textContent = "Matter.js の読み込みに失敗しました。通信環境を確認してください。";
    return;
  }

  const { Engine, World, Bodies, Body, Events } = window.Matter;

  // Core constants
  const WORLD_WIDTH = 960;
  const WORLD_HEIGHT = 600;
  const PEDESTAL_CENTER_X = WORLD_WIDTH * 0.5;
  const PEDESTAL_TOP_Y = 446;
  const PEDESTAL_Y = 462;
  const PEDESTAL_WIDTH = 252;
  const RIVER_THRESHOLD_Y = 528;
  const OUT_OF_BOUNDS_X = 132;
  const STORAGE_KEY = "sainokawara-best-score-v2";
  const SETTLE_MIN_MS = 2200;
  const SETTLE_MAX_MS = 7000;
  const MOVE_SPEED = 0.38;
  const ROTATE_SPEED = 0.0036;
  const PREVIEW_LIMIT_LEFT = 150;
  const PREVIEW_LIMIT_RIGHT = WORLD_WIDTH - 150;

  // DOM references
  const canvas = document.getElementById("gameCanvas");
  const context = canvas.getContext("2d");
  const nextCanvas = document.getElementById("nextCanvas");
  const nextContext = nextCanvas.getContext("2d");

  const hud = document.getElementById("hud");
  const sidePanel = document.getElementById("sidePanel");
  const titleScreen = document.getElementById("titleScreen");
  const resultScreen = document.getElementById("resultScreen");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const restartButton = document.getElementById("restartButton");
  const titleButton = document.getElementById("titleButton");
  const resultTitleButton = document.getElementById("resultTitleButton");
  const statusText = document.getElementById("statusText");

  const stonesValue = document.getElementById("stonesValue");
  const heightValue = document.getElementById("heightValue");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const streakValue = document.getElementById("streakValue");
  const riskValue = document.getElementById("riskValue");
  const fallenValue = document.getElementById("fallenValue");
  const windValue = document.getElementById("windValue");
  const multiplierValue = document.getElementById("multiplierValue");
  const dangerFill = document.getElementById("dangerFill");

  const resultScore = document.getElementById("resultScore");
  const resultStones = document.getElementById("resultStones");
  const resultHeight = document.getElementById("resultHeight");
  const resultNote = document.getElementById("resultNote");

  // Input state
  const input = {
    left: false,
    right: false,
    rotateLeft: false,
    rotateRight: false
  };

  // Simple synthesized audio
  const audio = createAudioSystem();

  // Game state
  const state = {
    engine: null,
    world: null,
    staticBodies: [],
    stones: [],
    previewStone: null,
    nextStone: null,
    previewX: PEDESTAL_CENTER_X,
    previewY: 160,
    previewAngle: 0,
    dragging: false,
    activePointerId: null,
    screen: "title",
    mode: "idle",
    settle: null,
    collapseTimerStartedAt: null,
    now: performance.now(),
    lastFrameAt: performance.now(),
    placedCount: 0,
    maxHeight: 0,
    score: 0,
    streak: 0,
    riskBonusTotal: 0,
    comboBonusTotal: 0,
    multiplierBonusTotal: 0,
    lastRiskBonus: 0,
    currentMultiplier: 1,
    currentDanger: 0,
    currentWind: 0,
    fallenCount: 0,
    bestScore: readBestScore(),
    collapseFlash: 0,
    statusMessage: "石を置く前に、ほんの少しだけ深呼吸。",
    stoneSequence: 0,
    impactCooldownUntil: 0
  };

  buildWorld();
  updateHud();
  renderNextPreview();
  requestAnimationFrame(frame);

  // UI events
  startButton.addEventListener("click", startGame);
  retryButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  titleButton.addEventListener("click", returnToTitle);
  resultTitleButton.addEventListener("click", returnToTitle);

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener(
    "wheel",
    (event) => {
      if (state.screen !== "game" || state.mode !== "placing") return;
      event.preventDefault();
      rotatePreview(event.deltaY > 0 ? 0.08 : -0.08);
    },
    { passive: false }
  );

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action } = button.dataset;
      if (state.screen !== "game") return;
      if (action === "left") nudgePreview(-20);
      if (action === "right") nudgePreview(20);
      if (action === "rotate-left") rotatePreview(-0.12);
      if (action === "rotate-right") rotatePreview(0.12);
      if (action === "place") dropPreviewStone();
    });
  });

  // Physics world
  function buildWorld() {
    const engine = Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1.05 }
    });

    engine.positionIterations = 10;
    engine.velocityIterations = 7;
    engine.constraintIterations = 3;

    const world = engine.world;
    const riverbed = Bodies.rectangle(WORLD_WIDTH * 0.5, 588, WORLD_WIDTH + 220, 90, {
      isStatic: true,
      label: "riverbed",
      friction: 0.94
    });
    const pedestal = Bodies.rectangle(PEDESTAL_CENTER_X, PEDESTAL_Y, PEDESTAL_WIDTH, 24, {
      isStatic: true,
      label: "pedestal",
      chamfer: { radius: 12 },
      friction: 1.28
    });
    const leftBank = Bodies.rectangle(34, 340, 120, 560, {
      isStatic: true,
      label: "bank"
    });
    const rightBank = Bodies.rectangle(WORLD_WIDTH - 34, 340, 120, 560, {
      isStatic: true,
      label: "bank"
    });

    World.add(world, [riverbed, pedestal, leftBank, rightBank]);
    Events.on(engine, "collisionStart", handleCollisions);

    state.engine = engine;
    state.world = world;
    state.staticBodies = [riverbed, pedestal, leftBank, rightBank];
    state.stones = [];
  }

  function startGame() {
    audio.unlock();
    resetGameState();
  }

  function resetGameState() {
    buildWorld();
    state.previewStone = null;
    state.nextStone = createStoneSeed();
    state.previewX = PEDESTAL_CENTER_X;
    state.previewY = 160;
    state.previewAngle = 0;
    state.dragging = false;
    state.activePointerId = null;
    state.screen = "game";
    state.mode = "placing";
    state.settle = null;
    state.collapseTimerStartedAt = null;
    state.placedCount = 0;
    state.maxHeight = 0;
    state.score = 0;
    state.streak = 0;
    state.riskBonusTotal = 0;
    state.comboBonusTotal = 0;
    state.multiplierBonusTotal = 0;
    state.lastRiskBonus = 0;
    state.currentMultiplier = 1;
    state.currentDanger = 0;
    state.currentWind = 0;
    state.fallenCount = 0;
    state.collapseFlash = 0;
    state.statusMessage = "石を置く前に、ほんの少しだけ深呼吸。";
    state.stoneSequence = 0;
    state.impactCooldownUntil = 0;
    preparePreviewStone();
    updateOverlayVisibility();
    updateHud();
  }

  function returnToTitle() {
    state.screen = "title";
    state.mode = "idle";
    state.dragging = false;
    state.activePointerId = null;
    state.statusMessage = "石を置く前に、ほんの少しだけ深呼吸。";
    updateOverlayVisibility();
    updateHud();
  }

  // Main loop
  function frame(timestamp) {
    const delta = Math.min(34, timestamp - state.lastFrameAt || 16.67);
    state.lastFrameAt = timestamp;
    state.now = timestamp;
    canvas.style.cursor =
      state.screen === "game" && state.mode === "placing" ? (state.dragging ? "grabbing" : "grab") : "default";

    if (state.screen === "game") {
      updateWindModel();
      if (state.mode === "placing") {
        updatePreviewFromInput(delta);
      }
      applyAmbientWind(delta);
      Engine.update(state.engine, delta);
      updateFallenFlags();

      if (state.mode === "settling") {
        evaluateSettlement();
      } else {
        evaluateGlobalCollapse();
      }

      state.currentDanger = computeDisplayDanger();
      state.currentMultiplier = computePlacementMultiplier();
      updateHud();
    }

    if (state.collapseFlash > 0) {
      state.collapseFlash = Math.max(0, state.collapseFlash - delta / 850);
    }

    drawScene();
    requestAnimationFrame(frame);
  }

  // Placement flow
  function preparePreviewStone() {
    state.previewStone = state.nextStone || createStoneSeed();
    state.nextStone = createStoneSeed();
    state.previewX = clamp(getTowerCenter() + randomRange(-32, 32), PREVIEW_LIMIT_LEFT, PREVIEW_LIMIT_RIGHT);
    state.previewY = getSuggestedPreviewY(state.previewStone);
    state.previewAngle = randomRange(-0.18, 0.18);
    state.dragging = false;
    state.activePointerId = null;
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
    renderNextPreview();
    updateHud();
  }

  function dropPreviewStone() {
    if (state.screen !== "game" || state.mode !== "placing" || !state.previewStone) return;

    const body = createStoneBody(state.previewStone, state.previewX, state.previewY, state.previewAngle);
    body.stoneData = {
      id: ++state.stoneSequence,
      riskBonus: state.lastRiskBonus
    };

    World.add(state.world, body);
    state.stones.push(body);
    state.mode = "settling";
    state.settle = {
      startedAt: state.now,
      minAt: state.now + SETTLE_MIN_MS,
      maxAt: state.now + SETTLE_MAX_MS,
      stableFrames: 0,
      lastBodyId: body.stoneData.id,
      heightBefore: getTowerHeight(),
      fallenBefore: countFallenBodies()
    };
    state.statusMessage = "揺れがおさまるまで、しばらく待つ。";
    audio.place();
    updateHud();
  }

  function evaluateSettlement() {
    const fallenTotal = countFallenBodies();
    const motion = measureMotion();
    const lastBody = getStoneById(state.settle.lastBodyId);
    const lastBodyFallen = !lastBody || isFallen(lastBody);

    if (fallenTotal > 0 || lastBodyFallen) {
      endRun("石が台から落ちました。");
      return;
    }

    if (state.now < state.settle.minAt) return;

    const quiet = motion.maxSpeed < 0.54 && motion.maxAngular < 0.05;
    state.settle.stableFrames = quiet ? state.settle.stableFrames + 1 : 0;

    if (state.settle.stableFrames > 34 || state.now >= state.settle.maxAt) {
      finalizeStablePlacement(false);
    }
  }

  function finalizeStablePlacement(lastBodyFallen) {
    const previousHeight = state.settle.heightBefore;
    state.mode = "placing";
    state.settle = null;
    state.fallenCount = countFallenBodies();

    if (!lastBodyFallen) {
      const nextHeight = getTowerHeight();
      const heightGain = Math.max(0, nextHeight - previousHeight);
      const placementRisk = state.lastRiskBonus;
      const comboGain = Math.min(220, Math.max(0, state.streak) * 20);
      const multiplierGain = Math.round(
        (100 + heightGain * 10 + placementRisk + comboGain) * (state.currentMultiplier - 1)
      );

      state.placedCount += 1;
      state.streak += 1;
      state.maxHeight = Math.max(state.maxHeight, nextHeight);
      state.riskBonusTotal += placementRisk;
      state.comboBonusTotal += comboGain;
      state.multiplierBonusTotal += multiplierGain;
      state.score = computeScore();

      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        saveBestScore(state.bestScore);
      }

      state.statusMessage =
        state.currentMultiplier >= 1.35
          ? "危うい場所だったが、まだ立っている。"
          : "静けさが戻った。次の一石が来る。";
    } else {
      state.streak = 0;
      state.lastRiskBonus = 0;
      state.statusMessage = "石が外れた。まだ続けられる。";
    }

    preparePreviewStone();
    updateHud();
  }

  function evaluateGlobalCollapse() {
    if (countFallenBodies() > 0) {
      endRun("石が台から落ちました。");
      return;
    }

    if (state.placedCount < 4) {
      state.collapseTimerStartedAt = null;
      return;
    }

    const fallenTotal = countFallenBodies();
    const currentHeight = getTowerHeight();
    const severe =
      fallenTotal >= 4 ||
      (fallenTotal >= 3 && currentHeight < Math.max(90, state.maxHeight * 0.46)) ||
      (state.maxHeight > 180 && currentHeight < state.maxHeight * 0.28);

    if (!severe) {
      state.collapseTimerStartedAt = null;
      return;
    }

    if (!state.collapseTimerStartedAt) {
      state.collapseTimerStartedAt = state.now;
      return;
    }

    if (state.now - state.collapseTimerStartedAt > 1100) {
      endRun("石塔が持ちこたえられなくなりました。");
    }
  }

  function endRun(message) {
    state.screen = "result";
    state.mode = "idle";
    state.collapseFlash = 1;
    state.fallenCount = countFallenBodies();
    state.maxHeight = Math.max(state.maxHeight, getTowerHeight());
    state.score = computeScore();
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }
    state.statusMessage = message;
    audio.collapse();
    updateOverlayVisibility();
    updateHud();
  }

  // Input
  function handlePointerDown(event) {
    if (state.screen !== "game" || state.mode !== "placing") return;
    state.dragging = true;
    state.activePointerId = event.pointerId;
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
    applyPointerPosition(event);
  }

  function handlePointerMove(event) {
    if (state.screen !== "game" || state.mode !== "placing") return;
    if (state.dragging && state.activePointerId === event.pointerId) {
      applyPointerPosition(event);
      updateHud();
      return;
    }

    const point = getPointerWorldPosition(event);
    state.previewX = clamp(point.x, PREVIEW_LIMIT_LEFT, PREVIEW_LIMIT_RIGHT);
    state.previewY = getSuggestedPreviewY(state.previewStone);
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
    updateHud();
  }

  function handlePointerUp(event) {
    if (!state.dragging) return;
    if (state.activePointerId !== null && event.pointerId !== state.activePointerId) return;
    state.dragging = false;
    state.activePointerId = null;
    if (canvas.releasePointerCapture && event.pointerId != null) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // ignore
      }
    }
    if (state.screen === "game" && state.mode === "placing") {
      dropPreviewStone();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      startGame();
      return;
    }

    if (state.screen !== "game") return;

    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) dropPreviewStone();
      return;
    }

    if (event.key === "a" || event.key === "A") input.left = true;
    if (event.key === "d" || event.key === "D") input.right = true;
    if (event.key === "q" || event.key === "Q") input.rotateLeft = true;
    if (event.key === "e" || event.key === "E") input.rotateRight = true;
  }

  function handleKeyUp(event) {
    if (event.key === "a" || event.key === "A") input.left = false;
    if (event.key === "d" || event.key === "D") input.right = false;
    if (event.key === "q" || event.key === "Q") input.rotateLeft = false;
    if (event.key === "e" || event.key === "E") input.rotateRight = false;
  }

  function updatePreviewFromInput(delta) {
    if (input.left) state.previewX -= MOVE_SPEED * delta * 14;
    if (input.right) state.previewX += MOVE_SPEED * delta * 14;
    if (input.rotateLeft) state.previewAngle -= ROTATE_SPEED * delta * 8;
    if (input.rotateRight) state.previewAngle += ROTATE_SPEED * delta * 8;

    state.previewX = clamp(state.previewX, PREVIEW_LIMIT_LEFT, PREVIEW_LIMIT_RIGHT);
    if (!state.dragging) {
      state.previewY = getSuggestedPreviewY(state.previewStone);
    }
    state.previewAngle = clamp(state.previewAngle, -1.28, 1.28);
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
  }

  function nudgePreview(amount) {
    if (state.screen !== "game" || state.mode !== "placing") return;
    state.previewX = clamp(state.previewX + amount, PREVIEW_LIMIT_LEFT, PREVIEW_LIMIT_RIGHT);
    if (!state.dragging) {
      state.previewY = getSuggestedPreviewY(state.previewStone);
    }
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
    updateHud();
  }

  function rotatePreview(amount) {
    if (state.screen !== "game" || state.mode !== "placing") return;
    state.previewAngle = clamp(state.previewAngle + amount, -1.28, 1.28);
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
    updateHud();
  }

  function getPointerWorldPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * WORLD_WIDTH, 0, WORLD_WIDTH),
      y: clamp(((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT, 0, WORLD_HEIGHT)
    };
  }

  function applyPointerPosition(event) {
    const point = getPointerWorldPosition(event);
    state.previewX = clamp(point.x, PREVIEW_LIMIT_LEFT, PREVIEW_LIMIT_RIGHT);
    state.previewY = clampPreviewY(point.y, state.previewStone);
    state.lastRiskBonus = computeRiskBonus();
    state.currentMultiplier = computePlacementMultiplier();
  }

  // Scoring, danger, wind
  function computeScore() {
    return Math.round(
      state.placedCount * 100 +
        state.maxHeight * 10 +
        state.riskBonusTotal +
        state.comboBonusTotal +
        state.multiplierBonusTotal
    );
  }

  function updateWindModel() {
    const heightFactor = clamp((getTowerHeight() - 86) / 280, 0, 1);
    const stackFactor = clamp((state.placedCount - 2) / 12, 0, 1);
    state.currentWind = heightFactor * stackFactor;
  }

  function applyAmbientWind(delta) {
    if (state.currentWind <= 0 || state.screen !== "game") return;

    const gustA = Math.sin(state.now / 3900 + 0.45);
    const gustB = Math.sin(state.now / 1700 + 1.8) * 0.48;
    const gust = clamp((gustA + gustB) / 1.48, -1, 1);
    const forceBase = (0.000001 + state.currentWind * 0.0000032) * delta;

    getStandingStones().forEach((body) => {
      const heightRatio = clamp((PEDESTAL_TOP_Y - body.position.y) / 260, 0.1, 1);
      const forceX = gust * forceBase * body.mass * (0.45 + heightRatio * 1.15);
      Body.applyForce(body, body.position, { x: forceX, y: 0 });
    });
  }

  function computeRiskBonus() {
    if (state.mode !== "placing" || !state.previewStone) return 0;
    const offset = Math.abs(state.previewX - getTowerCenter());
    const anglePressure = Math.abs(state.previewAngle) * 40;
    const heightPressure = clamp(getTowerHeight() / 10, 0, 42);
    const windPressure = state.currentWind * 36;
    return Math.round(Math.min(180, offset * 0.34 + anglePressure + heightPressure + windPressure));
  }

  function computeDisplayDanger() {
    const heightFactor = clamp(getTowerHeight() / 290, 0, 1);
    const motion = measureMotion();
    const motionFactor = clamp(motion.maxSpeed / 2.3, 0, 1);
    const leanFactor = clamp(Math.abs(getTowerCenter() - PEDESTAL_CENTER_X) / 132, 0, 1);
    const fallenFactor = clamp(countFallenBodies() / 4, 0, 1);
    const windFactor = state.currentWind;

    const towerDanger =
      heightFactor * 0.34 +
      motionFactor * 0.2 +
      leanFactor * 0.22 +
      fallenFactor * 0.24 +
      windFactor * 0.18;

    if (state.mode !== "placing") {
      return clamp(towerDanger, 0, 1);
    }

    const placementOffset = clamp(Math.abs(state.previewX - getTowerCenter()) / 138, 0, 1);
    const placementAngle = clamp(Math.abs(state.previewAngle) / 1.2, 0, 1);
    return clamp(towerDanger * 0.66 + placementOffset * 0.2 + placementAngle * 0.12 + windFactor * 0.12, 0, 1);
  }

  function computePlacementMultiplier() {
    const danger = computeDisplayDanger();
    return 1 + clamp((danger - 0.36) * 1.5, 0, 0.95);
  }

  // World queries
  function getStandingStones() {
    return state.stones.filter((body) => !isFallen(body));
  }

  function getTowerHeight() {
    const standing = getStandingStones();
    if (!standing.length) return 0;
    const topY = Math.min(...standing.map((body) => body.bounds.min.y));
    return Math.max(0, PEDESTAL_TOP_Y - topY);
  }

  function getTowerCenter() {
    const standing = getStandingStones();
    if (!standing.length) return PEDESTAL_CENTER_X;
    const totalArea = standing.reduce((sum, body) => sum + body.area, 0);
    const weightedX = standing.reduce((sum, body) => sum + body.position.x * body.area, 0);
    return weightedX / Math.max(1, totalArea);
  }

  function getSuggestedPreviewY(stone) {
    const bounds = measureVertices(stone.vertices);
    const halfHeight = (bounds.maxY - bounds.minY) * 0.5;
    return clamp(PEDESTAL_TOP_Y - getTowerHeight() - halfHeight - 18, 90, 208);
  }

  function clampPreviewY(targetY, stone) {
    const bounds = measureVertices(stone.vertices);
    const halfHeight = (bounds.maxY - bounds.minY) * 0.5;
    const baseY = getSuggestedPreviewY(stone);
    const minY = Math.max(86, baseY - 88);
    const maxY = Math.min(PEDESTAL_TOP_Y - halfHeight + 6, baseY + 14);
    return clamp(targetY, minY, maxY);
  }

  function measureMotion() {
    const standing = getStandingStones();
    if (!standing.length) {
      return { maxSpeed: 0, maxAngular: 0 };
    }

    return standing.reduce(
      (summary, body) => ({
        maxSpeed: Math.max(summary.maxSpeed, body.speed),
        maxAngular: Math.max(summary.maxAngular, Math.abs(body.angularVelocity))
      }),
      { maxSpeed: 0, maxAngular: 0 }
    );
  }

  function countFallenBodies() {
    return state.stones.filter((body) => isFallen(body)).length;
  }

  function updateFallenFlags() {
    state.fallenCount = countFallenBodies();
  }

  function isFallen(body) {
    return (
      body.position.y > RIVER_THRESHOLD_Y ||
      body.position.x < OUT_OF_BOUNDS_X ||
      body.position.x > WORLD_WIDTH - OUT_OF_BOUNDS_X
    );
  }

  function getStoneById(stoneId) {
    return state.stones.find((body) => body.stoneData?.id === stoneId) || null;
  }

  // Stone generation
  function createStoneSeed() {
    const palette = pick([
      { fill: "#ccc9c1", stroke: "#7b7978" },
      { fill: "#bcc1c8", stroke: "#6d737b" },
      { fill: "#c6c1b9", stroke: "#736d67" },
      { fill: "#acb4bd", stroke: "#626a74" },
      { fill: "#d0cbc4", stroke: "#837d76" }
    ]);

    const generator = pick([
      createFlatStone,
      createRoundStone,
      createTallStone,
      createWedgeStone,
      createChunkStone,
      createTwinStone,
      createNeedleStone,
      createBentStone,
      createPlateStone
    ]);

    return {
      ...generator(),
      fill: palette.fill,
      stroke: palette.stroke
    };
  }

  function createFlatStone() {
    const width = randomRange(92, 132);
    const height = randomRange(24, 40);
    return {
      type: "flat",
      vertices: [
        { x: -width * 0.52, y: -height * 0.15 },
        { x: -width * 0.22, y: -height * 0.56 },
        { x: width * 0.26, y: -height * 0.5 },
        { x: width * 0.52, y: -height * 0.06 },
        { x: width * 0.3, y: height * 0.48 },
        { x: -width * 0.08, y: height * 0.58 },
        { x: -width * 0.48, y: height * 0.22 }
      ]
    };
  }

  function createRoundStone() {
    const radiusX = randomRange(28, 44);
    const radiusY = randomRange(24, 36);
    const vertices = [];
    for (let index = 0; index < 9; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 9;
      const warp = 0.82 + Math.random() * 0.24;
      vertices.push({
        x: Math.cos(angle) * radiusX * warp,
        y: Math.sin(angle) * radiusY * (0.86 + Math.random() * 0.18)
      });
    }
    return { type: "round", vertices };
  }

  function createTallStone() {
    const width = randomRange(42, 62);
    const height = randomRange(70, 106);
    return {
      type: "tall",
      vertices: [
        { x: -width * 0.4, y: -height * 0.5 },
        { x: width * 0.18, y: -height * 0.56 },
        { x: width * 0.46, y: -height * 0.08 },
        { x: width * 0.34, y: height * 0.52 },
        { x: -width * 0.18, y: height * 0.56 },
        { x: -width * 0.48, y: height * 0.06 }
      ]
    };
  }

  function createWedgeStone() {
    const width = randomRange(66, 104);
    const height = randomRange(36, 56);
    return {
      type: "wedge",
      vertices: [
        { x: -width * 0.54, y: height * 0.38 },
        { x: -width * 0.24, y: -height * 0.52 },
        { x: width * 0.48, y: -height * 0.34 },
        { x: width * 0.56, y: height * 0.18 },
        { x: width * 0.16, y: height * 0.56 },
        { x: -width * 0.4, y: height * 0.5 }
      ]
    };
  }

  function createChunkStone() {
    const width = randomRange(72, 108);
    const height = randomRange(46, 72);
    return {
      type: "chunk",
      vertices: [
        { x: -width * 0.44, y: -height * 0.46 },
        { x: width * 0.02, y: -height * 0.6 },
        { x: width * 0.5, y: -height * 0.16 },
        { x: width * 0.42, y: height * 0.46 },
        { x: -width * 0.06, y: height * 0.62 },
        { x: -width * 0.5, y: height * 0.18 }
      ]
    };
  }

  function createTwinStone() {
    const width = randomRange(86, 122);
    const height = randomRange(34, 52);
    return {
      type: "twin",
      vertices: [
        { x: -width * 0.52, y: height * 0.12 },
        { x: -width * 0.32, y: -height * 0.48 },
        { x: -width * 0.06, y: -height * 0.24 },
        { x: width * 0.04, y: -height * 0.56 },
        { x: width * 0.36, y: -height * 0.26 },
        { x: width * 0.54, y: height * 0.14 },
        { x: width * 0.3, y: height * 0.54 },
        { x: -width * 0.28, y: height * 0.58 }
      ]
    };
  }

  function createNeedleStone() {
    const width = randomRange(36, 52);
    const height = randomRange(88, 126);
    return {
      type: "needle",
      vertices: [
        { x: -width * 0.32, y: -height * 0.54 },
        { x: width * 0.14, y: -height * 0.58 },
        { x: width * 0.42, y: -height * 0.12 },
        { x: width * 0.28, y: height * 0.56 },
        { x: -width * 0.18, y: height * 0.6 },
        { x: -width * 0.42, y: height * 0.08 }
      ]
    };
  }

  function createBentStone() {
    const width = randomRange(70, 102);
    const height = randomRange(38, 58);
    return {
      type: "bent",
      vertices: [
        { x: -width * 0.5, y: -height * 0.24 },
        { x: -width * 0.18, y: -height * 0.58 },
        { x: width * 0.08, y: -height * 0.06 },
        { x: width * 0.44, y: -height * 0.44 },
        { x: width * 0.56, y: height * 0.18 },
        { x: width * 0.18, y: height * 0.56 },
        { x: -width * 0.3, y: height * 0.54 }
      ]
    };
  }

  function createPlateStone() {
    const width = randomRange(104, 144);
    const height = randomRange(20, 28);
    return {
      type: "plate",
      vertices: [
        { x: -width * 0.54, y: -height * 0.18 },
        { x: -width * 0.16, y: -height * 0.48 },
        { x: width * 0.28, y: -height * 0.42 },
        { x: width * 0.56, y: -height * 0.06 },
        { x: width * 0.26, y: height * 0.4 },
        { x: -width * 0.28, y: height * 0.48 },
        { x: -width * 0.56, y: height * 0.14 }
      ]
    };
  }

  function createStoneBody(stone, x, y, angle) {
    let body = Bodies.fromVertices(
      x,
      y,
      [stone.vertices],
      {
        label: "stone",
        friction: 0.9,
        frictionStatic: 1.36,
        frictionAir: 0.016,
        restitution: 0.035,
        density: 0.00135,
        sleepThreshold: 52,
        slop: 0.08
      },
      true
    );

    if (Array.isArray(body)) {
      [body] = body;
    }

    Body.setAngle(body, angle);
    body.renderStyle = stone;
    return body;
  }

  // Rendering
  function drawScene() {
    drawBackground();
    drawStaticScenery();
    drawBodies();
    if (state.screen !== "title" && state.mode === "placing" && state.previewStone) {
      drawPreviewStone();
    }
    drawForegroundMist();
    if (state.collapseFlash > 0) {
      context.fillStyle = `rgba(170, 96, 96, ${state.collapseFlash * 0.16})`;
      context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
  }

  function drawBackground() {
    const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    sky.addColorStop(0, "#0d141c");
    sky.addColorStop(0.54, "#080d13");
    sky.addColorStop(1, "#040608");
    context.fillStyle = sky;
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawMoon();
    drawHills();
    drawRiver();
    drawMidFog();
  }

  function drawMoon() {
    const moonX = 760;
    const moonY = 92;
    const halo = context.createRadialGradient(moonX, moonY, 6, moonX, moonY, 90);
    halo.addColorStop(0, "rgba(238, 242, 246, 0.18)");
    halo.addColorStop(0.55, "rgba(194, 208, 220, 0.1)");
    halo.addColorStop(1, "rgba(194, 208, 220, 0)");
    context.fillStyle = halo;
    context.beginPath();
    context.arc(moonX, moonY, 90, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.fillStyle = "rgba(229, 236, 242, 0.84)";
    context.beginPath();
    context.arc(moonX, moonY, 44, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(moonX + 14, moonY - 2, 42, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.strokeStyle = "rgba(208, 221, 233, 0.08)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(690, 442);
    context.quadraticCurveTo(760, 454, 818, 444);
    context.stroke();
    context.restore();
  }

  function drawHills() {
    context.fillStyle = "rgba(32, 42, 52, 0.44)";
    context.beginPath();
    context.moveTo(0, 288);
    context.quadraticCurveTo(126, 246, 286, 278);
    context.quadraticCurveTo(420, 232, 568, 264);
    context.quadraticCurveTo(736, 224, 960, 276);
    context.lineTo(960, 420);
    context.lineTo(0, 420);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(22, 30, 38, 0.68)";
    context.beginPath();
    context.moveTo(0, 352);
    context.quadraticCurveTo(160, 316, 330, 340);
    context.quadraticCurveTo(522, 302, 702, 338);
    context.quadraticCurveTo(824, 316, 960, 346);
    context.lineTo(960, 460);
    context.lineTo(0, 460);
    context.closePath();
    context.fill();
  }

  function drawRiver() {
    const river = context.createLinearGradient(0, 408, 0, WORLD_HEIGHT);
    river.addColorStop(0, "rgba(16, 29, 37, 0.2)");
    river.addColorStop(0.34, "rgba(13, 24, 32, 0.54)");
    river.addColorStop(1, "rgba(7, 12, 16, 0.98)");
    context.fillStyle = river;
    context.fillRect(0, 408, WORLD_WIDTH, WORLD_HEIGHT - 408);

    context.save();
    context.strokeStyle = "rgba(187, 203, 217, 0.055)";
    context.lineWidth = 1;
    for (let index = 0; index < 8; index += 1) {
      const y = 436 + index * 18;
      const drift = Math.sin(state.now / 1800 + index * 0.8) * 18;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(180, y + 7 + drift * 0.08, 360, y - 6, 540, y + 5 + drift * 0.06);
      context.bezierCurveTo(720, y + 12, 860, y - 5 + drift * 0.08, WORLD_WIDTH, y + 6);
      context.stroke();
    }
    context.restore();
  }

  function drawMidFog() {
    context.save();
    for (let index = 0; index < 4; index += 1) {
      const drift = ((state.now * (0.01 + index * 0.004)) % (WORLD_WIDTH + 320)) - 160;
      context.fillStyle = `rgba(216, 225, 234, ${0.03 + index * 0.01})`;
      context.beginPath();
      context.ellipse(drift, 188 + index * 48, 240, 32 + index * 6, 0, 0, Math.PI * 2);
      context.ellipse(drift - 360, 210 + index * 34, 220, 28, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawStaticScenery() {
    context.save();
    context.fillStyle = "#171d24";
    context.beginPath();
    context.moveTo(0, 488);
    context.lineTo(152, 466);
    context.lineTo(310, 458);
    context.lineTo(648, 458);
    context.lineTo(822, 468);
    context.lineTo(WORLD_WIDTH, 490);
    context.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
    context.lineTo(0, WORLD_HEIGHT);
    context.closePath();
    context.fill();

    context.fillStyle = "#242c34";
    roundedRect(context, PEDESTAL_CENTER_X - PEDESTAL_WIDTH / 2, PEDESTAL_TOP_Y, PEDESTAL_WIDTH, 24, 12);
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.06)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(PEDESTAL_CENTER_X - PEDESTAL_WIDTH / 2 + 12, PEDESTAL_TOP_Y + 6);
    context.lineTo(PEDESTAL_CENTER_X + PEDESTAL_WIDTH / 2 - 12, PEDESTAL_TOP_Y + 6);
    context.stroke();
    context.restore();
  }

  function drawBodies() {
    state.stones
      .slice()
      .sort((a, b) => a.position.y - b.position.y)
      .forEach((body) => drawStone(body));
  }

  function drawStone(body) {
    const style = body.renderStyle || { fill: "#c8c4bd", stroke: "#75757a" };
    const alpha = isFallen(body) ? 0.5 : 1;

    context.save();
    context.globalAlpha = alpha;
    context.beginPath();
    context.moveTo(body.vertices[0].x, body.vertices[0].y);
    for (let index = 1; index < body.vertices.length; index += 1) {
      context.lineTo(body.vertices[index].x, body.vertices[index].y);
    }
    context.closePath();

    const gradient = context.createLinearGradient(
      body.bounds.min.x,
      body.bounds.min.y,
      body.bounds.max.x,
      body.bounds.max.y
    );
    gradient.addColorStop(0, style.fill);
    gradient.addColorStop(1, darkenColor(style.fill, 0.24));

    context.fillStyle = gradient;
    context.shadowColor = "rgba(0, 0, 0, 0.26)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 7;
    context.fill();

    context.shadowColor = "transparent";
    context.strokeStyle = style.stroke;
    context.lineWidth = 1.1;
    context.stroke();

    context.globalAlpha = alpha * 0.18;
    context.strokeStyle = "#f2f5f8";
    context.beginPath();
    context.moveTo(body.bounds.min.x + 8, body.bounds.min.y + 6);
    context.lineTo(body.bounds.max.x - 10, body.bounds.min.y + 8);
    context.stroke();
    context.restore();
  }

  function drawPreviewStone() {
    context.save();
    context.translate(state.previewX, state.previewY);
    context.rotate(state.previewAngle);
    context.globalAlpha = 0.58;
    drawStoneShape(context, state.previewStone, true);
    context.restore();

    context.save();
    context.strokeStyle = "rgba(233, 238, 243, 0.14)";
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(state.previewX, state.previewY + 18);
    context.lineTo(state.previewX, PEDESTAL_TOP_Y - getTowerHeight() - 18);
    context.stroke();
    context.restore();
  }

  function drawStoneShape(ctx, stone, previewMode) {
    ctx.beginPath();
    ctx.moveTo(stone.vertices[0].x, stone.vertices[0].y);
    for (let index = 1; index < stone.vertices.length; index += 1) {
      ctx.lineTo(stone.vertices[index].x, stone.vertices[index].y);
    }
    ctx.closePath();
    ctx.fillStyle = previewMode ? "rgba(213, 223, 232, 0.17)" : stone.fill;
    ctx.strokeStyle = previewMode ? "rgba(223, 231, 239, 0.34)" : stone.stroke;
    ctx.lineWidth = previewMode ? 1.2 : 1;
    ctx.fill();
    ctx.stroke();
  }

  function drawForegroundMist() {
    context.save();
    const drift = Math.sin(state.now / 2800) * 24;
    context.globalAlpha = 0.12;
    context.fillStyle = "#dce6ee";
    context.beginPath();
    context.ellipse(220 + drift, 518, 220, 28, 0, 0, Math.PI * 2);
    context.ellipse(620 - drift * 0.7, 536, 260, 30, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function renderNextPreview() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextContext.fillStyle = "rgba(255, 255, 255, 0.02)";
    roundedRect(nextContext, 0, 0, nextCanvas.width, nextCanvas.height, 20);
    nextContext.fill();

    if (!state.nextStone) return;

    const bounds = measureVertices(state.nextStone.vertices);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scale = Math.min(118 / width, 78 / height);

    nextContext.save();
    nextContext.translate(nextCanvas.width * 0.5, nextCanvas.height * 0.54);
    nextContext.scale(scale, scale);
    drawStoneShape(nextContext, state.nextStone, false);
    nextContext.restore();
  }

  // HUD and overlays
  function updateOverlayVisibility() {
    titleScreen.hidden = state.screen !== "title";
    resultScreen.hidden = state.screen !== "result";
    hud.hidden = state.screen === "title";
    sidePanel.hidden = state.screen === "title";

    if (state.screen === "result") {
      resultScore.textContent = String(state.score);
      resultStones.textContent = String(state.placedCount);
      resultHeight.textContent = String(Math.round(state.maxHeight));
      resultNote.textContent = state.statusMessage || "次の一石が、いちばんこわい。";
    }
  }

  function updateHud() {
    stonesValue.textContent = String(state.placedCount);
    heightValue.textContent = String(Math.round(state.maxHeight));
    scoreValue.textContent = String(state.score);
    bestValue.textContent = String(state.bestScore);
    streakValue.textContent = String(state.streak);
    riskValue.textContent = String(state.lastRiskBonus);
    fallenValue.textContent = String(state.fallenCount);
    windValue.textContent = `風 ${state.currentWind.toFixed(2)}`;
    multiplierValue.textContent = `x${state.currentMultiplier.toFixed(2)}`;
    statusText.textContent = state.statusMessage;
    dangerFill.style.width = `${Math.round(state.currentDanger * 100)}%`;
  }

  // Collision and audio
  function handleCollisions(event) {
    if (state.now < state.impactCooldownUntil) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (!isStoneLike(a) && !isStoneLike(b)) continue;
      const impact = a.speed + b.speed;
      if (impact < 0.42) continue;
      audio.impact(impact);
      state.impactCooldownUntil = state.now + 90;
      break;
    }
  }

  function isStoneLike(body) {
    return body.label === "stone" || body.label === "riverbed" || body.label === "pedestal";
  }

  // Utilities
  function readBestScore() {
    try {
      return Number(localStorage.getItem(STORAGE_KEY) || 0);
    } catch (_error) {
      return 0;
    }
  }

  function saveBestScore(score) {
    try {
      localStorage.setItem(STORAGE_KEY, String(score));
    } catch (_error) {
      // ignore storage failures
    }
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function measureVertices(vertices) {
    return vertices.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        maxX: Math.max(bounds.maxX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxY: Math.max(bounds.maxY, point.y)
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
  }

  function darkenColor(hex, amount) {
    const normalized = hex.replace("#", "");
    const value = parseInt(normalized, 16);
    const r = Math.max(0, Math.round(((value >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.round(((value >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.round((value & 255) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function createAudioSystem() {
    let audioContext = null;

    function ensureContext() {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContext = new AudioContextClass();
      }
      return audioContext;
    }

    function burst(frequency, duration, gain, type, detune) {
      const ctx = ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      oscillator.type = type || "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune || 0;
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.linearRampToValueAtTime(gain, now + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(envelope).connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    return {
      unlock() {
        const ctx = ensureContext();
        if (ctx && ctx.state === "suspended") {
          ctx.resume();
        }
      },
      place() {
        burst(178, 0.22, 0.045, "triangle");
        burst(90, 0.3, 0.04, "sine", -10);
      },
      impact(intensity) {
        const gain = clamp(0.012 + intensity * 0.005, 0.01, 0.05);
        burst(120 + intensity * 22, 0.12, gain, "triangle");
      },
      collapse() {
        burst(84, 0.52, 0.085, "triangle");
        burst(42, 0.86, 0.06, "sine", -12);
      }
    };
  }
})();

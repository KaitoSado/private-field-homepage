(function () {
  "use strict";

  const WIDTH = 430;
  const HEIGHT = 760;
  const SAFE_Y = 286;
  const MOUTH = { x: WIDTH * 0.5, y: 548, rx: 132, ry: 110 };
  const STORAGE_KEY = "comb-sweep-best-v1";
  const MAX_SLIPS = 6;
  const MAX_ACTIVE_STRANDS = 26;

  const canvas = document.getElementById("gameCanvas");
  const context = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const titleScreen = document.getElementById("titleScreen");
  const resultScreen = document.getElementById("resultScreen");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const restartButton = document.getElementById("restartButton");

  const rescuedValue = document.getElementById("rescuedValue");
  const slippedValue = document.getElementById("slippedValue");
  const streakValue = document.getElementById("streakValue");
  const bestValue = document.getElementById("bestValue");
  const paceValue = document.getElementById("paceValue");
  const statusValue = document.getElementById("statusValue");

  const resultRescued = document.getElementById("resultRescued");
  const resultStreak = document.getElementById("resultStreak");
  const resultBest = document.getElementById("resultBest");
  const resultNote = document.getElementById("resultNote");

  const input = {
    pointerActive: false,
    pointerX: WIDTH * 0.76,
    pointerY: 170,
    left: false,
    right: false,
    up: false,
    down: false
  };

  const state = {
    screen: "title",
    now: performance.now(),
    lastFrameAt: performance.now(),
    best: readBest(),
    rescued: 0,
    slips: 0,
    streak: 0,
    maxStreak: 0,
    level: 1,
    strands: [],
    particles: [],
    spawnAt: 0,
    slipFlash: 0,
    catchFlash: 0,
    comb: {
      x: WIDTH * 0.76,
      y: 170,
      targetX: WIDTH * 0.76,
      targetY: 170,
      angle: 0.22
    }
  };

  startButton.addEventListener("click", startGame);
  retryButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);

  canvas.addEventListener("pointerdown", handlePointerMove);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerenter", handlePointerMove);
  canvas.addEventListener("pointerleave", () => {
    input.pointerActive = false;
  });

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  updateHud();
  requestAnimationFrame(frame);

  function startGame() {
    state.screen = "game";
    state.now = performance.now();
    state.lastFrameAt = state.now;
    state.rescued = 0;
    state.slips = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.level = 1;
    state.strands = [];
    state.particles = [];
    state.spawnAt = state.now + 380;
    state.slipFlash = 0;
    state.catchFlash = 0;
    state.comb.x = WIDTH * 0.76;
    state.comb.y = 170;
    state.comb.targetX = WIDTH * 0.76;
    state.comb.targetY = 170;
    titleScreen.hidden = true;
    resultScreen.hidden = true;
    hud.hidden = false;
    updateHud();
  }

  function finishGame() {
    state.screen = "result";
    resultRescued.textContent = String(state.rescued);
    resultStreak.textContent = String(state.maxStreak);
    resultBest.textContent = String(state.best);
    resultNote.textContent =
      state.rescued >= 30
        ? "かなりさばけています。後半の引き込みが急です。"
        : state.rescued >= 15
          ? "中盤までは静かでも、後半は一気に寄ってきます。"
          : "最初は浅い位置で拾うと、かなり楽になります。";
    resultScreen.hidden = false;
    hud.hidden = false;
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - state.lastFrameAt) / 1000, 0.032);
    state.lastFrameAt = timestamp;
    state.now = timestamp;

    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function update(delta) {
    updateComb(delta);
    updateParticles(delta);

    if (state.screen !== "game") return;

    state.level = 1 + Math.floor(state.rescued / 12);
    state.slipFlash = Math.max(0, state.slipFlash - delta * 2.4);
    state.catchFlash = Math.max(0, state.catchFlash - delta * 3.2);

    if (state.strands.length < MAX_ACTIVE_STRANDS && state.now >= state.spawnAt) {
      spawnStrand();
      scheduleNextSpawn();
    }

    for (let index = state.strands.length - 1; index >= 0; index -= 1) {
      const strand = state.strands[index];
      updateStrand(strand, delta);

      if (touchesComb(strand)) {
        rescueStrand(strand, index);
        continue;
      }

      if (isInsideMouth(strand) || strand.y > HEIGHT + 90) {
        loseStrand(strand, index);
      }
    }
  }

  function updateComb(delta) {
    const keyboardX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const keyboardY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    if (keyboardX || keyboardY) {
      state.comb.targetX += keyboardX * 280 * delta;
      state.comb.targetY += keyboardY * 240 * delta;
      input.pointerActive = false;
    } else if (input.pointerActive) {
      state.comb.targetX = input.pointerX;
      state.comb.targetY = input.pointerY;
    }

    state.comb.targetX = clamp(state.comb.targetX, 72, WIDTH - 72);
    state.comb.targetY = clamp(state.comb.targetY, 92, SAFE_Y);

    const ease = Math.min(1, delta * 10);
    state.comb.x += (state.comb.targetX - state.comb.x) * ease;
    state.comb.y += (state.comb.targetY - state.comb.y) * ease;
    state.comb.angle = clamp((state.comb.targetX - state.comb.x) * 0.01, -0.28, 0.28) + 0.2;
  }

  function updateParticles(delta) {
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      if (particle.life <= 0) {
        state.particles.splice(index, 1);
      }
    }
  }

  function spawnStrand() {
    const golden = Math.random() < 0.08;
    state.strands.push({
      x: 46 + Math.random() * (WIDTH - 92),
      y: -40 - Math.random() * 80,
      vx: -8 + Math.random() * 16,
      vy: 60 + Math.random() * 34 + state.level * 8,
      length: 28 + Math.random() * 48,
      curve: -16 + Math.random() * 32,
      rotation: -0.8 + Math.random() * 1.6,
      spin: -0.8 + Math.random() * 1.6,
      sway: 1.8 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      golden
    });
  }

  function scheduleNextSpawn() {
    const pace = Math.max(220, 940 - state.level * 56);
    state.spawnAt = state.now + pace + Math.random() * 160;
  }

  function updateStrand(strand, delta) {
    strand.life += delta;
    const depth = clamp((strand.y - 120) / 430, 0, 1);
    const dx = MOUTH.x - strand.x;
    strand.vx += dx * depth * 0.62 * delta;
    strand.vy += (18 + depth * 150 + state.level * 8) * delta;
    strand.x += (strand.vx + Math.sin(strand.life * strand.sway + strand.phase) * 16) * delta;
    strand.y += strand.vy * delta;
    strand.rotation += strand.spin * delta;
  }

  function touchesComb(strand) {
    if (strand.y > SAFE_Y + 70) return false;

    const local = rotatePoint(
      strand.x,
      strand.y,
      state.comb.x,
      state.comb.y,
      -state.comb.angle
    );

    return local.x > -78 && local.x < 76 && local.y > -34 && local.y < 26;
  }

  function isInsideMouth(strand) {
    const dx = (strand.x - MOUTH.x) / MOUTH.rx;
    const dy = (strand.y - (MOUTH.y + 6)) / MOUTH.ry;
    return dx * dx + dy * dy < 1 && strand.y > MOUTH.y - 54;
  }

  function rescueStrand(strand, index) {
    state.strands.splice(index, 1);
    state.rescued += strand.golden ? 3 : 1;
    state.streak += 1;
    state.maxStreak = Math.max(state.maxStreak, state.streak);
    state.catchFlash = 1;

    if (state.rescued > state.best) {
      state.best = state.rescued;
      writeBest(state.best);
    }

    for (let i = 0; i < (strand.golden ? 9 : 6); i += 1) {
      state.particles.push({
        x: strand.x,
        y: strand.y,
        vx: -90 + Math.random() * 180,
        vy: -140 + Math.random() * 90,
        life: 0.38 + Math.random() * 0.24,
        color: strand.golden ? "rgba(255, 220, 166, 0.92)" : "rgba(255, 239, 226, 0.78)"
      });
    }

    updateHud();
  }

  function loseStrand(strand, index) {
    state.strands.splice(index, 1);
    state.slips += 1;
    state.streak = 0;
    state.slipFlash = 1;

    for (let i = 0; i < 7; i += 1) {
      state.particles.push({
        x: strand.x,
        y: Math.min(HEIGHT - 110, strand.y),
        vx: -70 + Math.random() * 140,
        vy: -110 + Math.random() * 60,
        life: 0.34 + Math.random() * 0.26,
        color: "rgba(255, 144, 136, 0.8)"
      });
    }

    updateHud();

    if (state.slips >= MAX_SLIPS) {
      finishGame();
    }
  }

  function draw() {
    context.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackdrop();
    drawMouth();
    drawParticles();
    drawStrands();
    drawComb();
    drawTopGlow();
  }

  function drawBackdrop() {
    const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#6f2b2c");
    gradient.addColorStop(0.24, "#301316");
    gradient.addColorStop(0.65, "#12090b");
    gradient.addColorStop(1, "#050304");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    const haze = context.createRadialGradient(WIDTH * 0.52, HEIGHT * 0.46, 40, WIDTH * 0.5, HEIGHT * 0.48, 290);
    haze.addColorStop(0, "rgba(255, 222, 208, 0.12)");
    haze.addColorStop(1, "rgba(255, 222, 208, 0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    if (state.catchFlash > 0) {
      context.fillStyle = `rgba(255, 240, 230, ${state.catchFlash * 0.06})`;
      context.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (state.slipFlash > 0) {
      context.fillStyle = `rgba(255, 129, 118, ${state.slipFlash * 0.11})`;
      context.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function drawMouth() {
    context.save();
    context.translate(MOUTH.x, MOUTH.y);

    context.fillStyle = "rgba(0, 0, 0, 0.25)";
    context.beginPath();
    context.ellipse(0, 24, MOUTH.rx + 28, MOUTH.ry + 42, 0, 0, Math.PI * 2);
    context.fill();

    const lipGradient = context.createLinearGradient(0, -140, 0, 120);
    lipGradient.addColorStop(0, "#8f2d2e");
    lipGradient.addColorStop(0.42, "#6b1d1f");
    lipGradient.addColorStop(1, "#24090a");
    context.fillStyle = lipGradient;
    context.beginPath();
    context.ellipse(0, 0, MOUTH.rx + 16, MOUTH.ry + 18, 0, 0, Math.PI * 2);
    context.fill();

    const innerGradient = context.createLinearGradient(0, -110, 0, 110);
    innerGradient.addColorStop(0, "#0e0708");
    innerGradient.addColorStop(0.58, "#17090b");
    innerGradient.addColorStop(1, "#321115");
    context.fillStyle = innerGradient;
    context.beginPath();
    context.ellipse(0, 12, MOUTH.rx - 8, MOUTH.ry - 10, 0, 0, Math.PI * 2);
    context.fill();

    const tongueGradient = context.createLinearGradient(0, 20, 0, 150);
    tongueGradient.addColorStop(0, "rgba(202, 67, 72, 0.92)");
    tongueGradient.addColorStop(1, "rgba(88, 17, 20, 0.98)");
    context.fillStyle = tongueGradient;
    context.beginPath();
    context.ellipse(0, 72, MOUTH.rx - 34, MOUTH.ry - 38, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(255, 225, 215, 0.16)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-102, -6);
    context.quadraticCurveTo(0, -42, 104, -4);
    context.stroke();

    context.strokeStyle = "rgba(255, 225, 215, 0.1)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-64, 82);
    context.quadraticCurveTo(0, 52, 64, 84);
    context.stroke();

    context.restore();
  }

  function drawParticles() {
    for (const particle of state.particles) {
      context.strokeStyle = particle.color;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(particle.x - 4, particle.y - 4);
      context.lineTo(particle.x + 4, particle.y + 4);
      context.stroke();
    }
  }

  function drawStrands() {
    for (const strand of state.strands) {
      context.save();
      context.translate(strand.x, strand.y);
      context.rotate(strand.rotation);
      context.strokeStyle = strand.golden ? "#ffdbb4" : "#ffe9dc";
      context.lineWidth = strand.golden ? 2.4 : 2;
      context.shadowColor = strand.golden ? "rgba(255, 208, 160, 0.32)" : "rgba(255, 235, 228, 0.14)";
      context.shadowBlur = strand.golden ? 8 : 4;
      context.beginPath();
      context.moveTo(-strand.length * 0.5, 0);
      context.quadraticCurveTo(0, strand.curve, strand.length * 0.5, 0);
      context.stroke();
      context.restore();
    }
  }

  function drawComb() {
    context.save();
    context.translate(state.comb.x, state.comb.y);
    context.rotate(state.comb.angle);

    const combGradient = context.createLinearGradient(-74, -14, 74, 18);
    combGradient.addColorStop(0, "#121418");
    combGradient.addColorStop(0.5, "#232932");
    combGradient.addColorStop(1, "#0d1014");
    context.fillStyle = combGradient;

    roundRect(context, -74, -14, 148, 28, 14);
    context.fill();

    context.fillStyle = "#0d1014";
    roundRect(context, 30, 10, 54, 18, 9);
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.14)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(-68, -2);
    context.lineTo(58, -2);
    context.stroke();

    context.strokeStyle = "rgba(255, 236, 226, 0.78)";
    context.lineWidth = 1.2;
    for (let tooth = -54; tooth <= 42; tooth += 8) {
      context.beginPath();
      context.moveTo(tooth, 0);
      context.lineTo(tooth - 2, 36);
      context.stroke();
    }

    if (state.catchFlash > 0) {
      context.strokeStyle = `rgba(255, 230, 214, ${0.26 * state.catchFlash})`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(-8, 12, 96, -Math.PI * 0.1, Math.PI * 0.74);
      context.stroke();
    }

    context.restore();
  }

  function drawTopGlow() {
    const glow = context.createLinearGradient(0, 0, 0, 220);
    glow.addColorStop(0, "rgba(255, 233, 223, 0.08)");
    glow.addColorStop(1, "rgba(255, 233, 223, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, WIDTH, 220);
  }

  function updateHud() {
    rescuedValue.textContent = String(state.rescued);
    slippedValue.textContent = `${state.slips} / ${MAX_SLIPS}`;
    streakValue.textContent = String(state.streak);
    bestValue.textContent = String(state.best);
    paceValue.textContent = `x${(1 + (state.level - 1) * 0.18).toFixed(1)}`;
    statusValue.textContent = state.screen === "title"
      ? "待機"
      : state.screen === "result"
        ? "停止"
        : state.level >= 7
          ? "かなり速い"
          : state.level >= 4
            ? "寄ってくる"
            : "静か";
  }

  function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    input.pointerActive = true;
    input.pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    input.pointerY = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowLeft") input.left = true;
    if (event.key === "ArrowRight") input.right = true;
    if (event.key === "ArrowUp") input.up = true;
    if (event.key === "ArrowDown") input.down = true;
    if (event.key === "r" || event.key === "R") startGame();
    if (event.key === "Enter" && state.screen !== "game") startGame();
  }

  function handleKeyUp(event) {
    if (event.key === "ArrowLeft") input.left = false;
    if (event.key === "ArrowRight") input.right = false;
    if (event.key === "ArrowUp") input.up = false;
    if (event.key === "ArrowDown") input.down = false;
  }

  function readBest() {
    try {
      return Number(localStorage.getItem(STORAGE_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rotatePoint(x, y, centerX, centerY, angle) {
    const dx = x - centerX;
    const dy = y - centerY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos
    };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
})();

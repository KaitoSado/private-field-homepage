(function () {
  "use strict";

  const WIDTH = 430;
  const HEIGHT = 760;
  const MAX_HP = 12;
  const STORAGE_KEY = "bounce-arena-best-v1";
  const ARENA = { x: 36, y: 168, w: 358, h: 444 };
  const TEAMS = [
    { id: "blue", label: "青", short: "A", color: "#54c7ff", shadow: "rgba(84, 199, 255, 0.34)" },
    { id: "green", label: "緑", short: "B", color: "#55e286", shadow: "rgba(85, 226, 134, 0.32)" },
    { id: "yellow", label: "黄", short: "C", color: "#ffe35a", shadow: "rgba(255, 227, 90, 0.28)" },
    { id: "red", label: "赤", short: "D", color: "#ff706d", shadow: "rgba(255, 112, 109, 0.3)" }
  ];

  const canvas = document.getElementById("gameCanvas");
  const context = canvas.getContext("2d");
  const titleScreen = document.getElementById("titleScreen");
  const resultScreen = document.getElementById("resultScreen");
  const startButton = document.getElementById("startButton");
  const retryButton = document.getElementById("retryButton");
  const restartButton = document.getElementById("restartButton");
  const pickButtons = Array.from(document.querySelectorAll(".arena-pick"));

  const pickValue = document.getElementById("pickValue");
  const scoreValue = document.getElementById("scoreValue");
  const streakValue = document.getElementById("streakValue");
  const bestValue = document.getElementById("bestValue");
  const roundValue = document.getElementById("roundValue");
  const chaosValue = document.getElementById("chaosValue");
  const statusValue = document.getElementById("statusValue");

  const resultTitle = document.getElementById("resultTitle");
  const resultNote = document.getElementById("resultNote");
  const resultGain = document.getElementById("resultGain");
  const resultTime = document.getElementById("resultTime");
  const resultStreak = document.getElementById("resultStreak");

  const hpTracks = {
    blue: document.getElementById("hpBlue"),
    green: document.getElementById("hpGreen"),
    yellow: document.getElementById("hpYellow"),
    red: document.getElementById("hpRed")
  };

  const state = {
    screen: "title",
    selected: "blue",
    score: 0,
    streak: 0,
    best: readBest(),
    round: 1,
    now: performance.now(),
    lastFrameAt: performance.now(),
    matchStartedAt: 0,
    finishAt: 0,
    shake: 0,
    pulseAt: -1000,
    pulseX: WIDTH / 2,
    pulseY: HEIGHT / 2,
    balls: [],
    bumpers: [],
    hazards: [],
    particles: [],
    winner: null
  };

  startButton.addEventListener("click", startMatch);
  retryButton.addEventListener("click", startMatch);
  restartButton.addEventListener("click", startMatch);

  pickButtons.forEach((button) => {
    button.addEventListener("click", () => setPick(button.dataset.pick));
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.screen !== "game") return;
    const point = getCanvasPoint(event);
    triggerPulse(point.x, point.y);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && state.screen !== "game") {
      startMatch();
      return;
    }

    if (event.key === "r" || event.key === "R") {
      startMatch();
      return;
    }

    const index = Number(event.key) - 1;
    if (index >= 0 && index < TEAMS.length) setPick(TEAMS[index].id);
  });

  setPick(state.selected);
  setupMatch();
  updateHud();
  requestAnimationFrame(frame);

  function setPick(id) {
    if (!TEAMS.some((team) => team.id === id)) return;
    state.selected = id;
    pickButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.pick === id);
    });
    pickValue.textContent = getTeam(id).label;
  }

  function startMatch() {
    setupMatch();
    state.screen = "game";
    state.matchStartedAt = state.now;
    state.finishAt = 0;
    state.winner = null;
    state.round += state.round === 1 && state.score === 0 && state.streak === 0 ? 0 : 1;
    titleScreen.hidden = true;
    resultScreen.hidden = true;
    updateHud();
  }

  function setupMatch() {
    const placements = [
      [ARENA.x + 86, ARENA.y + 96],
      [ARENA.x + ARENA.w - 86, ARENA.y + 92],
      [ARENA.x + 102, ARENA.y + ARENA.h - 104],
      [ARENA.x + ARENA.w - 100, ARENA.y + ARENA.h - 98]
    ].sort(() => Math.random() - 0.5);

    state.balls = TEAMS.map((team, index) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 178 + Math.random() * 74;
      const [x, y] = placements[index];
      return {
        ...team,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 18 + Math.random() * 3,
        hp: MAX_HP,
        alive: true,
        flash: 0,
        hitLock: 0,
        trail: []
      };
    });

    state.bumpers = [
      { x: ARENA.x + ARENA.w * 0.5, y: ARENA.y + 142, r: 24, phase: Math.random() * Math.PI },
      { x: ARENA.x + ARENA.w * 0.34, y: ARENA.y + ARENA.h * 0.62, r: 18, phase: Math.random() * Math.PI },
      { x: ARENA.x + ARENA.w * 0.72, y: ARENA.y + ARENA.h * 0.7, r: 20, phase: Math.random() * Math.PI }
    ];

    state.hazards = [
      { x: ARENA.x + 58, y: ARENA.y + 38, r: 44, power: 1.8 },
      { x: ARENA.x + ARENA.w - 62, y: ARENA.y + ARENA.h - 54, r: 42, power: 1.7 }
    ];

    state.particles = [];
    state.shake = 0;
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
    updateParticles(delta);
    state.shake = Math.max(0, state.shake - delta * 7);

    if (state.screen !== "game") return;

    const elapsed = getElapsed();
    const chaos = getChaos();
    state.bumpers.forEach((bumper, index) => {
      bumper.phase += delta * (0.9 + index * 0.18);
    });

    state.balls.forEach((ball) => {
      if (!ball.alive) return;
      ball.flash = Math.max(0, ball.flash - delta * 5);
      ball.hitLock = Math.max(0, ball.hitLock - delta);
      moveBall(ball, delta, chaos);
      collideWalls(ball, chaos);
      collideBumpers(ball, chaos);
      applyHazards(ball, delta, chaos);
      keepSpeed(ball, chaos);
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) ball.trail.shift();
    });

    collideBalls(chaos);

    if (elapsed > 38) {
      state.balls.forEach((ball) => {
        if (ball.alive) damageBall(ball, delta * 0.24 * chaos, "sudden");
      });
    }

    const alive = state.balls.filter((ball) => ball.alive);
    if (alive.length <= 1) {
      if (!state.finishAt) {
        state.finishAt = state.now + 720;
        state.winner = alive[0] || getLastStandingCandidate();
      }

      if (state.now >= state.finishAt) finishMatch(state.winner);
    }

    updateHud();
  }

  function moveBall(ball, delta, chaos) {
    const drift = Math.sin(state.now * 0.0016 + ball.x * 0.02) * 9 * chaos;
    ball.vx += drift * delta;
    ball.vy += Math.cos(state.now * 0.0013 + ball.y * 0.014) * 6 * delta;
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
  }

  function collideWalls(ball, chaos) {
    const left = ARENA.x;
    const right = ARENA.x + ARENA.w;
    const top = ARENA.y;
    const bottom = ARENA.y + ARENA.h;
    let impact = 0;

    if (ball.x - ball.r < left) {
      ball.x = left + ball.r;
      impact = Math.abs(ball.vx);
      ball.vx = Math.abs(ball.vx) * 1.012;
    } else if (ball.x + ball.r > right) {
      ball.x = right - ball.r;
      impact = Math.abs(ball.vx);
      ball.vx = -Math.abs(ball.vx) * 1.012;
    }

    if (ball.y - ball.r < top) {
      ball.y = top + ball.r;
      impact = Math.max(impact, Math.abs(ball.vy));
      ball.vy = Math.abs(ball.vy) * 1.012;
    } else if (ball.y + ball.r > bottom) {
      ball.y = bottom - ball.r;
      impact = Math.max(impact, Math.abs(ball.vy));
      ball.vy = -Math.abs(ball.vy) * 1.012;
      damageBall(ball, 0.25 * chaos, "spike");
    }

    if (impact > 290) {
      damageBall(ball, (impact - 260) / 820, "wall");
      makeSparks(ball.x, ball.y, ball.color, 5);
    }
  }

  function collideBumpers(ball, chaos) {
    state.bumpers.forEach((bumper) => {
      const dx = ball.x - bumper.x;
      const dy = ball.y - bumper.y;
      const min = ball.r + bumper.r;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= min) return;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = min - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
      ball.vx += nx * 44 * chaos;
      ball.vy += ny * 44 * chaos;
      damageBall(ball, 0.32 * chaos, "bumper");
      makeSparks(ball.x - nx * ball.r, ball.y - ny * ball.r, "#dce8ff", 7);
    });
  }

  function applyHazards(ball, delta, chaos) {
    state.hazards.forEach((hazard) => {
      const dx = ball.x - hazard.x;
      const dy = ball.y - hazard.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > hazard.r + ball.r) return;
      const depth = 1 - dist / (hazard.r + ball.r);
      const nx = dx / dist;
      const ny = dy / dist;
      ball.vx += nx * 70 * depth * delta;
      ball.vy += ny * 70 * depth * delta;
      damageBall(ball, hazard.power * depth * delta * chaos, "hazard");
      if (Math.random() < 0.2) makeSparks(ball.x, ball.y, "#ff706d", 1);
    });
  }

  function collideBalls(chaos) {
    for (let i = 0; i < state.balls.length; i += 1) {
      const a = state.balls[i];
      if (!a.alive) continue;

      for (let j = i + 1; j < state.balls.length; j += 1) {
        const b = state.balls[j];
        if (!b.alive) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= min) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = (min - dist) * 0.5;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const speed = rvx * nx + rvy * ny;
        if (speed > 0) continue;

        const impulse = -(1.02 + chaos * 0.02) * speed * 0.5;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;

        const hit = Math.abs(speed);
        if (hit > 120 && a.hitLock <= 0 && b.hitLock <= 0) {
          const amount = Math.min(1.1, (hit - 90) / 330) * chaos;
          damageBall(a, amount, "ball");
          damageBall(b, amount, "ball");
          a.hitLock = 0.08;
          b.hitLock = 0.08;
          state.shake = Math.min(1, state.shake + amount * 0.12);
          makeSparks((a.x + b.x) / 2, (a.y + b.y) / 2, "#ffffff", 10);
        }
      }
    }
  }

  function keepSpeed(ball, chaos) {
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    const minSpeed = 124 + chaos * 8;
    const maxSpeed = 408 + chaos * 26;

    if (speed < minSpeed) {
      const boost = minSpeed / speed;
      ball.vx *= boost;
      ball.vy *= boost;
    } else if (speed > maxSpeed) {
      const cut = maxSpeed / speed;
      ball.vx *= cut;
      ball.vy *= cut;
    }
  }

  function damageBall(ball, amount, reason) {
    if (!ball.alive || amount <= 0) return;
    ball.hp = Math.max(0, ball.hp - amount);
    ball.flash = Math.min(1, ball.flash + amount * 0.45);
    if (reason !== "sudden") state.shake = Math.min(1, state.shake + amount * 0.035);

    if (ball.hp <= 0) {
      ball.alive = false;
      ball.vx = 0;
      ball.vy = 0;
      makeBurst(ball.x, ball.y, ball.color);
    }
  }

  function triggerPulse(x, y) {
    if (state.now - state.pulseAt < 950) return;
    state.pulseAt = state.now;
    state.pulseX = x;
    state.pulseY = y;
    state.balls.forEach((ball) => {
      if (!ball.alive) return;
      const dx = ball.x - x;
      const dy = ball.y - y;
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.max(0, 1 - dist / 170);
      ball.vx += (dx / dist) * strength * 160;
      ball.vy += (dy / dist) * strength * 160;
    });
    makeSparks(x, y, "#dce8ff", 18);
  }

  function finishMatch(winner) {
    state.screen = "result";
    const hit = winner && winner.id === state.selected;
    const elapsed = getElapsed();
    const gain = hit ? Math.round(140 + Math.max(0, 44 - elapsed) * 3 + state.streak * 26) : 18;
    state.score += gain;
    state.streak = hit ? state.streak + 1 : 0;
    state.best = Math.max(state.best, state.score);
    writeBest(state.best);

    resultTitle.textContent = winner ? `${winner.label}の勝ち` : "引き分け";
    resultNote.textContent = hit
      ? "予想的中。次も流れを読めるか。"
      : winner
        ? `${getTeam(state.selected).label}は届かず。次の試合へ。`
        : "最後が同時に落ちました。もう一戦。";
    resultGain.textContent = `+${gain}`;
    resultTime.textContent = `${elapsed.toFixed(1)}s`;
    resultStreak.textContent = String(state.streak);
    resultScreen.hidden = false;
    updateHud();
  }

  function getLastStandingCandidate() {
    return [...state.balls].sort((a, b) => b.hp - a.hp)[0] || null;
  }

  function updateHud() {
    scoreValue.textContent = String(state.score);
    streakValue.textContent = String(state.streak);
    bestValue.textContent = String(state.best);
    roundValue.textContent = String(state.round);
    chaosValue.textContent = `x${getChaos().toFixed(1)}`;

    const aliveCount = state.balls.filter((ball) => ball.alive).length;
    statusValue.textContent =
      state.screen === "title"
        ? "待機"
        : state.screen === "result"
          ? "決着"
          : aliveCount <= 2
            ? "終盤"
            : getElapsed() > 30
              ? "消耗戦"
              : "試合中";

    state.balls.forEach((ball) => {
      const track = hpTracks[ball.id];
      if (!track) return;
      const full = Math.ceil(ball.hp);
      track.innerHTML = Array.from({ length: MAX_HP }, (_, index) => `<i class="${index < full ? "is-full" : ""}"></i>`).join("");
    });
  }

  function draw() {
    context.save();
    context.clearRect(0, 0, WIDTH, HEIGHT);
    drawBackdrop();

    if (state.shake > 0) {
      const amp = state.shake * 5;
      context.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
    }

    drawArena();
    drawPulse();
    drawParticles();
    state.balls.forEach(drawBall);
    context.restore();
  }

  function drawBackdrop() {
    const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#0b1020");
    gradient.addColorStop(1, "#04060c");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawArena() {
    context.save();
    context.fillStyle = "#070b15";
    context.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);

    context.strokeStyle = "rgba(216, 229, 255, 0.08)";
    context.lineWidth = 1;
    for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 28) {
      context.beginPath();
      context.moveTo(x, ARENA.y);
      context.lineTo(x, ARENA.y + ARENA.h);
      context.stroke();
    }
    for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 28) {
      context.beginPath();
      context.moveTo(ARENA.x, y);
      context.lineTo(ARENA.x + ARENA.w, y);
      context.stroke();
    }

    drawHazards();
    drawBumpers();
    drawSpikes();

    context.strokeStyle = "rgba(235, 242, 255, 0.82)";
    context.lineWidth = 3;
    context.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
    context.strokeStyle = "rgba(84, 199, 255, 0.26)";
    context.lineWidth = 8;
    context.strokeRect(ARENA.x - 2, ARENA.y - 2, ARENA.w + 4, ARENA.h + 4);
    context.restore();
  }

  function drawHazards() {
    state.hazards.forEach((hazard) => {
      const glow = context.createRadialGradient(hazard.x, hazard.y, 2, hazard.x, hazard.y, hazard.r);
      glow.addColorStop(0, "rgba(255, 112, 109, 0.58)");
      glow.addColorStop(1, "rgba(255, 112, 109, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
      context.fill();
    });
  }

  function drawBumpers() {
    state.bumpers.forEach((bumper) => {
      context.save();
      context.translate(bumper.x, bumper.y);
      context.rotate(bumper.phase);
      context.fillStyle = "rgba(216, 229, 255, 0.08)";
      context.strokeStyle = "rgba(216, 229, 255, 0.5)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, bumper.r, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.strokeStyle = "rgba(216, 229, 255, 0.28)";
      context.beginPath();
      context.moveTo(-bumper.r * 0.65, 0);
      context.lineTo(bumper.r * 0.65, 0);
      context.moveTo(0, -bumper.r * 0.65);
      context.lineTo(0, bumper.r * 0.65);
      context.stroke();
      context.restore();
    });
  }

  function drawSpikes() {
    const bottom = ARENA.y + ARENA.h;
    context.fillStyle = "rgba(255, 227, 90, 0.6)";
    for (let x = ARENA.x + 8; x < ARENA.x + ARENA.w - 8; x += 19) {
      context.beginPath();
      context.moveTo(x, bottom - 3);
      context.lineTo(x + 7, bottom - 18);
      context.lineTo(x + 14, bottom - 3);
      context.closePath();
      context.fill();
    }
  }

  function drawPulse() {
    const age = (state.now - state.pulseAt) / 1000;
    if (age < 0 || age > 0.55) return;
    context.strokeStyle = `rgba(216, 229, 255, ${0.5 * (1 - age / 0.55)})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(state.pulseX, state.pulseY, 24 + age * 260, 0, Math.PI * 2);
    context.stroke();
  }

  function drawBall(ball) {
    if (!ball.alive && ball.hp <= 0) return;

    context.save();
    for (let i = 0; i < ball.trail.length; i += 1) {
      const point = ball.trail[i];
      const alpha = (i / ball.trail.length) * 0.18;
      context.fillStyle = hexToRgba(ball.color, alpha);
      context.beginPath();
      context.arc(point.x, point.y, ball.r * (0.52 + i / ball.trail.length * 0.24), 0, Math.PI * 2);
      context.fill();
    }

    context.shadowBlur = 22;
    context.shadowColor = ball.shadow;
    const gradient = context.createRadialGradient(ball.x - ball.r * 0.35, ball.y - ball.r * 0.42, 2, ball.x, ball.y, ball.r * 1.2);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.22, ball.color);
    gradient.addColorStop(1, "#111827");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = ball.flash > 0 ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.56)";
    context.lineWidth = ball.flash > 0 ? 4 : 2;
    context.stroke();

    context.fillStyle = "rgba(2, 4, 10, 0.78)";
    context.font = "700 13px Avenir Next, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(ball.short, ball.x, ball.y + 0.5);
    context.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = hexToRgba(particle.color, alpha);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r * alpha, 0, Math.PI * 2);
      context.fill();
    });
  }

  function updateParticles(delta) {
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      if (particle.life <= 0) state.particles.splice(index, 1);
    }
  }

  function makeSparks(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 130;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 3,
        life: 0.28 + Math.random() * 0.38,
        maxLife: 0.62,
        color
      });
    }
  }

  function makeBurst(x, y, color) {
    makeSparks(x, y, color, 34);
    state.shake = Math.min(1, state.shake + 0.38);
  }

  function getChaos() {
    if (state.screen !== "game") return 1;
    return 1 + Math.min(1.4, getElapsed() / 34);
  }

  function getElapsed() {
    return Math.max(0, (state.now - state.matchStartedAt) / 1000);
  }

  function getTeam(id) {
    return TEAMS.find((team) => team.id === id) || TEAMS[0];
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT
    };
  }

  function readBest() {
    try {
      return Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    } catch {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage may be unavailable in embedded privacy modes.
    }
  }

  function hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
})();

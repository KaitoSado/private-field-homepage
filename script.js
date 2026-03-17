const body = document.body;
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const toTopButton = document.getElementById("to-top");
const filterButtons = document.querySelectorAll(".filter-button");
const workCards = document.querySelectorAll(".work-card");
const reveals = document.querySelectorAll(".reveal");
const cursorOrbit = document.querySelector(".cursor-orbit");
const editToggle = document.getElementById("edit-toggle");
const saveButton = document.getElementById("save-button");
const editableNodes = document.querySelectorAll("[data-editable]");
const contactForm = document.getElementById("contact-form");
const networkCanvas = document.getElementById("network-bg");
const heroCanvas = document.getElementById("hero-shader");
const entranceSection = document.getElementById("entrance");
const heroInteraction = document.getElementById("hero-interaction");
const heroGlow = document.getElementById("hero-glow");
const heroRippleLayer = document.getElementById("hero-ripple-layer");
const storageKey = "private-field-content-v2";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowPowerDevice =
  prefersReducedMotion ||
  window.innerWidth < 680 ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

let isEditMode = false;

function setHeaderState() {
  header.classList.toggle("scrolled", window.scrollY > 14);
  toTopButton.classList.toggle("visible", window.scrollY > 560);
}

function closeMobileMenu() {
  menuToggle?.classList.remove("active");
  menuToggle?.setAttribute("aria-expanded", "false");
  mobileMenu?.classList.remove("open");
  mobileMenu?.setAttribute("aria-hidden", "true");
  body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.classList.toggle("active");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  mobileMenu.classList.toggle("open", isOpen);
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  body.classList.toggle("menu-open", isOpen);
});

document.querySelectorAll(".mobile-nav a, .desktop-nav a").forEach((link) => {
  link.addEventListener("click", closeMobileMenu);
});

toTopButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const activeFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    workCards.forEach((card) => {
      const matches = activeFilter === "all" || card.dataset.category === activeFilter;
      card.classList.toggle("project-hidden", !matches);
    });
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("revealed");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.14, rootMargin: "0px 0px -48px 0px" }
);

reveals.forEach((item) => revealObserver.observe(item));

if (window.matchMedia("(pointer:fine)").matches && cursorOrbit) {
  window.addEventListener("mousemove", (event) => {
    cursorOrbit.style.left = `${event.clientX}px`;
    cursorOrbit.style.top = `${event.clientY}px`;
  });

  document.querySelectorAll("a, button, input, textarea, select, [data-editable]").forEach((node) => {
    node.addEventListener("mouseenter", () => cursorOrbit.classList.add("hovering"));
    node.addEventListener("mouseleave", () => cursorOrbit.classList.remove("hovering"));
  });
}

function loadSavedContent() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;

  try {
    const savedContent = JSON.parse(raw);
    editableNodes.forEach((node) => {
      const key = node.dataset.editable;
      if (savedContent[key]) {
        node.innerHTML = savedContent[key];
      }
    });
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function toggleEditMode() {
  isEditMode = !isEditMode;
  body.classList.toggle("edit-mode", isEditMode);
  saveButton.hidden = !isEditMode;
  editToggle.textContent = isEditMode ? "編集終了" : "編集";

  editableNodes.forEach((node) => {
    node.setAttribute("contenteditable", String(isEditMode));
    node.setAttribute("spellcheck", "false");
  });
}

function saveContent() {
  const nextContent = {};
  editableNodes.forEach((node) => {
    nextContent[node.dataset.editable] = node.innerHTML.trim();
  });

  localStorage.setItem(storageKey, JSON.stringify(nextContent));
  saveButton.textContent = "保存済み";

  window.setTimeout(() => {
    saveButton.textContent = "保存";
  }, 1200);
}

editToggle?.addEventListener("click", toggleEditMode);
saveButton?.addEventListener("click", saveContent);

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const submitButton = contactForm.querySelector(".submit-button");
  const status = contactForm.querySelector(".form-status");
  submitButton.classList.add("loading");
  submitButton.disabled = true;
  status.textContent = "";

  window.setTimeout(() => {
    submitButton.classList.remove("loading");
    submitButton.disabled = false;
    status.textContent = "送信ありがとうございました。24時間以内を目安に返信します。";
    contactForm.reset();
  }, 1300);
});

function initNetworkBackground(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const dprLimit = lowPowerDevice ? 1 : 1.5;
  const state = {
    width: 0,
    height: 0,
    nodes: [],
    edges: [],
    sparks: [],
    impulses: [],
    pointer: { x: 0, y: 0, active: false },
  };
  let rafId = 0;
  let lastFrameTime = 0;
  let lastClientX = 0;
  let lastClientY = 0;
  let lastPointerSpawn = 0;

  function getDocumentHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      window.innerHeight
    );
  }

  function createNodes() {
    const spacing = lowPowerDevice ? 150 : 110;
    const cols = Math.max(4, Math.ceil(state.width / spacing));
    const rows = Math.max(6, Math.ceil(state.height / spacing));
    const jitter = spacing * 0.28;
    const nodes = [];

    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const baseX = (col / cols) * state.width;
        const baseY = (row / rows) * state.height;
        nodes.push({
          x: baseX + (Math.random() - 0.5) * jitter,
          y: baseY + (Math.random() - 0.5) * jitter,
          homeX: baseX,
          homeY: baseY,
          vx: (Math.random() - 0.5) * (lowPowerDevice ? 0.04 : 0.08),
          vy: (Math.random() - 0.5) * (lowPowerDevice ? 0.04 : 0.08),
          r: Math.random() * 1.4 + 0.8,
          tint: Math.random(),
        });
      }
    }

    state.nodes = nodes;
    state.edges = [];

    const indexOf = (row, col) => row * (cols + 1) + col;
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        const current = indexOf(row, col);
        if (col < cols) state.edges.push({ a: current, b: indexOf(row, col + 1) });
        if (row < rows) state.edges.push({ a: current, b: indexOf(row + 1, col) });
        if (col < cols && row < rows && Math.random() > 0.28) {
          state.edges.push({ a: current, b: indexOf(row + 1, col + 1) });
        }
        if (col > 0 && row < rows && Math.random() > 0.72) {
          state.edges.push({ a: current, b: indexOf(row + 1, col - 1) });
        }
      }
    }
    state.sparks = [];
    state.impulses = [];
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, dprLimit);
    state.width = Math.max(1, Math.floor(window.innerWidth));
    state.height = Math.max(1, Math.floor(getDocumentHeight()));
    canvas.width = Math.floor(state.width * ratio);
    canvas.height = Math.floor(state.height * ratio);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    createNodes();
  }

  function draw(time) {
    rafId = 0;
    if (document.hidden) return;
    if (time - lastFrameTime < 40) {
      rafId = window.requestAnimationFrame(draw);
      return;
    }
    const dt = lastFrameTime ? Math.min((time - lastFrameTime) * 0.001, 0.05) : 0.016;
    lastFrameTime = time;

    const nextHeight = getDocumentHeight();
    if (Math.abs(nextHeight - state.height) > 8) {
      resize();
    }

    ctx.clearRect(0, 0, state.width, state.height);
    const t = time * 0.001;

    state.impulses = state.impulses.filter((impulse) => {
      impulse.life -= dt;
      return impulse.life > 0;
    });

    for (const node of state.nodes) {
      node.vx += (node.homeX - node.x) * 0.012;
      node.vy += (node.homeY - node.y) * 0.012;

      for (const impulse of state.impulses) {
        const dx = node.x - impulse.x;
        const dy = node.y - impulse.y;
        const dist = Math.max(16, Math.hypot(dx, dy));
        if (dist > impulse.radius) continue;
        const force = (1 - dist / impulse.radius) * impulse.strength * impulse.life;
        node.vx += (dx / dist) * force * 2.2;
        node.vy += (dy / dist) * force * 2.2;
      }

      node.vx *= 0.92;
      node.vy *= 0.92;
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > state.width) node.vx *= -1;
      if (node.y < 0 || node.y > state.height) node.vy *= -1;
      node.x = Math.max(0, Math.min(state.width, node.x));
      node.y = Math.max(0, Math.min(state.height, node.y));
    }

    const pointerDistance = 180;

    for (const edge of state.edges) {
      const a = state.nodes[edge.a];
      const b = state.nodes[edge.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > (lowPowerDevice ? 180 : 160)) continue;

      let alpha = 0.28;
      let lineWidth = 1.05;

      if (state.pointer.active) {
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const pointerBoost = Math.max(0, 1 - Math.hypot(midX - state.pointer.x, midY - state.pointer.y) / pointerDistance);
        alpha += pointerBoost * 0.14;
        lineWidth += pointerBoost * 0.25;
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(10, 12, 16, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    for (const node of state.nodes) {
      let fill = "rgba(12, 14, 18, 0.38)";
      let radius = node.r + 0.2;

      if (state.pointer.active) {
        const dist = Math.hypot(node.x - state.pointer.x, node.y - state.pointer.y);
        const influence = Math.max(0, 1 - dist / pointerDistance);
        radius += influence * 0.7;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }

    state.sparks = state.sparks.filter((spark) => {
      spark.life -= dt;
      spark.progress += spark.speed * dt * spark.direction;
      return spark.life > 0 && spark.progress >= 0 && spark.progress <= 1;
    });

    for (const spark of state.sparks) {
      const edge = state.edges[spark.edgeIndex];
      if (!edge) continue;
      const a = state.nodes[edge.a];
      const b = state.nodes[edge.b];
      const x = a.x + (b.x - a.x) * spark.progress;
      const y = a.y + (b.y - a.y) * spark.progress;
      const trailProgress = Math.max(0, Math.min(1, spark.progress - 0.18 * spark.direction));
      const trailX = a.x + (b.x - a.x) * trailProgress;
      const trailY = a.y + (b.y - a.y) * trailProgress;
      const alpha = Math.min(1, spark.life * 1.25);
      const flash = Math.max(0, Math.sin((1.0 - spark.life) * 30.0)) * 0.24;
      const dirX = b.x - a.x;
      const dirY = b.y - a.y;
      const dirLen = Math.max(1, Math.hypot(dirX, dirY));
      const ux = dirX / dirLen;
      const uy = dirY / dirLen;
      const nx = -uy;
      const ny = ux;
      const tipX = x + ux * spark.size * 2.4 * spark.direction;
      const tipY = y + uy * spark.size * 2.4 * spark.direction;
      const wingX = x - ux * spark.size * 1.2 * spark.direction;
      const wingY = y - uy * spark.size * 1.2 * spark.direction;
      const leftX = x + nx * spark.size * 1.1;
      const leftY = y + ny * spark.size * 1.1;
      const rightX = x - nx * spark.size * 1.1;
      const rightY = y - ny * spark.size * 1.1;
      const zigX = trailX + (x - trailX) * 0.56 + nx * spark.size * 0.92 * spark.direction;
      const zigY = trailY + (y - trailY) * 0.56 + ny * spark.size * 0.92 * spark.direction;
      const boltColor = spark.color === "red"
        ? `rgba(198, 54, 44, ${0.38 + alpha * 0.58 + flash})`
        : `rgba(220, 182, 88, ${0.36 + alpha * 0.64 + flash})`;
      const glowColor = spark.color === "red"
        ? `rgba(198, 54, 44, ${0.08 + alpha * 0.1})`
        : `rgba(220, 182, 88, ${0.08 + alpha * 0.12})`;

      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(zigX, zigY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = boltColor;
      ctx.lineWidth = spark.size * 1.12;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, leftY);
      ctx.lineTo(wingX, wingY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();
      ctx.fillStyle = spark.color === "red"
        ? `rgba(198, 54, 44, ${0.42 + alpha * 0.62 + flash})`
        : `rgba(220, 182, 88, ${0.4 + alpha * 0.68 + flash})`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(zigX, zigY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = spark.size * 2.2;
      ctx.lineCap = "square";
      ctx.stroke();

      if (spark.flash > 0) {
        const start = spark.direction > 0 ? a : b;
        ctx.beginPath();
        ctx.moveTo(start.x - spark.size * 2.8, start.y - spark.size * 0.9);
        ctx.lineTo(start.x + spark.size * 2.8, start.y + spark.size * 0.9);
        ctx.moveTo(start.x - spark.size * 0.9, start.y + spark.size * 2.8);
        ctx.lineTo(start.x + spark.size * 0.9, start.y - spark.size * 2.8);
        ctx.strokeStyle = spark.color === "red"
          ? `rgba(198, 54, 44, ${0.08 + spark.flash * 0.14})`
          : `rgba(220, 182, 88, ${0.1 + spark.flash * 0.16})`;
        ctx.lineWidth = 1.2 + spark.flash * 1.1;
        ctx.stroke();
        spark.flash *= 0.76;
      }
    }

    rafId = window.requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!rafId) rafId = window.requestAnimationFrame(draw);
  }

  function setPointer(clientX, clientY, active) {
    const prevX = state.pointer.x;
    const prevY = state.pointer.y;
    lastClientX = clientX;
    lastClientY = clientY;
    state.pointer.x = clientX;
    state.pointer.y = clientY + window.scrollY;
    state.pointer.active = active;
    if (active) {
      const dx = state.pointer.x - prevX;
      const dy = state.pointer.y - prevY;
      const speed = Math.min(1.8, Math.hypot(dx, dy) / 22);
      if (speed > 0.08) {
        disturbNetwork(state.pointer.x, state.pointer.y, dx, dy, 170, speed);
        spawnSparksNear(clientX, clientY + window.scrollY, 2, 0.55 + speed * 0.35);
      }
    }
    requestDraw();
  }

  function disturbNetwork(x, y, dx, dy, radius, strength) {
    for (const node of state.nodes) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist > radius) continue;
      const influence = (1 - dist / radius) * strength;
      node.vx += dx * 0.045 * influence;
      node.vy += dy * 0.045 * influence;
    }
  }

  function spawnSparksNear(x, y, count, strength = 1) {
    const candidates = [];

    for (let i = 0; i < state.edges.length; i += 1) {
      const edge = state.edges[i];
      const a = state.nodes[edge.a];
      const b = state.nodes[edge.b];
      const midX = (a.x + b.x) * 0.5;
      const midY = (a.y + b.y) * 0.5;
      const dist = Math.hypot(midX - x, midY - y);
      if (dist < 180) {
        candidates.push({ edgeIndex: i, dist });
      }
    }

    candidates.sort((lhs, rhs) => lhs.dist - rhs.dist);
    const selected = candidates.slice(0, Math.min(candidates.length, lowPowerDevice ? count : count + 2));

    for (let i = 0; i < selected.length; i += 1) {
      const base = selected[i];
      const burst = Math.random() > 0.45 ? 2 : 1;

      for (let j = 0; j < burst; j += 1) {
      state.sparks.push({
        edgeIndex: base.edgeIndex,
        progress: Math.random() > 0.5 ? 0.02 : 0.98,
        speed: (3.2 + Math.random() * 4.2) * (0.95 + strength * 0.95),
        direction: Math.random() > 0.5 ? 1 : -1,
        color: Math.random() > 0.32 ? "gold" : "red",
        size: 1.6 + Math.random() * 1.4 + strength * 0.65,
        life: 0.08 + Math.random() * 0.12,
        flash: 1.0,
      });
      }
    }

    if (state.sparks.length > (lowPowerDevice ? 64 : 140)) {
      state.sparks.splice(0, state.sparks.length - (lowPowerDevice ? 64 : 140));
    }
  }

  resize();
  requestDraw();

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    const now = performance.now();
    if (now - lastPointerSpawn > 55) {
      lastPointerSpawn = now;
      setPointer(event.clientX, event.clientY, true);
    } else {
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY + window.scrollY;
      state.pointer.active = true;
      requestDraw();
    }
  });
  window.addEventListener("mouseleave", () => {
    state.pointer.active = false;
  });
  window.addEventListener(
    "touchmove",
    (event) => {
      if (!event.touches[0]) return;
      setPointer(event.touches[0].clientX, event.touches[0].clientY, true);
    },
    { passive: true }
  );
  window.addEventListener("pointerdown", (event) => {
    state.impulses.push({
      x: event.clientX,
      y: event.clientY + window.scrollY,
      radius: lowPowerDevice ? 180 : 240,
      strength: 0.9,
      life: 0.24,
    });
    disturbNetwork(event.clientX, event.clientY + window.scrollY, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, lowPowerDevice ? 180 : 240, 1.4);
    spawnSparksNear(event.clientX, event.clientY + window.scrollY, lowPowerDevice ? 10 : 18, 1.45);
    requestDraw();
  });
  window.addEventListener("touchend", () => {
    state.pointer.active = false;
  });
  window.addEventListener(
    "scroll",
    () => {
      if (state.pointer.active) {
        state.pointer.x = lastClientX;
        state.pointer.y = lastClientY + window.scrollY;
      }
      requestDraw();
    },
    { passive: true }
  );
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestDraw();
  });

  return { resize };
}

function initHeroShader(canvas) {
  const gl =
    canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: lowPowerDevice ? "low-power" : "high-performance",
      premultipliedAlpha: false,
    }) || canvas.getContext("experimental-webgl");

  if (!gl) {
    body.classList.add("reduced-motion");
    return null;
  }

  const vertexSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision mediump float;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_scroll;
    uniform float u_energy;
    uniform float u_pointer_velocity;
    uniform float u_scroll_velocity;
    uniform float u_impulse;
    uniform vec2 u_pulse_origin;
    uniform float u_click_time;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = p * 2.04 + vec2(1.7, 9.2);
        amplitude *= 0.55;
      }

      return value;
    }

    vec2 hash2(vec2 p) {
      return vec2(hash(p), hash(p + 17.0));
    }

    mat2 rot2d(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c);
    }

    float neuralLines(vec2 p, vec2 flow, float t) {
      vec2 q = p * 5.5 + flow * 1.7;
      float lineA = abs(q.y - sin(q.x * 1.35 + t * 1.5 + fbm(q * 0.8)) * 0.22);
      float lineB = abs(q.x - cos(q.y * 1.15 - t * 1.2 + fbm(q * 0.7 + 3.2)) * 0.24);
      float strandA = smoothstep(0.09, 0.0, lineA);
      float strandB = smoothstep(0.08, 0.0, lineB);
      return max(strandA, strandB);
    }

    float blurredFilament(vec2 p, vec2 flow, float t, float freq, float amp, float thickness, float phase) {
      vec2 q = p * freq + flow * 1.9;
      float line =
        abs(
          q.y -
          sin(q.x * 1.05 + t * (1.1 + phase * 0.12) + fbm(q * 0.42 + phase) * 2.4) * amp -
          cos(q.x * 0.45 - t * 0.8 + phase) * amp * 0.35
        );
      float core = smoothstep(thickness, 0.0, line);
      float halo = smoothstep(thickness * 4.8, 0.0, line);
      return core * 0.7 + halo * 0.45;
    }

    float particleField(vec2 p, vec2 flow, float t) {
      vec2 uv = p * 9.0 + flow * 2.0;
      vec2 cell = floor(uv);
      vec2 f = fract(uv) - 0.5;
      float glow = 0.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 offset = vec2(float(x), float(y));
          vec2 id = cell + offset;
          vec2 rnd = hash2(id);
          vec2 point =
            offset + (rnd - 0.5) * 0.7 +
            0.18 * vec2(
              sin(t * (0.8 + rnd.x * 1.5) + rnd.y * 6.2831),
              cos(t * (0.7 + rnd.y * 1.4) + rnd.x * 6.2831)
            );
          float dist = length(f - point);
          glow += 0.016 / (dist * dist + 0.003 + rnd.x * 0.01);
        }
      }

      return glow;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 p = uv - 0.5;
      p.x *= u_resolution.x / u_resolution.y;

      vec2 mouse = u_mouse - 0.5;
      float t = u_time * 0.16;
      float clickDt = max(u_time - u_click_time, 0.0);
      vec2 clickPoint = (u_pulse_origin - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
      float wavePos = clickDt * 1.9;
      float clickWave =
        (
          smoothstep(wavePos - 0.12, wavePos, length(p - clickPoint)) -
          smoothstep(wavePos, wavePos + 0.12, length(p - clickPoint))
        ) * exp(-clickDt * 1.8);
      float mouseSwirl = exp(-length(p - mouse * 0.9) * 3.0) * (0.45 + u_pointer_velocity * 0.9);
      p = rot2d(mouseSwirl + clickWave * 1.4) * p;

      vec2 flow = vec2(
        fbm(p * 2.6 + vec2(t * 0.8, -t * 0.4)),
        fbm(p * 2.2 + vec2(-t * 0.5, t * 0.7))
      );

      float terrain = fbm(p * 3.8 + flow * 1.6 + mouse * 0.8);
      float ripple = sin(length(p - mouse * 0.55) * 18.0 - u_time * 0.9);
      float waves = sin((p.x * 7.0) + (p.y * 6.2) + terrain * 3.0 - u_time * 0.6);
      float field = terrain + ripple * 0.04 + waves * 0.08 + u_scroll * 0.12;
      float signal = smoothstep(0.24, 0.84, field);
      float gleam = smoothstep(0.42, 1.1, terrain + waves * 0.18 + ripple * 0.06);

      float pointerRadius = exp(-length((p - mouse * 0.9) * vec2(1.15, 1.15)) * (3.8 - u_pointer_velocity * 1.6));
      float pulse = exp(-length((p - (u_pulse_origin - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0)) * 4.5)) * u_impulse;
      float strands = neuralLines(p, flow, t + u_scroll_velocity * 0.4);
      float particles = particleField(p, flow, t * 1.4 + u_pointer_velocity * 1.8);
      float blueFilament = blurredFilament(p + vec2(0.04, -0.02), flow, t * 1.05, 6.4, 0.24, 0.072, 0.0);
      float redFilament = blurredFilament(p + vec2(-0.03, 0.06), flow, t * 0.95, 5.8, 0.22, 0.078, 2.4);
      float yellowFilament = blurredFilament(p + vec2(0.02, 0.01), flow, t * 1.18, 7.2, 0.20, 0.07, 4.6);

      strands *= 0.35 + pointerRadius * 0.85 + pulse * 1.2;
      particles *= 0.18 + u_pointer_velocity * 0.7 + u_scroll_velocity * 0.45 + pulse * 1.4;
      float activation = pointerRadius * (0.22 + u_pointer_velocity * 0.55) + pulse * 0.9 + clickWave * 0.8;
      blueFilament *= 0.72 + pointerRadius * 1.45 + u_pointer_velocity * 0.75 + clickWave * 0.42;
      redFilament *= 0.58 + pointerRadius * 1.08 + u_scroll_velocity * 0.62;
      yellowFilament *= 0.7 + pointerRadius * 1.18 + pulse * 1.05 + u_pointer_velocity * 0.42;

      vec3 base = vec3(0.965, 0.956, 0.936);
      vec3 mist = vec3(0.938, 0.934, 0.922);
      vec3 ink = vec3(0.10, 0.12, 0.16);
      vec3 graphite = vec3(0.20, 0.23, 0.28);
      vec3 gold = vec3(0.90, 0.73, 0.24);
      vec3 amber = vec3(0.82, 0.61, 0.12);
      vec3 blue = vec3(0.10, 0.46, 0.92);
      vec3 red = vec3(0.92, 0.22, 0.24);

      vec3 color = mix(base, mist, signal * 0.28);
      color += gold * signal * 0.08 * u_energy;
      color += amber * gleam * 0.06;
      color -= ink * strands * 0.04;
      color -= graphite * particles * 0.015;
      color += blue * blueFilament * 0.34;
      color += red * redFilament * 0.28;
      color += gold * yellowFilament * 0.26;
      color += blue * particles * 0.04;
      color += blue * activation * 0.15;
      color += blue * pulse * 0.1;
      color += blue * clickWave * 0.22;

      float vignette = smoothstep(1.45, 0.18, length(p * vec2(1.0, 1.16)));
      color = mix(base, color, vignette);

      float grain = (hash(gl_FragCoord.xy + u_time * 0.1) - 0.5) * 0.012;
      gl_FragColor = vec4(color + grain, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    body.classList.add("reduced-motion");
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    body.classList.add("reduced-motion");
    return null;
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const mouseLocation = gl.getUniformLocation(program, "u_mouse");
  const scrollLocation = gl.getUniformLocation(program, "u_scroll");
  const energyLocation = gl.getUniformLocation(program, "u_energy");
  const pointerVelocityLocation = gl.getUniformLocation(program, "u_pointer_velocity");
  const scrollVelocityLocation = gl.getUniformLocation(program, "u_scroll_velocity");
  const impulseLocation = gl.getUniformLocation(program, "u_impulse");
  const pulseOriginLocation = gl.getUniformLocation(program, "u_pulse_origin");
  const clickTimeLocation = gl.getUniformLocation(program, "u_click_time");

  const targetMouse = { x: 0.62, y: 0.42 };
  const pointer = { x: targetMouse.x, y: targetMouse.y };
  const pulseOrigin = { x: targetMouse.x, y: targetMouse.y };
  let pointerVelocity = 0;
  let targetPointerVelocity = 0;
  let scrollVelocity = 0;
  let targetScrollVelocity = 0;
  let impulse = 0;
  let clickTime = -100;
  let lastFrameTime = 0;
  let lastScrollY = window.scrollY;
  let rafId = 0;
  let active = true;

  function resize() {
    const ratio = lowPowerDevice ? 1 : Math.min(window.devicePixelRatio || 1, 1.6);
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function render(time) {
    rafId = 0;

    if (!active || document.hidden) return;

    if (time - lastFrameTime < 33) {
      rafId = window.requestAnimationFrame(render);
      return;
    }
    lastFrameTime = time;

    pointer.x += (targetMouse.x - pointer.x) * 0.035;
    pointer.y += (targetMouse.y - pointer.y) * 0.035;
    pointerVelocity += (targetPointerVelocity - pointerVelocity) * 0.12;
    targetPointerVelocity *= 0.86;
    scrollVelocity += (targetScrollVelocity - scrollVelocity) * 0.14;
    targetScrollVelocity *= 0.84;
    impulse *= 0.92;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.uniform2f(mouseLocation, pointer.x, pointer.y);
    gl.uniform1f(scrollLocation, Math.min(window.scrollY / Math.max(entranceSection.offsetHeight, 1), 1.3));
    gl.uniform1f(energyLocation, lowPowerDevice ? 0.72 : 1.0);
    gl.uniform1f(pointerVelocityLocation, Math.min(pointerVelocity, 1.0));
    gl.uniform1f(scrollVelocityLocation, Math.min(scrollVelocity, 1.0));
    gl.uniform1f(impulseLocation, Math.min(impulse, 1.0));
    gl.uniform2f(pulseOriginLocation, pulseOrigin.x, pulseOrigin.y);
    gl.uniform1f(clickTimeLocation, clickTime);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    rafId = window.requestAnimationFrame(render);
  }

  function requestRender() {
    if (!rafId && active && !document.hidden) {
      rafId = window.requestAnimationFrame(render);
    }
  }

  function onPointerMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    const nextX = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const nextY = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const dx = nextX - targetMouse.x;
    const dy = nextY - targetMouse.y;
    if (inside) {
      targetPointerVelocity = Math.min(1.0, targetPointerVelocity + Math.sqrt(dx * dx + dy * dy) * 10.0);
    }
    targetMouse.x = nextX;
    targetMouse.y = nextY;
    syncHeroGlow(nextX, nextY, inside);
  }

  function triggerImpulse(clientX, clientY, strength = 0.9) {
    const rect = canvas.getBoundingClientRect();
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    if (!inside) return;
    pulseOrigin.x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    pulseOrigin.y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    impulse = Math.min(1.0, impulse + strength);
    clickTime = performance.now() * 0.001;
    targetPointerVelocity = Math.min(1.0, targetPointerVelocity + strength * 0.7);
    spawnHeroRipple(pulseOrigin.x, pulseOrigin.y, strength);
    requestRender();
  }

  resize();
  requestRender();

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    onPointerMove(event.clientX, event.clientY);
    requestRender();
  });
  window.addEventListener(
    "touchmove",
    (event) => {
      if (!event.touches[0]) return;
      onPointerMove(event.touches[0].clientX, event.touches[0].clientY);
      requestRender();
    },
    { passive: true }
  );
  window.addEventListener(
    "touchstart",
    (event) => {
      if (!event.touches[0]) return;
      triggerImpulse(event.touches[0].clientX, event.touches[0].clientY, 0.75);
    },
    { passive: true }
  );
  window.addEventListener("pointerdown", (event) => {
    triggerImpulse(event.clientX, event.clientY, 0.95);
  });
  window.addEventListener(
    "scroll",
    () => {
      const delta = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      targetScrollVelocity = Math.min(1.0, targetScrollVelocity + delta / window.innerHeight);
      requestRender();
    },
    { passive: true }
  );

  const heroObserver = new IntersectionObserver(
    (entries) => {
      active = !!entries[0]?.isIntersecting;
      if (active) requestRender();
    },
    { threshold: 0.02 }
  );

  heroObserver.observe(entranceSection);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestRender();
  });

  return { resize };
}

function syncHeroGlow(x, y, visible) {
  if (!heroGlow || !heroInteraction) return;
  heroGlow.style.left = `${x * 100}%`;
  heroGlow.style.top = `${y * 100}%`;
  heroGlow.classList.toggle("active", visible);
}

function spawnHeroRipple(x, y, strength = 1) {
  if (!heroRippleLayer || lowPowerDevice) return;
  const ripple = document.createElement("span");
  ripple.className = "hero-ripple";
  ripple.style.left = `${x * 100}%`;
  ripple.style.top = `${y * 100}%`;
  ripple.style.animationDuration = `${920 - Math.min(strength, 1) * 180}ms`;
  heroRippleLayer.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}

if (heroCanvas) {
  if (prefersReducedMotion) {
    body.classList.add("reduced-motion");
  } else {
    initHeroShader(heroCanvas);
  }
}

if (networkCanvas) {
  initNetworkBackground(networkCanvas);
}

if (entranceSection && heroGlow && !lowPowerDevice) {
  entranceSection.addEventListener("pointerenter", () => {
    heroGlow.classList.add("active");
  });
  entranceSection.addEventListener("pointerleave", () => {
    heroGlow.classList.remove("active");
  });
}

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", () => {
  if (window.innerWidth > 1080) closeMobileMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeMobileMenu();
  if (isEditMode) toggleEditMode();
});

loadSavedContent();
setHeaderState();

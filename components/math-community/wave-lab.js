"use client";

import { useEffect, useRef, useState } from "react";

const COLORS = {
  bg: "#070b1a",
  bgAlt: "#0c1229",
  surface: "#111833",
  surfaceHover: "#182040",
  border: "#1e2a4a",
  borderLight: "#2a3a6a",
  text: "#e0e6f0",
  textMuted: "#7a8aaa",
  textDim: "#4a5a7a",
  neonCyan: "#00e5ff",
  neonBlue: "#4a9eff",
  neonPurple: "#a855f7",
  neonPink: "#f472b6",
  neonGreen: "#22d3ee",
  neonAmber: "#fbbf24"
};

const MONO_FONT = "'Courier New', 'SF Mono', 'Menlo', monospace";
const DRAW_CANVAS_WIDTH = 600;
const DRAW_CANVAS_HEIGHT = 400;
const DRAW_PRESETS = [
  { id: "star", icon: "★", label: "星" },
  { id: "heart", icon: "♥", label: "ハート" },
  { id: "spiral", icon: "🌀", label: "渦巻き" },
  { id: "face", icon: "☺", label: "顔" },
  { id: "infinity", icon: "∞", label: "無限" }
];
const WAVE_MODES = [
  { id: "draw", icon: "✎", label: "Draw", sub: "描く", color: COLORS.neonCyan },
  { id: "orbit", icon: "◎", label: "Orbit", sub: "回す", color: COLORS.neonPurple },
  { id: "analyze", icon: "≋", label: "Analyze", sub: "分解する", color: COLORS.neonBlue }
];
const PLACEHOLDER_META = {
  orbit: {
    icon: "◎",
    title: "Coming Soon",
    subtitle: "Phase 2 で実装予定",
    color: COLORS.neonPurple
  },
  analyze: {
    icon: "≋",
    title: "Coming Soon",
    subtitle: "Phase 3 で実装予定",
    color: COLORS.neonBlue
  }
};

export function WaveLab() {
  const [mode, setMode] = useState("draw");
  const [drawnPoints, setDrawnPoints] = useState(null);

  function handleDrawFinish(rawPoints) {
    const resampled = resamplePath(rawPoints, 256);
    setDrawnPoints(resampled);
    setMode("orbit");
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100vh - 220px)",
        width: "100%",
        overflow: "hidden",
        borderRadius: 20,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bg,
        boxShadow: "0 30px 80px rgba(4, 8, 24, 0.45)",
        fontFamily: MONO_FONT,
        color: COLORS.text
      }}
    >
      <ParticleBG />

      <div style={{ position: "relative", zIndex: 10, display: "flex", minHeight: "calc(100vh - 220px)", flexDirection: "column" }}>
        <Header mode={mode} onModeChange={setMode} />
        <StatusMessage color={mode === "draw" ? COLORS.neonCyan : WAVE_MODES.find((item) => item.id === mode)?.color}>
          {buildWaveStatus(mode, drawnPoints)}
        </StatusMessage>

        <main style={{ flex: 1, padding: 16, display: "flex" }}>
          {mode === "draw" ? <DrawMode onFinish={handleDrawFinish} /> : null}
          {mode === "orbit" ? <ModePlaceholder mode="orbit" points={drawnPoints} /> : null}
          {mode === "analyze" ? <ModePlaceholder mode="analyze" points={drawnPoints} /> : null}
        </main>

        <Footer mode={mode} />
      </div>
    </div>
  );
}

function Header({ mode, onModeChange }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 18px",
        background: "rgba(7, 11, 26, 0.85)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${COLORS.border}`
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <strong style={{ color: COLORS.neonCyan, fontSize: 18, fontWeight: 700, letterSpacing: "0.08em" }}>Wave Lab</strong>
        <span style={{ color: COLORS.textDim, fontSize: 11, letterSpacing: "0.08em" }}>波の実験室</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
        {WAVE_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            style={{
              border: `1px solid ${mode === item.id ? `${item.color}77` : COLORS.border}`,
              background: mode === item.id ? `${item.color}22` : "transparent",
              color: mode === item.id ? item.color : COLORS.textMuted,
              borderRadius: 8,
              padding: "6px 14px",
              display: "grid",
              gap: 1,
              minWidth: 86,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: mode === item.id ? `0 0 12px ${item.color}33` : "none"
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontSize: 9, color: mode === item.id ? COLORS.text : COLORS.textDim }}>{item.sub}</span>
          </button>
        ))}
      </div>
    </header>
  );
}

function DrawMode({ onFinish }) {
  const [rawPoints, setRawPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [status, setStatus] = useState("好きなループを描いてみましょう。プリセットも試せます。");
  const drawCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawDrawCanvas(context, rawPoints, isDrawing);
  }, [isDrawing, rawPoints]);

  useEffect(() => {
    if (isDrawing) {
      setStatus("そのまま…いい形ですね");
      return;
    }
    if (rawPoints.length >= 10) {
      setStatus("この線に魔法をかけると、中身が見えてきます");
      return;
    }
    setStatus("好きなループを描いてみましょう。プリセットも試せます。");
  }, [isDrawing, rawPoints.length]);

  const canCastMagic = rawPoints.length >= 10;

  function resetDrawing() {
    setRawPoints([]);
    setSelectedPreset(null);
    setIsDrawing(false);
  }

  function loadPreset(presetId) {
    const generated = generatePresetPath(presetId);
    setRawPoints(generated);
    setSelectedPreset(presetId);
    setIsDrawing(false);
  }

  function beginStroke(event) {
    const point = eventToCenteredCanvasPoint(event, drawCanvasRef.current);
    if (!point) return;
    event.preventDefault();
    setSelectedPreset(null);
    setIsDrawing(true);
    setRawPoints([point]);
  }

  function extendStroke(event) {
    if (!isDrawing) return;
    const point = eventToCenteredCanvasPoint(event, drawCanvasRef.current);
    if (!point) return;
    event.preventDefault();
    setRawPoints((current) => {
      const last = current[current.length - 1];
      if (last && Math.hypot(last.x - point.x, last.y - point.y) < 2.5) return current;
      return [...current, point];
    });
  }

  function finishStroke(event) {
    if (!isDrawing) return;
    event?.preventDefault?.();
    setIsDrawing(false);
  }

  return (
    <PlayLayout
      canvasArea={
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <canvas
            ref={drawCanvasRef}
            width={DRAW_CANVAS_WIDTH}
            height={DRAW_CANVAS_HEIGHT}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              borderRadius: 12,
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`,
              touchAction: "none",
              cursor: isDrawing ? "crosshair" : "cell"
            }}
            onPointerDown={beginStroke}
            onPointerMove={extendStroke}
            onPointerUp={finishStroke}
            onPointerLeave={finishStroke}
            onPointerCancel={finishStroke}
          />
          <MissionHint text="描いた線がフーリエ変換の素材になります" color={COLORS.neonCyan} />
        </div>
      }
      controlPanel={
        <ControlPanel title="Draw" subtitle="自由な線を描いて中身を見る">
          <PresetSelector presets={DRAW_PRESETS} selected={selectedPreset} onSelect={loadPreset} color={COLORS.neonCyan} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <GlowButton color={COLORS.borderLight} onClick={resetDrawing} small>
              描き直す
            </GlowButton>
            <GlowButton color={COLORS.neonPurple} onClick={() => onFinish(rawPoints)} disabled={!canCastMagic}>
              ✦ 魔法をかける →
            </GlowButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <ValueCard label="点の数" value={rawPoints.length} color={COLORS.neonCyan} />
            <ValueCard label="状態" value={isDrawing ? "描画中" : rawPoints.length >= 10 ? "準備完了" : "待機中"} color={isDrawing ? COLORS.neonPink : COLORS.textMuted} />
          </div>

          <StatusMessage color={COLORS.neonCyan}>{status}</StatusMessage>

          <PlayPauseResetBar
            onReset={resetDrawing}
            resetLabel="キャンバスを空にする"
          />
        </ControlPanel>
      }
      footer="描いた線がフーリエ変換の素材になります"
    />
  );
}

function ModePlaceholder({ mode, points }) {
  const meta = PLACEHOLDER_META[mode];
  return (
    <PlayLayout
      canvasArea={
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.bgAlt,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: 10
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 64, lineHeight: 1, color: meta.color, textShadow: `0 0 24px ${meta.color}55` }}>{meta.icon}</span>
            <strong style={{ fontSize: 16, color: COLORS.textMuted }}>{meta.title}</strong>
            <span style={{ fontSize: 12, color: COLORS.textDim }}>{meta.subtitle}</span>
          </div>
        </div>
      }
      controlPanel={
        <ControlPanel title={mode === "orbit" ? "Orbit" : "Analyze"} subtitle={points?.length ? `${points.length} 点の素材を受け取りました` : "まだ素材がありません"}>
          <StatusMessage color={meta.color}>
            {mode === "orbit"
              ? "Phase 2 では、描いた線が回転する円の列に変身します。"
              : "Phase 3 では、波形を成分ごとに分解してフィルタできます。"}
          </StatusMessage>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <ValueCard label="素材点" value={points?.length || 0} color={meta.color} />
            <ValueCard label="状態" value="Coming Soon" color={COLORS.textMuted} />
          </div>
        </ControlPanel>
      }
      footer={mode === "orbit" ? "描いた形が、回転する部品へ変わる予定です" : "波をほどいて、中の成分を見る予定です"}
    />
  );
}

function PlayLayout({ canvasArea, controlPanel, footer }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 16, width: "100%", position: "relative" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 16,
          alignItems: "stretch"
        }}
      >
        <div style={{ minHeight: 0 }}>{canvasArea}</div>
        <div style={{ minHeight: 0 }}>{controlPanel}</div>
      </div>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 36,
          padding: "10px 14px",
          borderTop: `1px solid ${COLORS.border}`,
          background: "rgba(7, 11, 26, 0.85)",
          color: COLORS.textDim,
          fontSize: 10,
          letterSpacing: "0.08em"
        }}
      >
        {footer}
      </footer>
    </div>
  );
}

function ControlPanel({ title, subtitle, children }) {
  return (
    <aside
      style={{
        display: "grid",
        gap: 14,
        alignContent: "start",
        minHeight: 0,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        padding: 16
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong style={{ color: COLORS.text, fontSize: 14, letterSpacing: "0.08em" }}>{title}</strong>
        <span style={{ color: COLORS.textDim, fontSize: 11, lineHeight: 1.5 }}>{subtitle}</span>
      </div>
      {children}
    </aside>
  );
}

function ParticleBG() {
  const canvasRef = useRef(null);
  const animationRef = useRef(0);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");

    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = buildParticles(width, height, 60);
    }

    function frame() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);
      drawParticleGrid(context, width, height);
      updateAndDrawParticles(context, particlesRef.current, width, height);
      animationRef.current = requestAnimationFrame(frame);
    }

    resize();
    frame();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%" }} aria-hidden="true" />;
}

function StatusMessage({ children, color = COLORS.textMuted }) {
  return (
    <div
      style={{
        minHeight: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 16px",
        color,
        fontSize: 13,
        fontStyle: "italic",
        letterSpacing: "0.02em",
        textAlign: "center"
      }}
    >
      {children || ""}
    </div>
  );
}

function GlowButton({ children, onClick, color, small = false, disabled = false, active = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        borderRadius: 8,
        border: `1px solid ${active ? color : color || COLORS.border}`,
        background: active ? `${color}22` : "transparent",
        color: color || COLORS.text,
        boxShadow: active ? `0 0 12px ${color}33` : "none",
        padding: small ? "7px 10px" : "10px 14px",
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.2s ease"
      }}
    >
      {children}
    </button>
  );
}

function NeonSlider({ label, value, min, max, step, onChange, color }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "60px minmax(0, 1fr) 36px", gap: 10, alignItems: "center" }}>
      <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: color }}
      />
      <span style={{ color: color, fontSize: 11, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</span>
    </label>
  );
}

function PresetSelector({ presets, selected, onSelect, color }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {presets.map((preset) => (
        <GlowButton key={preset.id} small color={color} active={selected === preset.id} onClick={() => onSelect(preset.id)}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
          </span>
        </GlowButton>
      ))}
    </div>
  );
}

function MissionHint({ text, color }) {
  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, pointerEvents: "none" }}>
      <span
        style={{
          display: "inline-flex",
          padding: "8px 10px",
          borderRadius: 10,
          background: "rgba(7, 11, 26, 0.72)",
          border: `1px solid ${COLORS.border}`,
          color: color || COLORS.textMuted,
          fontSize: 11,
          lineHeight: 1.4,
          letterSpacing: "0.03em"
        }}
      >
        {text}
      </span>
    </div>
  );
}

function PlayPauseResetBar({ isRunning, onToggleRun, onReset, onRandom, runLabel = "再生", stopLabel = "停止", resetLabel = "リセット", randomLabel = "ランダム" }) {
  if (!onToggleRun && !onReset && !onRandom) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {onRandom ? (
        <GlowButton color={COLORS.neonAmber} small onClick={onRandom}>
          {randomLabel}
        </GlowButton>
      ) : null}
      {onReset ? (
        <GlowButton color={COLORS.borderLight} small onClick={onReset}>
          {resetLabel}
        </GlowButton>
      ) : null}
      {onToggleRun ? (
        <GlowButton color={COLORS.neonGreen} small onClick={onToggleRun}>
          {isRunning ? stopLabel : runLabel}
        </GlowButton>
      ) : null}
    </div>
  );
}

function ValueCard({ label, value, color = COLORS.text }) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${COLORS.border}`,
        background: "rgba(255, 255, 255, 0.02)",
        padding: "10px 12px",
        display: "grid",
        gap: 4
      }}
    >
      <span style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: "0.08em" }}>{label}</span>
      <strong style={{ color, fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>{value}</strong>
    </div>
  );
}

function Footer({ mode }) {
  const hint =
    mode === "draw"
      ? "描いた線がフーリエ変換の素材になります"
      : mode === "orbit"
        ? "回転する部品たちが、描いた形を作ります"
        : "波を成分ごとに分けると、隠れた秩序が見えてきます";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 34,
        padding: "8px 16px",
        background: "rgba(7,11,26,0.85)",
        borderTop: `1px solid ${COLORS.border}`,
        color: COLORS.textDim,
        fontSize: 10,
        letterSpacing: "0.08em"
      }}
    >
      {hint}
    </div>
  );
}

function buildWaveStatus(mode, drawnPoints) {
  if (mode === "draw") {
    return drawnPoints?.length ? "別の形を描くと、別の中身が現れます。" : "好きなループを描いてみましょう。プリセットも試せます。";
  }
  if (mode === "orbit") {
    return drawnPoints?.length ? "この線に魔法をかけた先を、次の段階で見せます。" : "まずは Draw で形を作ると、ここで中身が見える予定です。";
  }
  return drawnPoints?.length ? "同じ形でも、成分に分けると違う見え方になります。" : "Draw で素材を用意すると、分解モードの準備ができます。";
}

function eventToCenteredCanvasPoint(event, canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * DRAW_CANVAS_WIDTH - DRAW_CANVAS_WIDTH / 2;
  const y = ((event.clientY - rect.top) / rect.height) * DRAW_CANVAS_HEIGHT - DRAW_CANVAS_HEIGHT / 2;
  return { x, y };
}

function drawDrawCanvas(context, points, isDrawing) {
  context.clearRect(0, 0, DRAW_CANVAS_WIDTH, DRAW_CANVAS_HEIGHT);
  context.save();
  context.translate(DRAW_CANVAS_WIDTH / 2, DRAW_CANVAS_HEIGHT / 2);

  context.strokeStyle = COLORS.border;
  context.lineWidth = 0.5;
  context.beginPath();
  context.moveTo(-DRAW_CANVAS_WIDTH / 2, 0);
  context.lineTo(DRAW_CANVAS_WIDTH / 2, 0);
  context.moveTo(0, -DRAW_CANVAS_HEIGHT / 2);
  context.lineTo(0, DRAW_CANVAS_HEIGHT / 2);
  context.stroke();

  if (points.length >= 2) {
    context.lineWidth = 4;
    context.strokeStyle = "rgba(0,229,255,0.18)";
    context.shadowColor = COLORS.neonCyan;
    context.shadowBlur = 12;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    if (!isDrawing) context.closePath();
    context.stroke();

    context.shadowBlur = 0;
    context.lineWidth = 2;
    context.strokeStyle = COLORS.neonCyan;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    if (!isDrawing) context.closePath();
    context.stroke();

    const tail = points[points.length - 1];
    context.fillStyle = COLORS.neonPink;
    context.shadowColor = COLORS.neonPink;
    context.shadowBlur = 10;
    context.beginPath();
    context.arc(tail.x, tail.y, 4, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function buildParticles(width, height, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    radius: 0.3 + Math.random() * 1.2,
    alpha: 0.1 + Math.random() * 0.3
  }));
}

function drawParticleGrid(context, width, height) {
  context.save();
  context.strokeStyle = "rgba(30,42,74,0.25)";
  context.lineWidth = 0.5;
  for (let x = 0; x <= width; x += 60) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 60) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function updateAndDrawParticles(context, particles, width, height) {
  context.save();
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.x < 0) particle.x += width;
    if (particle.x > width) particle.x -= width;
    if (particle.y < 0) particle.y += height;
    if (particle.y > height) particle.y -= height;
    context.fillStyle = `rgba(100, 140, 200, ${particle.alpha})`;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

export function computeDFT(points, maxN) {
  const samples = points.length;
  if (!samples) return [];
  const half = Math.floor(maxN / 2);
  const coeffs = [];

  for (let freq = -half; freq <= half; freq += 1) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < samples; n += 1) {
      const angle = (-2 * Math.PI * freq * n) / samples;
      const x = points[n].x;
      const y = points[n].y;
      re += x * Math.cos(angle) - y * Math.sin(angle);
      im += x * Math.sin(angle) + y * Math.cos(angle);
    }
    re /= samples;
    im /= samples;
    coeffs.push({
      freq,
      re,
      im,
      amp: Math.hypot(re, im),
      phase: Math.atan2(im, re)
    });
  }

  return coeffs.sort((left, right) => right.amp - left.amp);
}

export function getEpicyclePositions(coeffs, numCoeffs, t) {
  const circles = [];
  let x = 0;
  let y = 0;
  coeffs.slice(0, numCoeffs).forEach((coeff) => {
    const angle = coeff.freq * t + coeff.phase;
    const radius = coeff.amp;
    const nx = x + radius * Math.cos(angle);
    const ny = y + radius * Math.sin(angle);
    circles.push({
      cx: x,
      cy: y,
      r: radius,
      nx,
      ny,
      freq: coeff.freq,
      angle
    });
    x = nx;
    y = ny;
  });
  return { circles, tip: { x, y } };
}

export function reconstructFromCoeffs(coeffs, numCoeffs, numPoints) {
  const points = [];
  for (let index = 0; index < numPoints; index += 1) {
    const t = (index / numPoints) * Math.PI * 2;
    points.push(getEpicyclePositions(coeffs, numCoeffs, t).tip);
  }
  return points;
}

export function computeSignalDFT(signal) {
  const samples = signal.length;
  if (!samples) return [];
  const spectrum = [];
  for (let freq = 0; freq < samples; freq += 1) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < samples; n += 1) {
      const angle = (-2 * Math.PI * freq * n) / samples;
      re += signal[n] * Math.cos(angle);
      im += signal[n] * Math.sin(angle);
    }
    re /= samples;
    im /= samples;
    spectrum.push({
      freq,
      re,
      im,
      amp: Math.hypot(re, im),
      phase: Math.atan2(im, re)
    });
  }
  return spectrum;
}

export function reconstructSignal(spectrum, samples, mask) {
  const output = [];
  for (let n = 0; n < samples; n += 1) {
    let value = 0;
    spectrum.forEach((component, index) => {
      if (mask && mask[index] === false) return;
      const angle = (2 * Math.PI * component.freq * n) / samples;
      value += component.re * Math.cos(angle) - component.im * Math.sin(angle);
    });
    output.push(value);
  }
  return output;
}

export function generatePresetPath(name) {
  const samples = 256;
  const points = [];
  for (let index = 0; index < samples; index += 1) {
    const t = (index / samples) * Math.PI * 2;
    let x = 0;
    let y = 0;

    if (name === "star") {
      const radius = index % 2 === 0 ? 120 : 55;
      const angle = (index / samples) * Math.PI * 10 - Math.PI / 2;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    } else if (name === "heart") {
      x = 9.5 * 12 * Math.sin(t) ** 3;
      y = -8 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    } else if (name === "spiral") {
      const loops = 2.6;
      const radius = 18 + index * 0.55;
      const angle = loops * t;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    } else if (name === "face") {
      const angle = t;
      x = Math.cos(angle) * 120;
      y = Math.sin(angle) * 120;
      if (index > samples * 0.12 && index < samples * 0.2) {
        x = -38 + Math.cos(angle * 6) * 10;
        y = -36 + Math.sin(angle * 6) * 10;
      } else if (index > samples * 0.28 && index < samples * 0.36) {
        x = 38 + Math.cos(angle * 6) * 10;
        y = -36 + Math.sin(angle * 6) * 10;
      } else if (index > samples * 0.58 && index < samples * 0.86) {
        const mouthT = (index - samples * 0.58) / (samples * 0.28);
        x = -55 + mouthT * 110;
        y = 35 + Math.sin(mouthT * Math.PI) * 24;
      }
    } else {
      x = Math.sin(t) * 130;
      y = Math.sin(t * 2) * 70;
    }

    points.push({ x, y });
  }
  return resamplePath(points, 256);
}

export const SIGNAL_PRESETS = {
  "Simple wave": (n, total) => Math.sin((2 * Math.PI * n) / total),
  Chord: (n, total) =>
    0.7 * Math.sin((2 * Math.PI * n) / total) +
    0.35 * Math.sin((4 * Math.PI * n) / total) +
    0.18 * Math.sin((7 * Math.PI * n) / total),
  "Square wave": (n, total) =>
    Math.sin((2 * Math.PI * n) / total) +
    Math.sin((6 * Math.PI * n) / total) / 3 +
    Math.sin((10 * Math.PI * n) / total) / 5,
  Sawtooth: (n, total) =>
    Math.sin((2 * Math.PI * n) / total) +
    Math.sin((4 * Math.PI * n) / total) / 2 +
    Math.sin((6 * Math.PI * n) / total) / 3,
  "Noisy wave": (n, total) =>
    Math.sin((2 * Math.PI * n) / total) * 0.85 + (Math.random() - 0.5) * 0.35,
  Pulse: (n, total) => (n % total < total * 0.1 ? 1 : 0)
};

export function resamplePath(rawPoints, targetN = 256) {
  if (!rawPoints || rawPoints.length < 2) return rawPoints || [];
  const closed = [...rawPoints, rawPoints[0]];
  const lengths = [0];
  for (let index = 1; index < closed.length; index += 1) {
    const prev = closed[index - 1];
    const next = closed[index];
    lengths[index] = lengths[index - 1] + Math.hypot(next.x - prev.x, next.y - prev.y);
  }
  const totalLength = lengths[lengths.length - 1];
  if (totalLength < 1e-6) return rawPoints.slice(0, targetN);

  const result = [];
  for (let step = 0; step < targetN; step += 1) {
    const distance = (step / targetN) * totalLength;
    let segmentIndex = 1;
    while (segmentIndex < lengths.length && lengths[segmentIndex] < distance) {
      segmentIndex += 1;
    }
    const start = closed[segmentIndex - 1];
    const end = closed[segmentIndex];
    const segmentStart = lengths[segmentIndex - 1];
    const segmentLength = lengths[segmentIndex] - segmentStart || 1;
    const ratio = (distance - segmentStart) / segmentLength;
    result.push({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    });
  }
  return result;
}

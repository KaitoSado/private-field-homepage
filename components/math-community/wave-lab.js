"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
const TRACE_GUIDE = {
  id: "grok-line-art",
  label: "線画から始める",
  src: "/wave-lab-assets/grok-line-art.png"
};
const WAVE_MODES = [
  { id: "draw", icon: "✎", label: "Draw", sub: "描く", color: COLORS.neonCyan },
  { id: "orbit", icon: "◎", label: "Orbit", sub: "回す", color: COLORS.neonPurple },
  { id: "analyze", icon: "≋", label: "Analyze", sub: "分解する", color: COLORS.neonBlue }
];
const ORBIT_MISSIONS = [
  "少ない円だけで元の絵っぽくしてみよう",
  "一番影響の大きい円を見つけてみよう",
  "ぼんやり側にして抽象アートを作ろう",
  "円 1 つだけにするとどうなる？"
];
const ANALYZE_PRESETS = [
  { id: "Simple wave", label: "単純波" },
  { id: "Chord", label: "和音" },
  { id: "Square wave", label: "矩形波" },
  { id: "Sawtooth", label: "鋸歯波" },
  { id: "Noisy wave", label: "ノイズ入り" },
  { id: "Pulse", label: "パルス" }
];
const ANALYZE_MISSIONS = {
  "Noisy wave": "ノイズ入り波形からノイズを除去してみよう",
  "Square wave": "矩形波の一番大事な成分だけ残してみよう",
  default: "どのピークが形を決めているか見抜こう"
};

export function WaveLab() {
  const [mode, setMode] = useState("draw");
  const [drawnPoints, setDrawnPoints] = useState(null);
  const [statusText, setStatusText] = useState(buildWaveStatus("draw", null));

  function handleDrawFinish(rawPoints) {
    let resampled = rawPoints.some((point) => point.hiddenBefore)
      ? resamplePathWithBreaks(rawPoints, 512)
      : resamplePath(rawPoints, 256);
    if (rawPoints.preserveDensity) {
      resampled = rawPoints.some((point) => point.hiddenBefore)
        ? densifyPathWithBreaks(rawPoints, rawPoints.densityStep || 2.4)
        : densifyPath(rawPoints, rawPoints.densityStep || 2.4);
    }
    if (rawPoints.sourceImage) {
      resampled.sourceImage = rawPoints.sourceImage;
    }
    if (rawPoints.strokeCount) {
      resampled.strokeCount = rawPoints.strokeCount;
    }
    setDrawnPoints(resampled);
    setMode("orbit");
  }

  useEffect(() => {
    setStatusText(buildWaveStatus(mode, drawnPoints));
  }, [mode, drawnPoints]);

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
          {statusText}
        </StatusMessage>

        <main style={{ flex: 1, padding: 16, display: "flex" }}>
          {mode === "draw" ? <DrawMode onFinish={handleDrawFinish} onStatusChange={setStatusText} /> : null}
          {mode === "orbit" ? <OrbitMode initialPoints={drawnPoints} onModeChange={setMode} onStatusChange={setStatusText} /> : null}
          {mode === "analyze" ? <AnalyzeMode onStatusChange={setStatusText} /> : null}
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

function DrawMode({ onFinish, onStatusChange }) {
  const [rawPoints, setRawPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [lineArtReady, setLineArtReady] = useState(false);
  const [status, setStatus] = useState("好きなループを描いてみましょう。プリセットか線画からも始められます。");
  const drawCanvasRef = useRef(null);
  const lineArtRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (cancelled) return;
      lineArtRef.current = buildLineArtMask(image);
      setLineArtReady(true);
    };
    image.src = TRACE_GUIDE.src;
    return () => {
      cancelled = true;
    };
  }, []);

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
    setStatus("好きなループを描いてみましょう。プリセットか線画からも始められます。");
  }, [isDrawing, rawPoints.length]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

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

  function castLineArt() {
    if (!lineArtReady || !lineArtRef.current) return;
    const extracted = extractPathFromLineArt(lineArtRef.current, 960);
    if (!extracted.length) return;
    extracted.sourceImage = TRACE_GUIDE.src;
    extracted.preserveDensity = true;
    extracted.densityStep = 1.35;
    setSelectedPreset(TRACE_GUIDE.id);
    setRawPoints(extracted);
    setIsDrawing(false);
    onFinish(extracted);
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
          <MissionHint
            text="描いた線や線画がフーリエ変換の素材になります"
            color={COLORS.neonCyan}
          />
        </div>
      }
      controlPanel={
        <ControlPanel title="Draw" subtitle="自由な線を描いて中身を見る">
          <PresetSelector presets={DRAW_PRESETS} selected={selectedPreset} onSelect={loadPreset} color={COLORS.neonCyan} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <GlowButton color={COLORS.neonPurple} onClick={castLineArt} disabled={!lineArtReady} small>
              線画をフーリエに送る
            </GlowButton>
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
          <div style={{ color: COLORS.textMuted, fontSize: 11, lineHeight: 1.6 }}>
            {TRACE_GUIDE.label} を押すと、線画を自動トレースしてそのまま Orbit に送ります。
          </div>

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

function OrbitMode({ initialPoints, onModeChange, onStatusChange }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const unfoldStartRef = useRef(0);
  const sourceOverlayRef = useRef(null);
  const [strokeSystems, setStrokeSystems] = useState([]);
  const [maxCoeffs, setMaxCoeffs] = useState(0);
  const [numCircles, setNumCircles] = useState(20);
  const [speed, setSpeed] = useState(1);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showCircles, setShowCircles] = useState(true);
  const [circleVisibility, setCircleVisibility] = useState({});
  const [animPhase, setAnimPhase] = useState("unfolding");
  const [playing, setPlaying] = useState(false);
  const sourcePoints = useMemo(() => (initialPoints?.length ? initialPoints : generatePresetPath("star")), [initialPoints]);
  const sourceStrokes = useMemo(() => splitSegmentedPath(sourcePoints), [sourcePoints]);
  const isImageSource = Boolean(sourcePoints?.sourceImage);
  const orbitScale = useMemo(() => computeOrbitScale(sourcePoints, DRAW_CANVAS_WIDTH, DRAW_CANVAS_HEIGHT), [sourcePoints]);
  const precomputedTrails = useMemo(() => {
    if (!strokeSystems.length) return [];
    const totalCoeffs = strokeSystems.reduce((sum, system) => sum + system.coeffs.length, 0);
    const coeffRatio = totalCoeffs > 0 ? Math.min(1, numCircles / totalCoeffs) : 0;
    return strokeSystems.map((system) => {
      const quota = Math.max(1, Math.round(system.coeffs.length * coeffRatio));
      const visibleCoeffs = [];
      for (let i = 0; i < Math.min(quota, system.coeffs.length); i += 1) {
        if (circleVisibility[system.startIndex + i] !== false) {
          visibleCoeffs.push(system.coeffs[i]);
        }
      }
      if (!visibleCoeffs.length) return [];
      const numSamples = Math.max(40, Math.min(200, visibleCoeffs.length * 4));
      const trail = [];
      for (let i = 0; i <= numSamples; i += 1) {
        const t = (i / numSamples) * Math.PI * 2;
        trail.push(getEpicyclePositions(visibleCoeffs, visibleCoeffs.length, t).tip);
      }
      return trail;
    });
  }, [circleVisibility, numCircles, strokeSystems]);

  const missionHint = useMemo(() => {
    if (numCircles <= 2) return ORBIT_MISSIONS[3];
    if (numCircles <= 5) return ORBIT_MISSIONS[0];
    if (numCircles >= Math.max(6, maxCoeffs - 2)) return ORBIT_MISSIONS[1];
    return ORBIT_MISSIONS[2];
  }, [maxCoeffs, numCircles]);

  useEffect(() => {
    const totalStrokePoints = sourceStrokes.reduce((sum, stroke) => sum + stroke.length, 0);
    const coeffBudget = isImageSource ? Math.min(400, sourceStrokes.length * 12) : 80;
    let globalIndex = 0;
    const systems = sourceStrokes.map((stroke) => {
      const share = Math.max(8, Math.round((stroke.length / Math.max(1, totalStrokePoints)) * coeffBudget));
      const calculated = computeDFT(stroke, Math.min(stroke.length, share));
      const entry = {
        points: stroke,
        coeffs: calculated,
        startIndex: globalIndex
      };
      globalIndex += calculated.length;
      return entry;
    });
    setStrokeSystems(systems);
    setMaxCoeffs(globalIndex);
    setNumCircles(Math.min(isImageSource ? globalIndex : 20, globalIndex));
    setCircleVisibility({});
    setShowOriginal(true);
    setShowCircles(true);
    setSpeed(1);
    timeRef.current = 0;
    unfoldStartRef.current = Date.now();
    setAnimPhase("unfolding");
    setPlaying(false);
  }, [isImageSource, sourceStrokes]);

  useEffect(() => {
    if (!isImageSource || !sourcePoints?.sourceImage) {
      sourceOverlayRef.current = null;
      return undefined;
    }
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (cancelled) return;
      sourceOverlayRef.current = buildLineArtMask(image);
    };
    image.src = sourcePoints.sourceImage;
    return () => {
      cancelled = true;
    };
  }, [isImageSource, sourcePoints]);

  useEffect(() => {
    onStatusChange?.(buildOrbitStatus(animPhase, numCircles, maxCoeffs));
  }, [animPhase, maxCoeffs, numCircles, onStatusChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !strokeSystems.length) return;
    const context = canvas.getContext("2d");

    function frame() {
      const now = Date.now();
      let visibleCount = numCircles;

      if (animPhase === "unfolding") {
        const elapsed = now - unfoldStartRef.current;
        if (elapsed < 500) {
          visibleCount = 0;
        } else {
          const ratio = Math.min(1, (elapsed - 500) / 2000);
          visibleCount = Math.max(1, Math.min(numCircles, Math.ceil(ratio * numCircles)));
        }

        timeRef.current += (Math.PI * 2 * speed) / 520;
        if (elapsed >= 2500) {
          setAnimPhase("playing");
          setPlaying(true);
          visibleCount = numCircles;
        }
      } else if (animPhase === "playing" && playing) {
        timeRef.current += (Math.PI * 2 * speed) / 400;
      }

      if (timeRef.current >= Math.PI * 2) {
        if (isImageSource) {
          timeRef.current = Math.PI * 2;
          setPlaying(false);
          setAnimPhase("paused");
        } else {
          timeRef.current -= Math.PI * 2;
        }
      }

      const totalCoeffs = strokeSystems.reduce((sum, system) => sum + system.coeffs.length, 0);
      const ratio = totalCoeffs > 0 ? Math.min(1, visibleCount / totalCoeffs) : 0;

      const positionGroups = strokeSystems.map((system, systemIndex) => {
        const quota = Math.max(1, Math.round(system.coeffs.length * ratio));
        const visibleCoeffs = [];
        for (let localIndex = 0; localIndex < Math.min(quota, system.coeffs.length); localIndex += 1) {
          const globalCoeffIndex = system.startIndex + localIndex;
          if (circleVisibility[globalCoeffIndex] !== false) {
            visibleCoeffs.push(system.coeffs[localIndex]);
          }
        }

        const positions = getEpicyclePositions(visibleCoeffs, visibleCoeffs.length, timeRef.current);
        return {
          strokeIndex: systemIndex,
          positions,
          startIndex: system.startIndex,
          coeffCount: system.coeffs.length
        };
      });

      const progress = Math.min(1, timeRef.current / (Math.PI * 2));
      const visibleTrails = precomputedTrails.map((trail) => {
        if (!trail.length) return [];
        const end = Math.ceil(progress * trail.length);
        return trail.slice(0, end);
      });

      drawOrbitScene(context, {
        sourcePoints,
        sourceOverlay: sourceOverlayRef.current,
        showOriginal,
        showCircles,
        positionGroups,
        trails: visibleTrails,
        scale: orbitScale,
        animPhase,
        unfoldElapsed: now - unfoldStartRef.current
      });

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animPhase, circleVisibility, isImageSource, numCircles, orbitScale, playing, precomputedTrails, showCircles, showOriginal, sourcePoints, speed, strokeSystems]);

  function toggleRun() {
    if (animPhase === "unfolding") return;
    setPlaying((current) => !current);
    setAnimPhase((current) => (current === "paused" ? "playing" : current === "playing" ? "paused" : current));
  }

  function resetOrbit() {
    timeRef.current = 0;
    setPlaying(true);
    setAnimPhase("playing");
  }

  function handleCircleCountChange(nextValue) {
    setNumCircles(nextValue);
    timeRef.current = 0;
  }

  function toggleCircle(index) {
    timeRef.current = 0;
    setCircleVisibility((current) => ({
      ...current,
      [index]: current[index] === false ? true : false
    }));
  }

  const displayedCircleCount = Math.min(15, numCircles, maxCoeffs);

  return (
    <PlayLayout
      canvasArea={
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <canvas
            ref={canvasRef}
            width={DRAW_CANVAS_WIDTH}
            height={DRAW_CANVAS_HEIGHT}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              borderRadius: 12,
              background: COLORS.bgAlt,
              border: `1px solid ${COLORS.border}`
            }}
          />
          <MissionHint text={missionHint} color={COLORS.neonPurple} />
        </div>
      }
      controlPanel={
        <ControlPanel title="Orbital Sketcher" subtitle="描いた線が、回転する部品の連鎖へほどけます">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <NeonSlider
              label="くっきり"
              min={1}
              max={Math.max(1, maxCoeffs)}
              step={1}
              value={Math.min(numCircles, Math.max(1, maxCoeffs))}
              onChange={handleCircleCountChange}
              color={COLORS.neonPurple}
            />
            <NeonSlider
              label="速度"
              min={0.1}
              max={3}
              step={0.1}
              value={speed}
              onChange={setSpeed}
              color={COLORS.neonPurple}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <GlowButton color={COLORS.neonPurple} onClick={toggleRun} disabled={animPhase === "unfolding"}>
              {animPhase === "unfolding" ? "展開中" : playing ? "⏸ 停止" : "▶ 再生"}
            </GlowButton>
            <GlowButton color={COLORS.neonPurple} onClick={resetOrbit}>
              ↺ リセット
            </GlowButton>
            <GlowButton color={COLORS.neonPurple} active={showOriginal} onClick={() => setShowOriginal((current) => !current)}>
              元の線
            </GlowButton>
            <GlowButton color={COLORS.neonPurple} active={showCircles} onClick={() => setShowCircles((current) => !current)}>
              円を表示
            </GlowButton>
            <GlowButton color={COLORS.neonBlue} onClick={() => onModeChange("analyze")}>
              成分として見る →
            </GlowButton>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <ValueCard label="円の数" value={`${Math.min(numCircles, maxCoeffs)}`} color={COLORS.neonPurple} />
            <ValueCard label="線の数" value={`${sourceStrokes.length}`} color={COLORS.neonBlue} />
            <ValueCard label="速度" value={`${speed.toFixed(1)}x`} color={COLORS.neonPurple} />
            <ValueCard label="状態" value={animPhase === "unfolding" ? "変身中" : playing ? "再生中" : "停止中"} color={animPhase === "unfolding" ? COLORS.neonPink : playing ? COLORS.neonGreen : COLORS.textMuted} />
          </div>

          <StatusMessage color={COLORS.neonPurple}>
            {buildOrbitStatus(animPhase, numCircles, maxCoeffs)}
          </StatusMessage>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4
            }}
          >
            {Array.from({ length: displayedCircleCount }, (_, index) => (
              <GlowButton
                key={index}
                small
                color={COLORS.neonPurple}
                active={circleVisibility[index] !== false}
                onClick={() => toggleCircle(index)}
              >
                {index + 1}
              </GlowButton>
            ))}
          </div>
        </ControlPanel>
      }
      footer="複雑な形は、回転する部品の組み合わせで再現できます"
    />
  );
}

function AnalyzeMode({ onStatusChange }) {
  const inputCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const outputCanvasRef = useRef(null);
  const [preset, setPreset] = useState("Chord");
  const [signal, setSignal] = useState([]);
  const [spectrum, setSpectrum] = useState([]);
  const [mask, setMask] = useState({});
  const [filterMode, setFilterMode] = useState(null);
  const [cutoff, setCutoff] = useState(20);

  const reconSignal = useMemo(() => reconstructSignal(spectrum, signal.length || 256, mask), [mask, signal.length, spectrum]);
  const activeCount = useMemo(
    () => spectrum.reduce((count, _, index) => count + (mask[index] !== false ? 1 : 0), 0),
    [mask, spectrum]
  );
  const status = useMemo(() => buildAnalyzeStatus(filterMode, activeCount, spectrum.length), [activeCount, filterMode, spectrum.length]);
  const mission = ANALYZE_MISSIONS[preset] || ANALYZE_MISSIONS.default;

  useEffect(() => {
    loadPresetSignal("Chord");
  }, []);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    if (!filterMode || spectrum.length === 0) return;
    const nextMask = {};
    const half = Math.floor(spectrum.length / 2);
    spectrum.forEach((_, index) => {
      const distance = spectralDistance(index, spectrum.length);
      if (filterMode === "lowpass") {
        nextMask[index] = distance <= cutoff;
      } else if (filterMode === "highpass") {
        nextMask[index] = distance >= cutoff && distance <= half;
      } else if (filterMode === "bandpass") {
        nextMask[index] = distance >= cutoff - 5 && distance <= cutoff + 5;
      }
    });
    setMask(nextMask);
  }, [cutoff, filterMode, spectrum]);

  useEffect(() => {
    const canvas = inputCanvasRef.current;
    if (!canvas || signal.length === 0) return;
    const context = canvas.getContext("2d");
    drawSignalPanel(context, {
      signal,
      color: COLORS.neonBlue
    });
  }, [signal]);

  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas || spectrum.length === 0) return;
    const context = canvas.getContext("2d");
    drawSpectrumPanel(context, {
      spectrum,
      mask,
      filterMode,
      cutoff
    });
  }, [cutoff, filterMode, mask, spectrum]);

  useEffect(() => {
    const canvas = outputCanvasRef.current;
    if (!canvas || signal.length === 0 || reconSignal.length === 0) return;
    const context = canvas.getContext("2d");
    drawReconstructedSignalPanel(context, {
      original: signal,
      reconstructed: reconSignal
    });
  }, [reconSignal, signal]);

  function loadPresetSignal(nextPreset) {
    const sampleCount = 256;
    const nextSignal = Array.from({ length: sampleCount }, (_, index) => SIGNAL_PRESETS[nextPreset](index, sampleCount));
    setPreset(nextPreset);
    setSignal(nextSignal);
    setSpectrum(computeSignalDFT(nextSignal));
    setMask({});
    setFilterMode(null);
    setCutoff(20);
  }

  function handleSpectrumClick(event) {
    if (!spectrum.length) return;
    const rect = spectrumCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relativeX = (event.clientX - rect.left) / rect.width;
    const index = Math.max(0, Math.min(spectrum.length - 1, Math.floor(relativeX * spectrum.length)));
    setFilterMode(null);
    setMask((current) => ({
      ...current,
      [index]: current[index] === false ? true : false
    }));
  }

  function toggleFilter(nextMode) {
    setFilterMode((current) => {
      const updated = current === nextMode ? null : nextMode;
      if (updated === null) {
        setMask({});
      }
      return updated;
    });
  }

  function resetMask() {
    setFilterMode(null);
    setMask({});
  }

  return (
    <PlayLayout
      canvasArea={
        <div style={{ display: "grid", gap: 12, height: "100%", position: "relative" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              padding: "4px 0"
            }}
          >
            {ANALYZE_PRESETS.map((item) => (
              <GlowButton
                key={item.id}
                small
                color={COLORS.neonBlue}
                active={preset === item.id}
                onClick={() => loadPresetSignal(item.id)}
              >
                {item.label}
              </GlowButton>
            ))}
          </div>

          <AnalyzePanelFrame label="時間領域（入力)">
            <canvas
              ref={inputCanvasRef}
              width={600}
              height={100}
              style={{
                width: "100%",
                height: "100%",
                display: "block"
              }}
            />
          </AnalyzePanelFrame>

          <AnalyzePanelFrame label="周波数領域（成分)">
            <canvas
              ref={spectrumCanvasRef}
              width={600}
              height={100}
              onClick={handleSpectrumClick}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                cursor: "crosshair"
              }}
            />
          </AnalyzePanelFrame>

          <AnalyzePanelFrame label="再構成（出力)">
            <canvas
              ref={outputCanvasRef}
              width={600}
              height={100}
              style={{
                width: "100%",
                height: "100%",
                display: "block"
              }}
            />
          </AnalyzePanelFrame>

          <div
            style={{
              display: "grid",
              gap: 10,
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.surface,
              padding: "8px 12px"
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <GlowButton color={COLORS.neonAmber} active={filterMode === "lowpass"} onClick={() => toggleFilter("lowpass")} small>
                低域通過
              </GlowButton>
              <GlowButton color={COLORS.neonAmber} active={filterMode === "highpass"} onClick={() => toggleFilter("highpass")} small>
                高域通過
              </GlowButton>
              <GlowButton color={COLORS.neonAmber} active={filterMode === "bandpass"} onClick={() => toggleFilter("bandpass")} small>
                帯域通過
              </GlowButton>
              <GlowButton color={COLORS.borderLight} onClick={resetMask} small>
                全復元
              </GlowButton>
            </div>

            {filterMode ? (
              <NeonSlider
                label="カットオフ"
                min={1}
                max={Math.max(2, Math.floor(spectrum.length / 2))}
                step={1}
                value={Math.min(cutoff, Math.max(2, Math.floor(spectrum.length / 2)))}
                onChange={setCutoff}
                color={COLORS.neonAmber}
              />
            ) : null}
          </div>

          <MissionHint text={mission} color={COLORS.neonBlue} />
        </div>
      }
      controlPanel={
        <ControlPanel title="Analyze" subtitle="波形を成分へほどいて、残す・消すを試します">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            <ValueCard label="プリセット" value={ANALYZE_PRESETS.find((item) => item.id === preset)?.label || preset} color={COLORS.neonBlue} />
            <ValueCard label="有効成分" value={`${activeCount}/${spectrum.length || 0}`} color={COLORS.neonGreen} />
            <ValueCard label="フィルタ" value={filterMode === "lowpass" ? "低域" : filterMode === "highpass" ? "高域" : filterMode === "bandpass" ? "帯域" : "なし"} color={filterMode ? COLORS.neonAmber : COLORS.textMuted} />
          </div>

          <StatusMessage color={COLORS.neonBlue}>
            {status}
          </StatusMessage>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: COLORS.textDim, fontSize: 10, letterSpacing: "0.08em" }}>観察のコツ</span>
            <div style={{ display: "grid", gap: 6, color: COLORS.textMuted, fontSize: 11, lineHeight: 1.5 }}>
              <span>・棒をクリックすると、その成分だけ消したり戻したりできます</span>
              <span>・フィルタを使うと、波形のなめらかさが一気に変わります</span>
              <span>・緑の線と青いゴーストの差が、削った情報です</span>
            </div>
          </div>
        </ControlPanel>
      }
      footer="さっきの円の連鎖も、ここでは成分として見えます"
    />
  );
}

function AnalyzePanelFrame({ label, children }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.bgAlt,
        overflow: "hidden",
        minHeight: 120
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          color: COLORS.textDim,
          fontSize: 10,
          letterSpacing: "0.08em",
          zIndex: 2
        }}
      >
        {label}
      </span>
      <div style={{ width: "100%", height: "100%" }}>{children}</div>
    </div>
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
        : "さっきの円の連鎖も、ここでは成分として見えます";

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
    return drawnPoints?.length ? "複雑な形は、回転する部品の組み合わせへほどけます。" : "まずは Draw で形を作ると、ここで中身が見えてきます。";
  }
  return "この波形は、いくつかの成分の混ざり物です";
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
    strokeSegmentedPath(context, points, !isDrawing);

    context.shadowBlur = 0;
    context.lineWidth = 2;
    context.strokeStyle = COLORS.neonCyan;
    strokeSegmentedPath(context, points, !isDrawing);

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

function buildLineArtMask(image) {
  const maxDimension = 480;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = frame.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const luminance = (red + green + blue) / 3;
    const darkness = 255 - luminance;
    const alpha = darkness > 18 ? Math.min(170, darkness * 1.4) : 0;
    pixels[index] = 130;
    pixels[index + 1] = 205;
    pixels[index + 2] = 230;
    pixels[index + 3] = alpha;
  }

  context.putImageData(frame, 0, 0);
  let minX = canvas.width;
  let maxX = 0;
  let minY = canvas.height;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha <= 18) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  canvas.contentBounds = minX < maxX && minY < maxY ? { minX, maxX, minY, maxY } : null;
  return canvas;
}

function extractPathFromLineArt(maskCanvas, targetN = 640) {
  const context = maskCanvas.getContext("2d", { willReadFrequently: true });
  const frame = context.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const pixels = frame.data;
  const threshold = 18;
  const width = maskCanvas.width;
  const height = maskCanvas.height;
  const occupancy = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > threshold) {
        occupancy[y * width + x] = 1;
      }
    }
  }

  const dilated = dilateMask(occupancy, width, height, 1);
  const skeleton = skeletonizeMask(dilated, width, height);
  const skeletonPoints = collectSkeletonPoints(skeleton, width, height);
  if (skeletonPoints.length < 12) {
    return [];
  }

  const path = traceSkeletonPoints(skeletonPoints, width);
  const smoothedPath = smoothSegmentedPoints(path, 2);
  const sampledPath = resamplePathWithBreaks(smoothedPath, targetN);
  const densePath = densifyPathWithBreaks(sampledPath, 1.8);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  densePath.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min((DRAW_CANVAS_WIDTH * 0.58) / spanX, (DRAW_CANVAS_HEIGHT * 0.72) / spanY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const result = densePath.map((point) => ({
    x: (point.x - centerX) * scale,
    y: (point.y - centerY) * scale,
    hiddenBefore: Boolean(point.hiddenBefore)
  }));
  result.strokeCount = splitSegmentedPath(result).length;
  return result;
}

function dilateMask(source, width, height, iterations) {
  let current = source;
  for (let step = 0; step < iterations; step += 1) {
    const next = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let occupied = 0;
        for (let dy = -1; dy <= 1 && !occupied; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (current[ny * width + nx]) {
              occupied = 1;
              break;
            }
          }
        }
        next[y * width + x] = occupied;
      }
    }
    current = next;
  }
  return current;
}

function skeletonizeMask(source, width, height) {
  const data = new Uint8Array(source);
  let changed = true;

  while (changed) {
    changed = false;
    const toDelete = [];
    for (let pass = 0; pass < 2; pass += 1) {
      toDelete.length = 0;
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          if (!data[index]) continue;
          const neighbors = getEightNeighbors(data, width, index);
          const count = neighbors.reduce((sum, value) => sum + value, 0);
          if (count < 2 || count > 6) continue;
          const transitions = countBinaryTransitions(neighbors);
          if (transitions !== 1) continue;
          const [p2, p3, p4, p5, p6, p7, p8, p9] = neighbors;
          if (pass === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          toDelete.push(index);
        }
      }
      if (toDelete.length) {
        changed = true;
        toDelete.forEach((index) => {
          data[index] = 0;
        });
      }
    }
  }

  return data;
}

function getEightNeighbors(data, width, index) {
  return [
    data[index - width],
    data[index - width + 1],
    data[index + 1],
    data[index + width + 1],
    data[index + width],
    data[index + width - 1],
    data[index - 1],
    data[index - width - 1]
  ];
}

function countBinaryTransitions(neighbors) {
  let transitions = 0;
  for (let index = 0; index < neighbors.length; index += 1) {
    const current = neighbors[index];
    const next = neighbors[(index + 1) % neighbors.length];
    if (current === 0 && next === 1) transitions += 1;
  }
  return transitions;
}

function collectSkeletonPoints(source, width, height) {
  const points = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!source[y * width + x]) continue;
      points.push({ x, y, index: y * width + x });
    }
  }
  return points;
}

function traceSkeletonPoints(points, width) {
  const keyToIndex = new Map(points.map((point, index) => [`${point.x},${point.y}`, index]));
  const adjacency = points.map((point) => {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const neighborIndex = keyToIndex.get(`${point.x + dx},${point.y + dy}`);
        if (neighborIndex !== undefined) neighbors.push(neighborIndex);
      }
    }
    return neighbors;
  });

  const visited = new Uint8Array(points.length);
  const ordered = [];
  let currentIndex = points
    .map((point, index) => ({ point, index }))
    .sort((left, right) => (left.point.y - right.point.y) || (left.point.x - right.point.x))[0]?.index ?? 0;
  let previousVector = { x: 1, y: 0 };
  ordered.push({ x: points[currentIndex].x, y: points[currentIndex].y, hiddenBefore: false });
  visited[currentIndex] = 1;

  while (ordered.length < points.length) {
    const currentPoint = points[currentIndex];
    const availableNeighbors = adjacency[currentIndex].filter((index) => !visited[index]);
    let nextIndex = -1;
    let hiddenBefore = false;

    if (availableNeighbors.length) {
      nextIndex = availableNeighbors.sort((left, right) => {
        const leftScore = traceStepScore(currentPoint, points[left], previousVector);
        const rightScore = traceStepScore(currentPoint, points[right], previousVector);
        return leftScore - rightScore;
      })[0];
    } else {
      let bestDistance = Infinity;
      points.forEach((point, index) => {
        if (visited[index]) return;
        const distance = Math.hypot(point.x - currentPoint.x, point.y - currentPoint.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          nextIndex = index;
        }
      });
      hiddenBefore = nextIndex !== -1;
    }

    if (nextIndex === -1) break;
    const nextPoint = points[nextIndex];
    ordered.push({
      x: nextPoint.x,
      y: nextPoint.y,
      hiddenBefore
    });
    visited[nextIndex] = 1;
    previousVector = {
      x: nextPoint.x - currentPoint.x,
      y: nextPoint.y - currentPoint.y
    };
    currentIndex = nextIndex;
  }

  return simplifyPointSequence(
    ordered.filter((point, index, array) => index === 0 || point.x !== array[index - 1].x || point.y !== array[index - 1].y || point.hiddenBefore),
    1.2
  );
}

function traceStepScore(currentPoint, nextPoint, previousVector) {
  const dx = nextPoint.x - currentPoint.x;
  const dy = nextPoint.y - currentPoint.y;
  const distance = Math.hypot(dx, dy);
  const magnitude = Math.hypot(previousVector.x, previousVector.y) * Math.max(0.001, distance);
  const dot = dx * previousVector.x + dy * previousVector.y;
  const turnPenalty = magnitude ? 1 - dot / magnitude : 1;
  return distance + turnPenalty * 1.5;
}

function simplifyPointSequence(points, minimumDistance) {
  const compact = [];
  points.forEach((point) => {
    const last = compact[compact.length - 1];
    if (!last || point.hiddenBefore || Math.hypot(point.x - last.x, point.y - last.y) >= minimumDistance) {
      compact.push({ ...point });
    }
  });
  return compact;
}

function smoothSegmentedPoints(points, radius) {
  return points.map((point, index) => {
    if (point.hiddenBefore) {
      return { ...point };
    }
    let totalX = 0;
    let totalY = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sample = points[index + offset];
      if (!sample || sample.hiddenBefore) continue;
      totalX += sample.x;
      totalY += sample.y;
      count += 1;
    }
    return count
      ? {
          x: totalX / count,
          y: totalY / count,
          hiddenBefore: point.hiddenBefore
        }
      : { ...point };
  });
}

function resamplePathWithBreaks(rawPoints, targetN) {
  const segments = [];
  let current = [];
  rawPoints.forEach((point) => {
    if (point.hiddenBefore && current.length) {
      segments.push(current);
      current = [];
    }
    current.push({ x: point.x, y: point.y });
  });
  if (current.length) segments.push(current);

  const lengths = segments.map((segment) => segmentLength(segment));
  const totalLength = lengths.reduce((sum, value) => sum + value, 0) || 1;
  const merged = [];

  segments.forEach((segment, index) => {
    const quota = Math.max(12, Math.round((lengths[index] / totalLength) * targetN));
    const sampled = resamplePath(segment, quota);
    sampled.forEach((point, pointIndex) => {
      merged.push({
        x: point.x,
        y: point.y,
        hiddenBefore: index > 0 && pointIndex === 0
      });
    });
  });

  return merged;
}

function densifyPath(points, step) {
  if (points.length < 2) return points;
  const dense = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = dense[dense.length - 1];
    const current = points[index];
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const pieces = Math.max(1, Math.ceil(distance / step));
    for (let piece = 1; piece <= pieces; piece += 1) {
      const ratio = piece / pieces;
      dense.push({
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio
      });
    }
  }
  return dense;
}

function densifyPathWithBreaks(points, step) {
  const segments = splitSegmentedPath(points);
  const dense = [];
  segments.forEach((segment, segmentIndex) => {
    const densifiedSegment = densifyPath(segment, step);
    densifiedSegment.forEach((point, pointIndex) => {
      dense.push({
        x: point.x,
        y: point.y,
        hiddenBefore: segmentIndex > 0 && pointIndex === 0
      });
    });
  });
  return dense;
}

function splitSegmentedPath(points) {
  const segments = [];
  let current = [];
  points.forEach((point) => {
    if (point.hiddenBefore && current.length) {
      segments.push(current);
      current = [];
    }
    current.push({ x: point.x, y: point.y });
  });
  if (current.length) {
    segments.push(current);
  }
  const valid = segments.filter((segment) => segment.length >= 2);
  if (valid.length <= 60) return valid;
  const withLength = valid.map((segment) => ({ segment, length: segmentLength(segment) }));
  withLength.sort((a, b) => b.length - a.length);
  return withLength.slice(0, 60).map((entry) => entry.segment);
}

function segmentLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }
  return length;
}

function computeOrbitScale(points, width, height) {
  if (!points?.length) return 1;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const availableWidth = width * 0.68;
  const availableHeight = height * 0.68;
  return Math.min(availableWidth / spanX, availableHeight / spanY);
}

function buildOrbitStatus(animPhase, numCircles, maxCoeffs) {
  if (animPhase === "unfolding") {
    return "複雑な形が、回転する部品へほどけています…";
  }
  if (numCircles <= 3) {
    return "大きな円が全体の形を作っています";
  }
  if (numCircles <= 8) {
    return "形が見えてきました。もっと増やしてみましょう";
  }
  if (maxCoeffs > 0 && numCircles >= maxCoeffs - 2) {
    return "ほぼ完全再現！複雑な形が回転する部品で再現されています";
  }
  return "円を減らすと、形が抽象化されます";
}

function drawOrbitScene(
  context,
  { sourcePoints, sourceOverlay, showOriginal, showCircles, positionGroups, trails, scale, animPhase, unfoldElapsed }
) {
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

  if (showOriginal && sourcePoints?.length) {
    const glowBoost = animPhase === "unfolding" && unfoldElapsed < 500;
    context.save();
    if (sourceOverlay?.contentBounds) {
      drawLineArtOverlay(context, sourceOverlay, glowBoost);
    } else {
      context.strokeStyle = glowBoost ? "rgba(0, 229, 255, 0.3)" : "rgba(0, 229, 255, 0.15)";
      context.lineWidth = 1;
      context.shadowColor = COLORS.neonCyan;
      context.shadowBlur = glowBoost ? 20 : 6;
      strokeSegmentedPath(context, sourcePoints.map((point) => ({ ...point, x: point.x * scale, y: point.y * scale })), false);
    }
    context.restore();
  }

  if (showCircles && positionGroups?.length) {
    const maxCircleGroups = Math.min(positionGroups.length, 12);
    positionGroups.slice(0, maxCircleGroups).forEach((group) => {
      group.positions.circles.slice(0, 8).forEach((circle, index) => {
        const radius = circle.r * scale;
        if (radius < 0.5) return;
        const opacity = Math.max(0.08, 0.3 - index * 0.015);

        context.save();
        context.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
        context.lineWidth = 0.8;
        context.beginPath();
        context.arc(circle.cx * scale, circle.cy * scale, radius, 0, Math.PI * 2);
        context.stroke();

        context.strokeStyle = `rgba(168, 85, 247, ${Math.min(0.42, opacity + 0.08)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(circle.cx * scale, circle.cy * scale);
        context.lineTo(circle.nx * scale, circle.ny * scale);
        context.stroke();
        context.restore();
      });
    });
  }

  if (trails?.length) {
    const strokeHueStep = trails.length > 1 ? 40 / trails.length : 0;
    trails.forEach((trail, trailIndex) => {
      if (!trail || trail.length <= 1) return;
      context.save();
      const hue = 330 + trailIndex * strokeHueStep;
      context.strokeStyle = `hsl(${hue}, 85%, 72%)`;
      context.lineWidth = 1.8;
      context.shadowColor = `hsl(${hue}, 85%, 72%)`;
      context.shadowBlur = 7;
      strokeSegmentedPath(context, trail.map((point) => ({ ...point, x: point.x * scale, y: point.y * scale })), false);
      context.restore();
    });
  }

  if (positionGroups?.length) {
    positionGroups.forEach((group) => {
      if (!group.positions?.tip) return;
      context.save();
      context.fillStyle = COLORS.neonPink;
      context.shadowColor = COLORS.neonPink;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(group.positions.tip.x * scale, group.positions.tip.y * scale, 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }

  context.restore();
}

function drawLineArtOverlay(context, overlayCanvas, glowBoost) {
  const bounds = overlayCanvas.contentBounds;
  const spanX = Math.max(1, bounds.maxX - bounds.minX);
  const spanY = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((DRAW_CANVAS_WIDTH * 0.58) / spanX, (DRAW_CANVAS_HEIGHT * 0.72) / spanY);
  const width = overlayCanvas.width * scale;
  const height = overlayCanvas.height * scale;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const offsetX = -centerX * scale;
  const offsetY = -centerY * scale;
  context.globalAlpha = glowBoost ? 0.85 : 0.55;
  context.shadowColor = COLORS.neonCyan;
  context.shadowBlur = glowBoost ? 20 : 10;
  context.drawImage(overlayCanvas, offsetX, offsetY, width, height);
}

function strokeSegmentedPath(context, points, closeLoop) {
  if (!points?.length) return;
  context.beginPath();
  let segmentStartIndex = 0;
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].hiddenBefore) {
      if (closeLoop && index - segmentStartIndex > 2 && !points[segmentStartIndex].hiddenBefore) {
        context.closePath();
      }
      segmentStartIndex = index;
      context.moveTo(points[index].x, points[index].y);
      continue;
    }
    context.lineTo(points[index].x, points[index].y);
  }
  if (closeLoop && points.length - segmentStartIndex > 2 && !points[segmentStartIndex].hiddenBefore) {
    context.closePath();
  }
  context.stroke();
}

function buildAnalyzeStatus(filterMode, activeCount, totalCount) {
  if (filterMode === "lowpass") {
    return "高い成分を消すと、波形がなめらかになります";
  }
  if (filterMode === "highpass") {
    return "低い成分を消すと、大きなうねりが消えます";
  }
  if (filterMode === "bandpass") {
    return "特定の帯域だけを取り出しています";
  }
  if (totalCount > 0 && activeCount < totalCount / 2) {
    return "成分を減らすと、波形が簡素化されます";
  }
  return "この波形は、いくつかの成分の混ざり物です";
}

function spectralDistance(index, length) {
  return Math.min(index, length - index);
}

function drawSignalPanel(context, { signal, color }) {
  context.clearRect(0, 0, 600, 100);
  drawWaveAxis(context);
  drawSignalLine(context, signal, color, { shadowBlur: 4, lineWidth: 1.5 });
}

function drawSpectrumPanel(context, { spectrum, mask, filterMode, cutoff }) {
  context.clearRect(0, 0, 600, 100);
  drawSpectrumBars(context, spectrum, mask);
  if (filterMode) {
    drawSpectrumCutoff(context, spectrum.length, filterMode, cutoff);
  }
}

function drawReconstructedSignalPanel(context, { original, reconstructed }) {
  context.clearRect(0, 0, 600, 100);
  drawWaveAxis(context);
  drawSignalLine(context, original, "rgba(74, 158, 255, 0.15)", { shadowBlur: 0, lineWidth: 1 });
  drawSignalLine(context, reconstructed, COLORS.neonGreen, { shadowBlur: 5, lineWidth: 1.5 });
}

function drawWaveAxis(context) {
  context.save();
  context.strokeStyle = COLORS.border;
  context.lineWidth = 0.5;
  context.beginPath();
  context.moveTo(0, 50);
  context.lineTo(600, 50);
  context.stroke();
  context.restore();
}

function drawSignalLine(context, signal, color, { shadowBlur, lineWidth }) {
  if (!signal?.length) return;
  const maxAbs = Math.max(...signal.map((value) => Math.abs(value))) || 1;
  context.save();
  context.beginPath();
  signal.forEach((value, index) => {
    const x = (index / Math.max(1, signal.length - 1)) * 600;
    const y = 50 - (value / maxAbs) * 38;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.shadowColor = color;
  context.shadowBlur = shadowBlur;
  context.stroke();
  context.restore();
}

function drawSpectrumBars(context, spectrum, mask) {
  if (!spectrum?.length) return;
  const maxAmp = Math.max(...spectrum.map((component) => component.amp)) || 1;
  const barWidth = Math.max(1, 600 / spectrum.length - 1);

  context.save();
  spectrum.forEach((component, index) => {
    const active = mask[index] !== false;
    const normalized = component.amp / maxAmp;
    const height = normalized * 74;
    const x = (index / spectrum.length) * 600;
    const y = 90 - height;
    context.globalAlpha = active ? 0.8 : 0.2;
    context.fillStyle = active ? COLORS.neonBlue : COLORS.textDim;
    if (active && height >= 10) {
      context.shadowColor = COLORS.neonBlue;
      context.shadowBlur = 6;
    } else {
      context.shadowBlur = 0;
    }
    context.fillRect(x, y, barWidth, height);
  });
  context.restore();
}

function drawSpectrumCutoff(context, length, filterMode, cutoff) {
  const positions = [];
  if (filterMode === "lowpass" || filterMode === "highpass") {
    positions.push(cutoff, length - cutoff);
  } else if (filterMode === "bandpass") {
    positions.push(cutoff - 5, cutoff + 5, length - cutoff - 5, length - cutoff + 5);
  }

  context.save();
  context.setLineDash([4, 4]);
  context.strokeStyle = COLORS.neonAmber;
  context.lineWidth = 1;
  positions
    .filter((position) => position > 0 && position < length)
    .forEach((position) => {
      const x = (position / length) * 600;
      context.beginPath();
      context.moveTo(x, 8);
      context.lineTo(x, 92);
      context.stroke();
    });
  context.restore();
}

// === 将来拡張 ===
// [基礎原理ラボ] 直交性・収束・ギブス現象・離散化の可視化モード
// → 新しいモードとして追加。computeDFT の係数を使って
//   ギブス現象（項数による矩形波近似の振動）等を可視化
// [変換本体] フーリエ級数・フーリエ変換・DFT/FFT の比較ページ
// → computeDFT を FFT 実装に差し替え可能（インターフェース同一）
// → signalDft.js に連続フーリエ変換の近似計算を追加可能
// [音ラボ] Web Audio API で実際に音を生成・分析
// → signalDft の入力を AudioContext.analyser から取得
// → reconSignal の出力を AudioBuffer として再生
// → SIGNAL_PRESETS に実音声プリセットを追加
// [画像ラボ] 2D フーリエ変換で画像のフィルタリング
// → computeDFT の 2D 版を実装
// → Canvas の ImageData を入力として受け取り
// → 周波数空間でのマスク操作 → 逆変換で画像再構成
// [スペクトログラム] STFT でリアルタイム時間周波数解析
// → signalDft を窓関数付きで短区間に適用
// → 結果を 2D ヒートマップとして Canvas に描画
// [ウェーブレット] 時間周波数解析の拡張
// → 計算コアに wavelet 変換関数を追加
// [PDE ラボ] 熱方程式・波動方程式の直感可視化
// → フーリエ級数の各モードに減衰/伝播を適用
// → 時間発展をアニメーション
// [EEG 隠しモード] 脳波データの読み込みと周波数解析
// → File API で CSV/EDF 読み込み → signalDft で解析

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
  "Simple wave": (n, total) => Math.sin((2 * Math.PI * 3 * n) / total),
  Chord: (n, total) =>
    0.5 * Math.sin((2 * Math.PI * 3 * n) / total) +
    0.3 * Math.sin((2 * Math.PI * 7 * n) / total) +
    0.2 * Math.sin((2 * Math.PI * 13 * n) / total),
  "Square wave": (n, total) => {
    let value = 0;
    for (let harmonic = 1; harmonic <= 15; harmonic += 2) {
      value += Math.sin((2 * Math.PI * harmonic * n) / total) / harmonic;
    }
    return value;
  },
  Sawtooth: (n, total) => {
    let value = 0;
    for (let harmonic = 1; harmonic <= 20; harmonic += 1) {
      value += Math.sin((2 * Math.PI * harmonic * n) / total) / harmonic;
    }
    return value;
  },
  "Noisy wave": (n, total) =>
    Math.sin((2 * Math.PI * 5 * n) / total) + (Math.random() - 0.5) * 0.4,
  Pulse: (n, total) => {
    const phase = (n % total) / total;
    return phase < 0.12 || (phase > 0.48 && phase < 0.6) ? 1 : -0.15;
  }
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MathKpi,
  MathMissionCard,
  MathPlaygroundLayout,
  MathPresetRow,
  MathSliderField,
  MathToggleField,
  MathValueMeter
} from "@/components/math-community/math-playground-ui";
import {
  drawCanvasMessage,
  drawFunctionCurve,
  drawGraphGrid,
  eventToCanvasPoint,
  linearScreenToWorld,
  linearWorldToScreen,
  paintMathBackground,
  screenToWorldX,
  worldToScreenX,
  worldToScreenY
} from "@/lib/math-community/math-canvas";

const APP_TABS = [
  { id: "graph", label: "関数グラフ" },
  { id: "derivative", label: "微分" },
  { id: "integral", label: "積分" },
  { id: "linear", label: "線形代数" },
  { id: "geometry", label: "幾何" },
  { id: "space", label: "空間図形" },
  { id: "cas", label: "数式処理(CAS)" },
  { id: "calculator", label: "科学計算電卓" }
];

const GRAPH_PRESETS = [
  "sin(x)",
  "cos(x) * x / 3",
  "x^3 / 20 - x",
  "sqrt(abs(x))",
  "exp(-x^2 / 12) * 6"
];

const SURFACE_PRESETS = [
  "sin(sqrt(x^2 + y^2))",
  "cos(x) + sin(y)",
  "(x^2 - y^2) / 8",
  "sin(x) * cos(y) * 2"
];

const DERIVATIVE_PRESETS = [
  {
    id: "parabola",
    label: "やわらか山",
    expression: "x^2 - 2",
    xRange: 5,
    yRange: 8,
    pointX: -2.2,
    h: 1.2,
    mission: {
      title: "平らな場所を見つける",
      description: "傾きが 0 に近い場所へ点を運ぶとクリアです。",
      type: "zero"
    }
  },
  {
    id: "sine",
    label: "波うちライン",
    expression: "sin(x) * 2.8",
    xRange: 7,
    yRange: 4,
    pointX: -1.2,
    h: 0.9,
    mission: {
      title: "下り坂から上り坂へ",
      description: "傾きが 0 をまたぐ山や谷の近くを探してみます。",
      type: "zero"
    }
  },
  {
    id: "cubic",
    label: "くねくね坂",
    expression: "x^3 / 4 - x",
    xRange: 4,
    yRange: 4,
    pointX: 1.8,
    h: 0.8,
    mission: {
      title: "ちょうどよい上り坂",
      description: "傾きが 2 くらいになる場所を探します。",
      type: "target",
      target: 2
    }
  },
  {
    id: "kink",
    label: "カクッ曲線",
    expression: "abs(x)",
    xRange: 5,
    yRange: 5,
    pointX: 1.2,
    h: 0.8,
    mission: {
      title: "接線が決まらない点を見つける",
      description: "折れ曲がりの真ん中では、接線がうまく 1 本に決まりません。",
      type: "nondiff"
    }
  }
];

const INTEGRAL_PRESETS = [
  {
    id: "wave",
    label: "打ち消しウェーブ",
    expression: "sin(x)",
    xRange: 7,
    yRange: 4,
    interval: [-3.14, 3.14],
    mission: {
      title: "ためた面積を 0 に近づける",
      description: "正の面積と負の面積がつり合う区間を探します。",
      type: "zero"
    }
  },
  {
    id: "tank",
    label: "ため池カーブ",
    expression: "1.6 + cos(x)",
    xRange: 5,
    yRange: 4,
    interval: [-3, 0.2],
    mission: {
      title: "タンクを 5 くらいまでためる",
      description: "区間を動かして、面積メーターを 5 付近まで持っていきます。",
      type: "target",
      target: 5
    }
  },
  {
    id: "swing",
    label: "行ったり来たり",
    expression: "x^3 / 4 - x",
    xRange: 4,
    yRange: 4,
    interval: [-2.4, 2.4],
    mission: {
      title: "正負がちょうど打ち消し合う",
      description: "左と右のたまり方をそろえると、合計が 0 に近づきます。",
      type: "zero"
    }
  }
];

const LINEAR_PRESETS = [
  {
    id: "identity",
    label: "まっすぐ",
    basis: [
      [1, 0],
      [0, 1]
    ]
  },
  {
    id: "stretch",
    label: "ぐいっと伸ばす",
    basis: [
      [2, 0],
      [0, 1]
    ]
  },
  {
    id: "rotate",
    label: "くるっと回す",
    basis: [
      [0.71, 0.71],
      [-0.71, 0.71]
    ]
  },
  {
    id: "shear",
    label: "ずらして傾ける",
    basis: [
      [1, 0],
      [1, 1]
    ]
  },
  {
    id: "flip",
    label: "ひっくり返す",
    basis: [
      [-1, 0],
      [0, 1]
    ]
  }
];

const GEOMETRY_TOOLS = [
  { id: "point", label: "点" },
  { id: "segment", label: "線分" },
  { id: "polygon", label: "多角形" },
  { id: "circle", label: "円" }
];

const CALCULATOR_KEYS = [
  ["7", "8", "9", "/", "sqrt("],
  ["4", "5", "6", "*", "^"],
  ["1", "2", "3", "-", "("],
  ["0", ".", "pi", "+", ")"],
  ["sin(", "cos(", "tan(", "log(", "exp("]
];

const SAFE_FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sqrt",
  "abs",
  "exp",
  "log",
  "log10",
  "pow",
  "min",
  "max",
  "floor",
  "ceil",
  "round",
  "ln"
]);

export function MathCommunityApp() {
  const [activeTab, setActiveTab] = useState("graph");

  return (
    <div className="dashboard-layout math-app-shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">数学コミュニティ</h1>
        </div>
      </section>

      <section className="section-grid">
        <div className="arcade-tab-row">
          {APP_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`signature-filter-chip ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "graph" ? <FunctionGraphPanel /> : null}
        {activeTab === "derivative" ? <DerivativePlaygroundPanel /> : null}
        {activeTab === "integral" ? <IntegralPlaygroundPanel /> : null}
        {activeTab === "linear" ? <LinearAlgebraPlaygroundPanel /> : null}
        {activeTab === "geometry" ? <GeometryPanel /> : null}
        {activeTab === "space" ? <SpaceGeometryPanel /> : null}
        {activeTab === "cas" ? <CasPanel /> : null}
        {activeTab === "calculator" ? <CalculatorPanel /> : null}
      </section>
    </div>
  );
}

function FunctionGraphPanel() {
  const canvasRef = useRef(null);
  const [expression, setExpression] = useState("sin(x)");
  const [xRange, setXRange] = useState(10);
  const [yRange, setYRange] = useState(10);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const compiled = useMemo(() => compileMathExpression(expression, ["x"]), [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    drawGraphScene(context, {
      expression,
      compiled,
      xRange,
      yRange,
      hoverPoint
    });
  }, [compiled, expression, hoverPoint, xRange, yRange]);

  function handleMove(event) {
    const canvas = canvasRef.current;
    if (!canvas || !compiled.fn) {
      setHoverPoint(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const worldX = screenToWorldX(x, canvas.width, xRange);
    const worldY = compiled.fn(worldX);

    if (!Number.isFinite(worldY)) {
      setHoverPoint(null);
      return;
    }

    setHoverPoint({
      x: worldX,
      y: worldY
    });
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverPoint(null)}
        />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>f(x)</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(x)" />
          </label>

          <div className="math-mini-grid">
            <label className="field">
              <span>x 範囲</span>
              <input
                type="number"
                min="2"
                max="50"
                step="1"
                value={xRange}
                onChange={(event) => setXRange(clampNumber(event.target.value, 2, 50, 10))}
              />
            </label>
            <label className="field">
              <span>y 範囲</span>
              <input
                type="number"
                min="2"
                max="50"
                step="1"
                value={yRange}
                onChange={(event) => setYRange(clampNumber(event.target.value, 2, 50, 10))}
              />
            </label>
          </div>

          <div className="math-chip-row">
            {GRAPH_PRESETS.map((preset) => (
              <button key={preset} type="button" className="button button-ghost button-small" onClick={() => setExpression(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className={`button ${guideOpen ? "button-primary" : "button-secondary"}`}
              onClick={() => setGuideOpen((current) => !current)}
            >
              関数グラフガイド
            </button>
          </div>

          <div className="math-readout">
            <strong>{compiled.error ? "式を確認してください" : "グラフを描画中"}</strong>
            <span>{compiled.error || "カーソルを重ねると座標を表示します。"}</span>
          </div>

          <div className="math-readout">
            <strong>読み取り</strong>
            <span>
              {hoverPoint
                ? `x = ${formatNumber(hoverPoint.x)}, y = ${formatNumber(hoverPoint.y)}`
                : "グラフ上にカーソルを置いてください。"}
            </span>
          </div>

          {guideOpen ? (
            <div className="math-guide-card">
              <div className="math-guide-section">
                <h3>関数グラフって何？</h3>
                <p>
                  関数グラフは、<strong>x を動かしたときに y がどう変わるか</strong>を線で見えるようにしたものです。
                  たとえば <code>y = x^2</code> なら、x が大きくなるほど y も大きくなり、放物線が描かれます。
                </p>
              </div>

              <div className="math-guide-section">
                <h3>このアプリでやること</h3>
                <p>
                  右上の <code>f(x)</code> に式を書くと、左のキャンバスにグラフが出ます。まずは
                  <code>sin(x)</code> や <code>x^2</code> を入れると動きが分かりやすいです。
                </p>
              </div>

              <div className="math-guide-section">
                <h3>どう遊ぶ？</h3>
                <ul className="math-guide-list">
                  <li>
                    <strong>式を書く</strong>
                    : 例 <code>sin(x)</code>, <code>x^2 - 4</code>, <code>sqrt(abs(x))</code>
                  </li>
                  <li>
                    <strong>x 範囲 / y 範囲を変える</strong>
                    : 拡大・縮小する感覚です
                  </li>
                  <li>
                    <strong>グラフにカーソルを重ねる</strong>
                    : その場所の <code>x</code> と <code>y</code> を読めます
                  </li>
                  <li>
                    <strong>プリセットを押す</strong>
                    : まずは形を眺めながら違いを見ます
                  </li>
                </ul>
              </div>

              <div className="math-guide-section">
                <h3>入力のコツ</h3>
                <ul className="math-guide-list">
                  <li>
                    掛け算は <code>2*x</code> のように <code>*</code> を書きます
                  </li>
                  <li>
                    べき乗は <code>x^2</code>
                  </li>
                  <li>
                    円周率は <code>pi</code>
                  </li>
                  <li>
                    使いやすい関数: <code>sin</code>, <code>cos</code>, <code>sqrt</code>, <code>abs</code>, <code>exp</code>, <code>log</code>
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DerivativePlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(false);
  const [presetId, setPresetId] = useState(DERIVATIVE_PRESETS[0].id);
  const preset = DERIVATIVE_PRESETS.find((item) => item.id === presetId) || DERIVATIVE_PRESETS[0];
  const [pointX, setPointX] = useState(preset.pointX);
  const [h, setH] = useState(preset.h);
  const [showSecant, setShowSecant] = useState(true);
  const [showTangent, setShowTangent] = useState(true);

  useEffect(() => {
    setPointX(preset.pointX);
    setH(preset.h);
  }, [preset]);

  const compiled = useMemo(() => compileMathExpression(preset.expression, ["x"]), [preset.expression]);
  const snapshot = useMemo(() => {
    if (!compiled.fn) return null;
    return buildDerivativeSnapshot(compiled.fn, pointX, h);
  }, [compiled, pointX, h]);
  const mission = useMemo(() => buildDerivativeMissionState(preset, snapshot), [preset, snapshot]);
  const slopeLabel = useMemo(() => describeSlope(snapshot?.tangentSlope ?? snapshot?.secantSlope), [snapshot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawDerivativeScene(context, {
      compiled,
      preset,
      snapshot,
      showSecant,
      showTangent
    });
  }, [compiled, preset, showSecant, showTangent, snapshot]);

  function updatePointFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas || !compiled.fn) return;
    const point = eventToCanvasPoint(event, canvas);
    setPointX(clampFloat(screenToWorldX(point.x, canvas.width, preset.xRange), -preset.xRange, preset.xRange, pointX));
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas"
          onMouseDown={(event) => {
            dragRef.current = true;
            updatePointFromEvent(event);
          }}
          onMouseMove={(event) => {
            if (dragRef.current) updatePointFromEvent(event);
          }}
          onMouseUp={() => {
            dragRef.current = false;
          }}
          onMouseLeave={() => {
            dragRef.current = false;
          }}
        />
      }
      caption="点を左右にドラッグすると、その場所の坂のきつさが変わります。オレンジの割線と紫の接線を見比べてください。"
      controls={
        <>
          <div className="math-card-head">
            <h2>坂道ハンター</h2>
          </div>

          <MathPresetRow options={DERIVATIVE_PRESETS} activeId={presetId} onSelect={setPresetId} />

          <div className="math-readout">
            <strong>いま見ている曲線</strong>
            <span>{preset.expression}</span>
          </div>

          <MathSliderField label="見る場所を動かす" min={-preset.xRange} max={preset.xRange} step="0.01" value={pointX} onChange={setPointX} />
          <MathSliderField label="h を小さくする" min="0.08" max="2.2" step="0.01" value={h} onChange={setH} />

          <div className="math-toggle-grid">
            <MathToggleField label="割線を表示" checked={showSecant} onChange={setShowSecant} />
            <MathToggleField label="接線を表示" checked={showTangent} onChange={setShowTangent} />
          </div>

          <div className="math-kpi-grid">
            <MathKpi label="x の位置" value={formatNumber(pointX)} />
            <MathKpi label="割線の傾き" value={snapshot ? formatNumber(snapshot.secantSlope) : "—"} />
            <MathKpi label="接線の傾き" value={snapshot?.differentiable ? formatNumber(snapshot.tangentSlope) : "カクッ"} />
            <MathKpi label="坂の感じ" value={describeSlope(snapshot?.tangentSlope ?? snapshot?.secantSlope)} />
          </div>

          <MathValueMeter
            label="傾きメーター"
            value={snapshot?.differentiable ? snapshot.tangentSlope : snapshot?.secantSlope || 0}
            min={-4}
            max={4}
            accentClass={snapshot?.differentiable ? derivativeMeterTone(snapshot?.tangentSlope) : "is-warm"}
            valueLabel={snapshot?.differentiable ? `${formatNumber(snapshot?.tangentSlope)} / その場の勢い` : "接線が決まりにくい点"}
            displayValue={snapshot?.differentiable ? formatNumber(snapshot?.tangentSlope) : formatNumber(snapshot?.secantSlope || 0)}
          />

          <div className="math-legend-row">
            <span><i className="math-legend-dot is-orange" /> 割線</span>
            <span><i className="math-legend-dot is-purple" /> 接線</span>
            <span><i className="math-legend-dot is-dark" /> いまの点</span>
          </div>
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              いまの点は <strong>{slopeLabel}</strong> です。{snapshot?.differentiable
                ? " h を小さくすると、オレンジの割線が紫の接線にだんだん重なっていきます。"
                : " 折れ曲がりの近くでは、左右の坂がそろわず、接線が 1 本に決まりにくくなります。"}
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function IntegralPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragHandleRef = useRef(null);
  const animationRef = useRef(null);
  const autoSweepRef = useRef(null);
  const [presetId, setPresetId] = useState(INTEGRAL_PRESETS[0].id);
  const preset = INTEGRAL_PRESETS.find((item) => item.id === presetId) || INTEGRAL_PRESETS[0];
  const [interval, setIntervalRange] = useState({ a: preset.interval[0], b: preset.interval[1] });
  const [partitions, setPartitions] = useState(12);
  const [fillProgress, setFillProgress] = useState(1);
  const [showRiemann, setShowRiemann] = useState(true);
  const [autoSweep, setAutoSweep] = useState(false);

  useEffect(() => {
    setIntervalRange({ a: preset.interval[0], b: preset.interval[1] });
    setPartitions(12);
    setAutoSweep(false);
  }, [preset]);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const startedAt = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / 520);
      setFillProgress(progress);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(frame);
      }
    }

    setFillProgress(0);
    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [interval.a, interval.b, partitions, preset.id]);

  useEffect(() => {
    if (!autoSweep) {
      if (autoSweepRef.current) cancelAnimationFrame(autoSweepRef.current);
      return;
    }

    const startedAt = performance.now();
    const startA = interval.a;
    const endB = preset.xRange;

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / 2800);
      const nextB = startA + (endB - startA) * progress;
      setIntervalRange((current) => ({ a: current.a, b: Math.max(current.a + 0.2, nextB) }));
      if (progress < 1) {
        autoSweepRef.current = requestAnimationFrame(frame);
      } else {
        setAutoSweep(false);
      }
    }

    autoSweepRef.current = requestAnimationFrame(frame);
    return () => {
      if (autoSweepRef.current) cancelAnimationFrame(autoSweepRef.current);
    };
  }, [autoSweep, interval.a, preset.xRange]);

  const compiled = useMemo(() => compileMathExpression(preset.expression, ["x"]), [preset.expression]);
  const exactArea = useMemo(() => {
    if (!compiled.fn) return Number.NaN;
    return simpsonIntegral(compiled.fn, interval.a, interval.b);
  }, [compiled, interval.a, interval.b]);
  const riemannArea = useMemo(() => {
    if (!compiled.fn) return Number.NaN;
    return riemannSum(compiled.fn, interval.a, interval.b, partitions);
  }, [compiled, interval.a, interval.b, partitions]);
  const mission = useMemo(() => buildIntegralMissionState(preset, exactArea), [preset, exactArea]);
  const animatedEnd = interval.a + (interval.b - interval.a) * fillProgress;
  const integralTone = exactArea < -0.15 ? "is-warm" : exactArea > 0.15 ? "is-positive" : "is-soft";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawIntegralScene(context, {
      compiled,
      preset,
      interval,
      animatedEnd,
      partitions,
      showRiemann
    });
  }, [animatedEnd, compiled, interval, partitions, preset, showRiemann]);

  function updateBoundaryFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = eventToCanvasPoint(event, canvas);
    const worldX = clampFloat(screenToWorldX(point.x, canvas.width, preset.xRange), -preset.xRange, preset.xRange, 0);
    const target = dragHandleRef.current;
    if (target === "a") {
      setIntervalRange((current) => ({ a: Math.min(worldX, current.b - 0.2), b: current.b }));
    } else if (target === "b") {
      setIntervalRange((current) => ({ a: current.a, b: Math.max(worldX, current.a + 0.2) }));
    }
  }

  function selectHandle(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const point = eventToCanvasPoint(event, canvas);
    const aX = worldToScreenX(interval.a, canvas.width, preset.xRange);
    const bX = worldToScreenX(interval.b, canvas.width, preset.xRange);
    return Math.abs(point.x - aX) <= Math.abs(point.x - bX) ? "a" : "b";
  }

  const tankFill = Math.min(100, (Math.abs(exactArea) / 12) * 100);

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas"
          onMouseDown={(event) => {
            dragHandleRef.current = selectHandle(event);
            updateBoundaryFromEvent(event);
          }}
          onMouseMove={(event) => {
            if (dragHandleRef.current) updateBoundaryFromEvent(event);
          }}
          onMouseUp={() => {
            dragHandleRef.current = null;
          }}
          onMouseLeave={() => {
            dragHandleRef.current = null;
          }}
        />
      }
      caption="水色の区間をドラッグして面積をためます。左から右へ、少しずつタンクに流れ込む感覚で見てください。"
      controls={
        <>
          <div className="math-card-head">
            <h2>面積タンク</h2>
          </div>

          <MathPresetRow options={INTEGRAL_PRESETS} activeId={presetId} onSelect={setPresetId} />

          <div className="math-readout">
            <strong>いま見ている曲線</strong>
            <span>{preset.expression}</span>
          </div>

          <MathSliderField label="分け方を細かくする" min="4" max="48" step="1" value={partitions} onChange={setPartitions} />

          <div className="math-toggle-grid">
            <MathToggleField label="近似の長方形" checked={showRiemann} onChange={setShowRiemann} />
            <MathToggleField label="左から自動でためる" checked={autoSweep} onChange={setAutoSweep} />
          </div>

          <div className="math-kpi-grid">
            <MathKpi label="区間の左端" value={formatNumber(interval.a)} />
            <MathKpi label="区間の右端" value={formatNumber(interval.b)} />
            <MathKpi label="リーマン和" value={formatNumber(riemannArea)} />
            <MathKpi label="積分値" value={formatNumber(exactArea)} />
          </div>

          <div className="math-tank-card">
            <div className="math-tank">
              <div className={`math-tank-fill ${exactArea < 0 ? "is-negative" : ""}`} style={{ height: `${tankFill}%` }} />
              <div className="math-tank-centerline" />
            </div>
            <div className="math-tank-copy">
              <strong>面積メーター</strong>
              <span>{exactArea >= 0 ? "たまっている" : "下向きにたまっている"}</span>
              <strong>{formatNumber(exactArea)}</strong>
            </div>
          </div>

          <MathValueMeter
            label="面積メーター"
            value={exactArea}
            displayValue={formatNumber(exactArea)}
            min={-8}
            max={8}
            accentClass={integralTone}
            valueLabel={exactArea > 0.15 ? "x軸より上のたまりが優勢です" : exactArea < -0.15 ? "x軸より下のたまりが優勢です" : "上と下がつり合いはじめています"}
          />

          <div className="math-legend-row">
            <span><i className="math-legend-dot is-cyan" /> プラスの面積</span>
            <span><i className="math-legend-dot is-pink" /> マイナスの面積</span>
            <span><i className="math-legend-dot is-orange" /> 近似の長方形</span>
          </div>
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              積分は、今いる点の情報ではなく、区間の左から右までを <strong>ためた合計</strong> です。
              {exactArea > 0.15
                ? " 上側の面積が多いので、タンクが上にたまっています。"
                : exactArea < -0.15
                  ? " 下側の面積が多いので、タンクが下向きにたまっています。"
                  : " 上と下がほぼ打ち消し合って、タンクが 0 に近づいています。"}
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function LinearAlgebraPlaygroundPanel() {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const linearRange = 5.5;
  const [showBaseGrid, setShowBaseGrid] = useState(true);
  const [presetId, setPresetId] = useState("identity");
  const [basis, setBasis] = useState({
    u: { x: 1, y: 0 },
    v: { x: 0, y: 1 }
  });

  const determinant = useMemo(() => basis.u.x * basis.v.y - basis.u.y * basis.v.x, [basis]);
  const areaScale = Math.abs(determinant);
  const orientation = determinant > 0.08 ? "そのまま" : determinant < -0.08 ? "反転" : "ぺたんこに近い";
  const reflected = determinant < -0.08;
  const transformationLabel = areaScale < 0.2
    ? "かなり押しつぶされています"
    : reflected
      ? "ひっくり返りながら、平面がゆがんでいます"
      : areaScale > 1.15
        ? "平面が広がりながら、形が変わっています"
        : areaScale < 0.85
          ? "平面が縮みながら、形が変わっています"
          : "面積をほぼ保ったまま、形だけが変わっています";
  const mission = useMemo(() => {
    const areaDone = Math.abs(areaScale - 2) < 0.18;
    const flipDone = determinant < -0.85;
    return {
      title: areaDone ? "向きをひっくり返す" : "面積を 2 倍にする",
      description: areaDone
        ? "次は赤と青の矢印を動かして、黄色い図形の向きを反転させてみましょう。"
        : "赤と青の矢印を動かして、黄色い図形の面積をちょうど 2 倍に近づけます。",
      done: areaDone ? flipDone : areaDone,
      statusText: areaDone
        ? flipDone
          ? "反転が起きました。空間の向きまで変わっています。"
          : `まだ向きは ${orientation} です。左右どちらかの矢印を軸の向こう側へ越えると反転が起きやすいです。`
        : `いまは ${formatNumber(areaScale)} 倍です。2 倍に近づけてみましょう。`
    };
  }, [areaScale, determinant, orientation]);
  const matrixTone = reflected ? "is-warm" : areaScale > 1.15 ? "is-positive" : areaScale < 0.85 ? "is-cool" : "is-soft";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawLinearAlgebraScene(context, basis, { showBaseGrid, range: linearRange });
  }, [basis, showBaseGrid]);

  function applyPreset(id) {
    const preset = LINEAR_PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setPresetId(id);
    setBasis({
      u: { x: preset.basis[0][0], y: preset.basis[0][1] },
      v: { x: preset.basis[1][0], y: preset.basis[1][1] }
    });
  }

  function updateHandleFromEvent(event) {
    const canvas = canvasRef.current;
    if (!canvas || !dragRef.current) return;
    const point = eventToCanvasPoint(event, canvas);
    const world = linearScreenToWorld(point.x, point.y, canvas.width, canvas.height, linearRange);
    const next = {
      x: clampFloat(world.x, -3.2, 3.2, 0),
      y: clampFloat(world.y, -3.2, 3.2, 0)
    };
    setPresetId(null);
    setBasis((current) => ({
      ...current,
      [dragRef.current]: next
    }));
  }

  function pickHandle(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const point = eventToCanvasPoint(event, canvas);
    const uTip = linearWorldToScreen(basis.u.x, basis.u.y, canvas.width, canvas.height, linearRange);
    const vTip = linearWorldToScreen(basis.v.x, basis.v.y, canvas.width, canvas.height, linearRange);
    const uDistance = Math.hypot(point.x - uTip.x, point.y - uTip.y);
    const vDistance = Math.hypot(point.x - vTip.x, point.y - vTip.y);
    if (Math.min(uDistance, vDistance) > 28) return null;
    return uDistance <= vDistance ? "u" : "v";
  }

  return (
    <MathPlaygroundLayout
      workspace={
        <canvas
          ref={canvasRef}
          width={960}
          height={480}
          className="math-canvas"
          onMouseDown={(event) => {
            dragRef.current = pickHandle(event);
            if (dragRef.current) updateHandleFromEvent(event);
          }}
          onMouseMove={(event) => {
            if (dragRef.current) updateHandleFromEvent(event);
          }}
          onMouseUp={() => {
            dragRef.current = null;
          }}
          onMouseLeave={() => {
            dragRef.current = null;
          }}
        />
      }
      caption="赤と青の矢印をドラッグすると、格子全体が同じルールで変形します。数字より先に、平面がどうゆがむかを見てください。"
      controls={
        <>
          <div className="math-card-head">
            <h2>平面ゆがみ工房</h2>
          </div>

          <MathPresetRow options={LINEAR_PRESETS} activeId={presetId} onSelect={applyPreset} />

          <div className="math-toggle-grid">
            <MathToggleField label="元の格子も表示" checked={showBaseGrid} onChange={setShowBaseGrid} />
          </div>

          <div className="math-kpi-grid">
            <MathKpi label="赤い矢印" value={`${formatNumber(basis.u.x)}, ${formatNumber(basis.u.y)}`} />
            <MathKpi label="青い矢印" value={`${formatNumber(basis.v.x)}, ${formatNumber(basis.v.y)}`} />
            <MathKpi label="面積の広がり" value={`${formatNumber(areaScale)} 倍`} />
            <MathKpi label="向き" value={orientation} />
          </div>

          <MathValueMeter
            label="面積の変わり方"
            value={areaScale}
            min={0}
            max={4}
            accentClass={matrixTone}
            valueLabel={reflected ? "向きが反転しています" : "1 を超えると広がり、1 未満だと縮みます"}
          />

          <div className="math-readout math-state-card">
            <strong>いまの変形</strong>
            <span>
              {transformationLabel} 単位正方形の面積は <strong>{formatNumber(areaScale)}</strong> 倍、向きは <strong>{orientation}</strong> です。
            </span>
            <div className="math-inline-matrix" aria-label="いまの変換ルール">
              <span className="math-inline-matrix-bracket">[</span>
              <div className="math-inline-matrix-grid">
                <span>{formatNumber(basis.u.x)}</span>
                <span>{formatNumber(basis.v.x)}</span>
                <span>{formatNumber(basis.u.y)}</span>
                <span>{formatNumber(basis.v.y)}</span>
              </div>
              <span className="math-inline-matrix-bracket">]</span>
            </div>
          </div>

          <div className="math-legend-row">
            <span><i className="math-legend-dot is-dark" /> 元の空間</span>
            <span><i className="math-legend-dot is-cyan" /> 変形した格子</span>
            <span><i className="math-legend-dot is-purple" /> 変形した円</span>
            <span><i className="math-legend-dot is-orange" /> 単位正方形</span>
          </div>
        </>
      }
      footer={
        <>
          <div className="math-footer-note">
            <strong>いま何が起きている？</strong>
            <p>
              赤と青の 2 本の矢印は、平面の新しいものさしです。2 本を動かすと、黄色い図形だけでなく
              <strong> 格子と円ごと空間全体 </strong>
              が変わります。面積が大きくなるほど広がり、マイナスになると向きがひっくり返ります。
            </p>
          </div>
          <MathMissionCard mission={mission} />
        </>
      }
    />
  );
}

function GeometryPanel() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("point");
  const [points, setPoints] = useState([]);
  const [segments, setSegments] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [circles, setCircles] = useState([]);
  const [segmentDraft, setSegmentDraft] = useState(null);
  const [polygonDraft, setPolygonDraft] = useState([]);
  const [circleDraft, setCircleDraft] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawGeometryScene(context, {
      points,
      segments,
      polygons,
      circles,
      polygonDraft,
      segmentDraft,
      circleDraft
    });
  }, [circleDraft, circles, points, polygonDraft, polygons, segmentDraft, segments]);

  function handleCanvasClick(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const world = geometryScreenToWorld(x, y, canvas.width, canvas.height);

    if (tool === "point") {
      setPoints((current) => [...current, { ...world, label: nextPointLabel(current.length) }]);
      return;
    }

    if (tool === "segment") {
      if (!segmentDraft) {
        setSegmentDraft(world);
      } else {
        setSegments((current) => [...current, { start: segmentDraft, end: world }]);
        setSegmentDraft(null);
      }
      return;
    }

    if (tool === "polygon") {
      setPolygonDraft((current) => [...current, world]);
      return;
    }

    if (tool === "circle") {
      if (!circleDraft) {
        setCircleDraft(world);
      } else {
        setCircles((current) => [
          ...current,
          {
            center: circleDraft,
            radius: distanceBetween(circleDraft, world)
          }
        ]);
        setCircleDraft(null);
      }
    }
  }

  function clearAll() {
    setPoints([]);
    setSegments([]);
    setPolygons([]);
    setCircles([]);
    setSegmentDraft(null);
    setPolygonDraft([]);
    setCircleDraft(null);
  }

  function closePolygon() {
    if (polygonDraft.length < 3) return;
    setPolygons((current) => [...current, polygonDraft]);
    setPolygonDraft([]);
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas ref={canvasRef} width={960} height={480} className="math-canvas" onClick={handleCanvasClick} />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <div className="math-chip-row">
            {GEOMETRY_TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`button button-ghost button-small ${tool === item.id ? "is-active" : ""}`}
                onClick={() => setTool(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="math-readout">
            <strong>{toolLabel(tool)}</strong>
            <span>{geometryHint(tool, segmentDraft, polygonDraft, circleDraft)}</span>
          </div>

          <div className="math-kpi-grid">
            <div className="math-kpi">
              <strong>{points.length}</strong>
              <span>点</span>
            </div>
            <div className="math-kpi">
              <strong>{segments.length}</strong>
              <span>線分</span>
            </div>
            <div className="math-kpi">
              <strong>{polygons.length}</strong>
              <span>多角形</span>
            </div>
            <div className="math-kpi">
              <strong>{circles.length}</strong>
              <span>円</span>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="button button-secondary" onClick={closePolygon} disabled={polygonDraft.length < 3}>
              多角形を閉じる
            </button>
            <button type="button" className="button button-ghost" onClick={clearAll}>
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpaceGeometryPanel() {
  const canvasRef = useRef(null);
  const [expression, setExpression] = useState("sin(sqrt(x^2 + y^2))");
  const [rotationX, setRotationX] = useState(0.85);
  const [rotationY, setRotationY] = useState(-0.8);
  const [zoom, setZoom] = useState(34);
  const [zScale, setZScale] = useState(1.7);
  const [gridRange, setGridRange] = useState(5);

  const compiled = useMemo(() => compileMathExpression(expression, ["x", "y"]), [expression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    drawSurfaceScene(context, {
      compiled,
      expression,
      rotationX,
      rotationY,
      zoom,
      zScale,
      gridRange
    });
  }, [compiled, expression, gridRange, rotationX, rotationY, zScale, zoom]);

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card">
        <canvas ref={canvasRef} width={960} height={480} className="math-canvas" />
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>z = f(x, y)</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(sqrt(x^2+y^2))" />
          </label>

          <div className="math-chip-row">
            {SURFACE_PRESETS.map((preset) => (
              <button key={preset} type="button" className="button button-ghost button-small" onClick={() => setExpression(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <label className="field">
            <span>回転 X</span>
            <input
              type="range"
              min="-1.57"
              max="1.57"
              step="0.01"
              value={rotationX}
              onChange={(event) => setRotationX(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>回転 Y</span>
            <input
              type="range"
              min="-3.14"
              max="3.14"
              step="0.01"
              value={rotationY}
              onChange={(event) => setRotationY(Number(event.target.value))}
            />
          </label>

          <div className="math-mini-grid">
            <label className="field">
              <span>ズーム</span>
              <input
                type="number"
                min="12"
                max="60"
                step="1"
                value={zoom}
                onChange={(event) => setZoom(clampNumber(event.target.value, 12, 60, 34))}
              />
            </label>
            <label className="field">
              <span>高さ倍率</span>
              <input
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                value={zScale}
                onChange={(event) => setZScale(clampFloat(event.target.value, 0.5, 5, 1.7))}
              />
            </label>
            <label className="field">
              <span>範囲</span>
              <input
                type="number"
                min="3"
                max="8"
                step="1"
                value={gridRange}
                onChange={(event) => setGridRange(clampNumber(event.target.value, 3, 8, 5))}
              />
            </label>
          </div>

          <div className="math-readout">
            <strong>{compiled.error ? "式を確認してください" : "ワイヤーフレームを表示中"}</strong>
            <span>{compiled.error || "曲面の山や谷を見たい位置まで回転してください。"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CasPanel() {
  const [polyInput, setPolyInput] = useState("(x + 2) * (x - 1) * (x - 3)");
  const [equationInput, setEquationInput] = useState("x^3 - x - 2 = 0");
  const [solveMin, setSolveMin] = useState(-10);
  const [solveMax, setSolveMax] = useState(10);
  const [analysisExpr, setAnalysisExpr] = useState("sin(x)");
  const [derivativePoint, setDerivativePoint] = useState(1);
  const [integralA, setIntegralA] = useState(0);
  const [integralB, setIntegralB] = useState(3.14);

  const polynomialResult = useMemo(() => {
    try {
      const polynomial = parsePolynomial(polyInput);
      return {
        expanded: formatPolynomial(polynomial),
        factorized: factorPolynomial(polynomial),
        derivative: formatPolynomial(derivePolynomial(polynomial))
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [polyInput]);

  const solverResult = useMemo(() => {
    try {
      const solveFn = compileEquation(equationInput);
      return {
        roots: solveEquationRoots(solveFn, solveMin, solveMax)
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [equationInput, solveMax, solveMin]);

  const calculusResult = useMemo(() => {
    try {
      const compiled = compileMathExpression(analysisExpr, ["x"]);
      if (compiled.error) {
        throw new Error(compiled.error);
      }

      return {
        slope: numericDerivative(compiled.fn, derivativePoint),
        area: simpsonIntegral(compiled.fn, integralA, integralB)
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }, [analysisExpr, derivativePoint, integralA, integralB]);

  return (
    <div className="math-panel-grid math-panel-grid-stacked">
      <div className="surface math-card">
        <div className="math-card-head">
          <h2>多項式</h2>
        </div>
        <div className="math-mini-grid">
          <label className="field">
            <span>式</span>
            <input value={polyInput} onChange={(event) => setPolyInput(event.target.value)} placeholder="(x + 1) * (x - 2)" />
          </label>
          <div className="math-results-list">
            <div className="math-readout">
              <strong>展開</strong>
              <span>{polynomialResult.error || polynomialResult.expanded}</span>
            </div>
            <div className="math-readout">
              <strong>因数分解</strong>
              <span>{polynomialResult.error || polynomialResult.factorized}</span>
            </div>
            <div className="math-readout">
              <strong>微分</strong>
              <span>{polynomialResult.error || polynomialResult.derivative}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="surface math-card">
        <div className="math-card-head">
          <h2>方程式を解く</h2>
        </div>
        <div className="math-mini-grid math-mini-grid-wide">
          <label className="field">
            <span>方程式</span>
            <input value={equationInput} onChange={(event) => setEquationInput(event.target.value)} placeholder="x^2 - 4 = 0" />
          </label>
          <label className="field">
            <span>範囲 min</span>
            <input type="number" value={solveMin} onChange={(event) => setSolveMin(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>範囲 max</span>
            <input type="number" value={solveMax} onChange={(event) => setSolveMax(Number(event.target.value))} />
          </label>
        </div>
        <div className="math-readout">
          <strong>解</strong>
          <span>
            {solverResult.error
              ? solverResult.error
              : solverResult.roots.length
                ? solverResult.roots.map((root) => `x ≈ ${formatNumber(root)}`).join(" / ")
                : "範囲内で解を見つけられませんでした。"}
          </span>
        </div>
      </div>

      <div className="surface math-card">
        <div className="math-card-head">
          <h2>微分 / 積分</h2>
        </div>
        <div className="math-mini-grid math-mini-grid-wide">
          <label className="field">
            <span>f(x)</span>
            <input value={analysisExpr} onChange={(event) => setAnalysisExpr(event.target.value)} placeholder="sin(x)" />
          </label>
          <label className="field">
            <span>微分する点</span>
            <input
              type="number"
              value={derivativePoint}
              onChange={(event) => setDerivativePoint(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>積分 a</span>
            <input type="number" value={integralA} onChange={(event) => setIntegralA(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>積分 b</span>
            <input type="number" value={integralB} onChange={(event) => setIntegralB(Number(event.target.value))} />
          </label>
        </div>
        <div className="math-results-list">
          <div className="math-readout">
            <strong>微分係数</strong>
            <span>{calculusResult.error ? calculusResult.error : formatNumber(calculusResult.slope)}</span>
          </div>
          <div className="math-readout">
            <strong>定積分</strong>
            <span>{calculusResult.error ? calculusResult.error : formatNumber(calculusResult.area)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalculatorPanel() {
  const [expression, setExpression] = useState("sin(pi / 4) + 2^3");
  const [statsInput, setStatsInput] = useState("3, 5, 7, 11");

  const calculation = useMemo(() => {
    if (!expression.trim()) return { value: "0" };
    const compiled = compileMathExpression(expression, []);
    if (compiled.error) return { error: compiled.error };

    try {
      const value = compiled.fn();
      return { value: formatNumber(value) };
    } catch (error) {
      return { error: error.message };
    }
  }, [expression]);

  const stats = useMemo(() => {
    const values = statsInput
      .split(/[\n, ]+/)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return null;

    const sorted = [...values].sort((left, right) => left - right);
    const sum = values.reduce((total, value) => total + value, 0);
    const mean = sum / values.length;
    const median =
      sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;

    return {
      count: values.length,
      sum,
      mean,
      median,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }, [statsInput]);

  function appendValue(value) {
    setExpression((current) => `${current}${value}`);
  }

  return (
    <div className="math-panel-grid">
      <div className="surface math-workspace-card math-calculator-card">
        <div className="math-calc-display">
          <div className="math-calc-expression">{expression || "0"}</div>
          <strong className="math-calc-result">{calculation.error ? calculation.error : calculation.value}</strong>
        </div>

        <div className="math-calculator-keypad">
          {CALCULATOR_KEYS.flat().map((key) => (
            <button key={key} type="button" className="button button-ghost math-key" onClick={() => appendValue(key)}>
              {key}
            </button>
          ))}
          <button type="button" className="button button-secondary math-key" onClick={() => setExpression("")}>
            AC
          </button>
          <button type="button" className="button button-ghost math-key" onClick={() => setExpression((current) => current.slice(0, -1))}>
            ⌫
          </button>
          <button type="button" className="button button-primary math-key" onClick={() => setExpression((current) => `${current}`)}>
            =
          </button>
        </div>
      </div>

      <div className="surface math-side-card">
        <div className="math-control-stack">
          <label className="field">
            <span>式</span>
            <input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(pi / 4) + 2^3" />
          </label>

          <label className="field">
            <span>統計データ</span>
            <textarea
              rows={6}
              value={statsInput}
              onChange={(event) => setStatsInput(event.target.value)}
              placeholder="3, 5, 7, 11"
            />
          </label>

          {stats ? (
            <div className="math-stats-grid">
              <MathStat label="件数" value={stats.count} />
              <MathStat label="合計" value={formatNumber(stats.sum)} />
              <MathStat label="平均" value={formatNumber(stats.mean)} />
              <MathStat label="中央値" value={formatNumber(stats.median)} />
              <MathStat label="標準偏差" value={formatNumber(stats.std)} />
              <MathStat label="最小 / 最大" value={`${formatNumber(stats.min)} / ${formatNumber(stats.max)}`} />
            </div>
          ) : (
            <div className="math-readout">
              <strong>統計</strong>
              <span>数値をカンマ区切りで入れると、基本統計を表示します。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MathStat({ label, value }) {
  return (
    <div className="math-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function compileEquation(input) {
  const source = `${input || ""}`.trim();
  if (!source) {
    throw new Error("方程式を入力してください。");
  }

  if (source.includes("=")) {
    const [left, right] = source.split("=");
    const leftCompiled = compileMathExpression(left, ["x"]);
    const rightCompiled = compileMathExpression(right, ["x"]);

    if (leftCompiled.error) throw new Error(leftCompiled.error);
    if (rightCompiled.error) throw new Error(rightCompiled.error);

    return (x) => leftCompiled.fn(x) - rightCompiled.fn(x);
  }

  const compiled = compileMathExpression(source, ["x"]);
  if (compiled.error) throw new Error(compiled.error);
  return compiled.fn;
}

function solveEquationRoots(fn, min, max) {
  const roots = [];
  const steps = 280;
  let previousX = min;
  let previousY = safeEvaluate(fn, previousX);

  for (let index = 1; index <= steps; index += 1) {
    const currentX = min + ((max - min) * index) / steps;
    const currentY = safeEvaluate(fn, currentX);

    if (Number.isFinite(previousY) && Math.abs(previousY) < 1e-6) {
      pushUnique(roots, previousX);
    }

    if (Number.isFinite(previousY) && Number.isFinite(currentY) && previousY * currentY < 0) {
      pushUnique(roots, bisectRoot(fn, previousX, currentX));
    }

    previousX = currentX;
    previousY = currentY;
  }

  return roots.sort((left, right) => left - right);
}

function bisectRoot(fn, left, right) {
  let min = left;
  let max = right;
  let minValue = safeEvaluate(fn, min);
  let maxValue = safeEvaluate(fn, max);

  for (let index = 0; index < 40; index += 1) {
    const middle = (min + max) / 2;
    const middleValue = safeEvaluate(fn, middle);

    if (!Number.isFinite(middleValue) || Math.abs(middleValue) < 1e-7) {
      return middle;
    }

    if (minValue * middleValue <= 0) {
      max = middle;
      maxValue = middleValue;
    } else {
      min = middle;
      minValue = middleValue;
    }
  }

  return (min + max) / 2;
}

function numericDerivative(fn, x) {
  const step = 1e-4;
  return (safeEvaluate(fn, x + step) - safeEvaluate(fn, x - step)) / (2 * step);
}

function simpsonIntegral(fn, left, right) {
  const steps = 240;
  if (left === right) return 0;

  let a = left;
  let b = right;
  let sign = 1;

  if (a > b) {
    a = right;
    b = left;
    sign = -1;
  }

  const width = (b - a) / steps;
  let total = safeEvaluate(fn, a) + safeEvaluate(fn, b);

  for (let index = 1; index < steps; index += 1) {
    const x = a + width * index;
    total += safeEvaluate(fn, x) * (index % 2 === 0 ? 2 : 4);
  }

  return sign * (total * width) / 3;
}

function compileMathExpression(expression, variables = []) {
  const source = `${expression || ""}`.trim();
  if (!source) {
    return { error: "式を入力してください。" };
  }

  const normalized = source.replace(/π/g, "pi").replace(/\^/g, "**");
  const invalidCharacter = normalized.match(/[^0-9A-Za-z_+\-*/()., <>=!&|%]/);

  if (invalidCharacter) {
    return { error: `使えない文字があります: ${invalidCharacter[0]}` };
  }

  const identifiers = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const identifier of identifiers) {
    if (!variables.includes(identifier) && !SAFE_FUNCTIONS.has(identifier) && !["pi", "PI", "e", "E"].includes(identifier)) {
      return { error: `未対応の識別子です: ${identifier}` };
    }
  }

  try {
    const fn = new Function(
      ...variables,
      `"use strict";
      const { sin, cos, tan, asin, acos, atan, sqrt, abs, exp, log, log10, pow, min, max, floor, ceil, round } = Math;
      const ln = Math.log;
      const pi = Math.PI;
      const PI = Math.PI;
      const e = Math.E;
      const E = Math.E;
      return (${normalized});`
    );

    return {
      fn: (...args) => {
        const value = fn(...args);
        return Number.isFinite(value) ? value : Number.NaN;
      }
    };
  } catch (error) {
    return { error: "式を解釈できませんでした。" };
  }
}

function drawGraphScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.xRange, config.yRange);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  context.save();
  context.lineWidth = 3;
  context.strokeStyle = "#0f766e";
  context.beginPath();

  let open = false;
  for (let pixel = 0; pixel <= canvas.width; pixel += 1) {
    const x = screenToWorldX(pixel, canvas.width, config.xRange);
    const y = config.compiled.fn(x);
    if (!Number.isFinite(y) || Math.abs(y) > config.yRange * 4) {
      open = false;
      continue;
    }

    const screenY = worldToScreenY(y, canvas.height, config.yRange);
    if (!open) {
      context.moveTo(pixel, screenY);
      open = true;
    } else {
      context.lineTo(pixel, screenY);
    }
  }
  context.stroke();
  context.restore();

  if (config.hoverPoint && Number.isFinite(config.hoverPoint.y)) {
    const screenX = worldToScreenX(config.hoverPoint.x, canvas.width, config.xRange);
    const screenY = worldToScreenY(config.hoverPoint.y, canvas.height, config.yRange);

    context.save();
    context.strokeStyle = "rgba(14, 116, 144, 0.25)";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, canvas.height);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#111827";
    context.beginPath();
    context.arc(screenX, screenY, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawDerivativeScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.preset.xRange, config.preset.yRange);

  if (!config.compiled.fn || !config.snapshot) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  drawFunctionCurve(context, config.compiled.fn, config.preset.xRange, config.preset.yRange, {
    strokeStyle: "#0f766e",
    lineWidth: 3
  });

  const point = {
    x: worldToScreenX(config.snapshot.x, canvas.width, config.preset.xRange),
    y: worldToScreenY(config.snapshot.y, canvas.height, config.preset.yRange)
  };
  const secantPoint = {
    x: worldToScreenX(config.snapshot.x + config.snapshot.h, canvas.width, config.preset.xRange),
    y: worldToScreenY(config.snapshot.secantY, canvas.height, config.preset.yRange)
  };

  context.save();
  if (config.showSecant) {
    context.strokeStyle = "#ea580c";
    context.lineWidth = 2.2;
    context.setLineDash([10, 8]);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(secantPoint.x, secantPoint.y);
    context.stroke();
    context.setLineDash([]);
  }

  if (config.showTangent && config.snapshot.differentiable) {
    drawSlopeLine(
      context,
      config.snapshot.x,
      config.snapshot.y,
      config.snapshot.tangentSlope,
      config.preset.xRange,
      config.preset.yRange,
      derivativeLineColor(config.snapshot.tangentSlope)
    );
  }

  context.strokeStyle = "rgba(15, 23, 42, 0.18)";
  context.beginPath();
  context.moveTo(point.x, 0);
  context.lineTo(point.x, canvas.height);
  context.stroke();

  context.fillStyle = "#111827";
  context.beginPath();
  context.arc(point.x, point.y, 7, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ea580c";
  context.beginPath();
  context.arc(secantPoint.x, secantPoint.y, 5.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawIntegralScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, config.preset.xRange, config.preset.yRange);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  const axisY = worldToScreenY(0, canvas.height, config.preset.yRange);
  drawFunctionCurve(context, config.compiled.fn, config.preset.xRange, config.preset.yRange, {
    strokeStyle: "#0f766e",
    lineWidth: 3
  });

  drawIntegralFill(context, config.compiled.fn, config.interval.a, config.animatedEnd, config.preset.xRange, config.preset.yRange);
  if (config.showRiemann) {
    drawRiemannBars(context, config.compiled.fn, config.interval.a, config.interval.b, config.partitions, config.preset.xRange, config.preset.yRange);
  }

  context.save();
  const handleColors = {
    a: "#0f766e",
    b: "#1d4ed8"
  };
  for (const [key, xValue] of Object.entries({ a: config.interval.a, b: config.interval.b })) {
    const screenX = worldToScreenX(xValue, canvas.width, config.preset.xRange);
    context.strokeStyle = handleColors[key];
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, canvas.height);
    context.stroke();
    context.fillStyle = handleColors[key];
    context.beginPath();
    context.arc(screenX, axisY, 7, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawLinearAlgebraScene(context, basis, options = {}) {
  const { canvas } = context;
  const range = options.range ?? 5.5;
  const determinant = basis.u.x * basis.v.y - basis.u.y * basis.v.x;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);

  if (options.showBaseGrid) {
    drawLinearGrid(context, canvas.width, canvas.height, range, null, "rgba(148, 163, 184, 0.2)", 1);
  }
  drawLinearAxes(context, canvas.width, canvas.height, range);
  drawLinearGrid(context, canvas.width, canvas.height, range, basis, "rgba(15, 118, 110, 0.45)", 1.6);
  drawLinearUnitCircle(context, canvas.width, canvas.height, range, null, {
    strokeStyle: "rgba(17, 24, 39, 0.18)",
    fillStyle: "rgba(255, 255, 255, 0.18)",
    dashed: true
  });
  drawLinearUnitCircle(context, canvas.width, canvas.height, range, basis, {
    strokeStyle: determinant < 0 ? "rgba(236, 72, 153, 0.72)" : "rgba(124, 58, 237, 0.74)",
    fillStyle: determinant < 0 ? "rgba(244, 114, 182, 0.14)" : "rgba(124, 58, 237, 0.12)"
  });
  drawLinearShape(context, canvas.width, canvas.height, range, basis, determinant);
  drawLinearVector(context, canvas.width, canvas.height, range, basis.u, "#dc2626", "u");
  drawLinearVector(context, canvas.width, canvas.height, range, basis.v, "#2563eb", "v");
}

function drawSlopeLine(context, x, y, slope, xRange, yRange, color) {
  const { canvas } = context;
  const leftX = -xRange;
  const rightX = xRange;
  const leftY = y + slope * (leftX - x);
  const rightY = y + slope * (rightX - x);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 2.2;
  context.beginPath();
  context.moveTo(worldToScreenX(leftX, canvas.width, xRange), worldToScreenY(leftY, canvas.height, yRange));
  context.lineTo(worldToScreenX(rightX, canvas.width, xRange), worldToScreenY(rightY, canvas.height, yRange));
  context.stroke();
  context.restore();
}

function drawIntegralFill(context, fn, left, right, xRange, yRange) {
  const { canvas } = context;
  if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(right - left) < 1e-4) return;
  const a = Math.min(left, right);
  const b = Math.max(left, right);
  const axisY = worldToScreenY(0, canvas.height, yRange);
  const positiveFill = "rgba(34, 211, 238, 0.24)";
  const negativeFill = "rgba(244, 114, 182, 0.22)";
  const steps = 180;

  context.save();
  for (let index = 0; index < steps; index += 1) {
    const x1 = a + ((b - a) * index) / steps;
    const x2 = a + ((b - a) * (index + 1)) / steps;
    const y1 = safeEvaluate(fn, x1);
    const y2 = safeEvaluate(fn, x2);
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) continue;

    const sx1 = worldToScreenX(x1, canvas.width, xRange);
    const sx2 = worldToScreenX(x2, canvas.width, xRange);
    const sy1 = worldToScreenY(y1, canvas.height, yRange);
    const sy2 = worldToScreenY(y2, canvas.height, yRange);

    const fillStrip = (startX, endX, startY, endY, fillStyle) => {
      context.fillStyle = fillStyle;
      context.beginPath();
      context.moveTo(startX, axisY);
      context.lineTo(startX, startY);
      context.lineTo(endX, endY);
      context.lineTo(endX, axisY);
      context.closePath();
      context.fill();
    };

    if ((y1 >= 0 && y2 >= 0) || (y1 <= 0 && y2 <= 0)) {
      fillStrip(sx1, sx2, sy1, sy2, y1 >= 0 ? positiveFill : negativeFill);
      continue;
    }

    const ratio = Math.abs(y1) / (Math.abs(y1) + Math.abs(y2));
    const crossX = x1 + (x2 - x1) * ratio;
    const crossScreenX = worldToScreenX(crossX, canvas.width, xRange);
    fillStrip(sx1, crossScreenX, sy1, axisY, y1 >= 0 ? positiveFill : negativeFill);
    fillStrip(crossScreenX, sx2, axisY, sy2, y2 >= 0 ? positiveFill : negativeFill);
  }
  context.restore();
}

function drawRiemannBars(context, fn, left, right, partitions, xRange, yRange) {
  const { canvas } = context;
  const steps = Math.max(1, partitions);
  const width = (right - left) / steps;
  const axisY = worldToScreenY(0, canvas.height, yRange);

  context.save();
  context.fillStyle = "rgba(249, 115, 22, 0.12)";
  context.strokeStyle = "rgba(249, 115, 22, 0.42)";
  context.lineWidth = 1;

  for (let index = 0; index < steps; index += 1) {
    const x = left + width * index;
    const sampleX = x + width / 2;
    const y = safeEvaluate(fn, sampleX);
    if (!Number.isFinite(y)) continue;
    const screenX = worldToScreenX(x, canvas.width, xRange);
    const screenWidth = Math.abs(worldToScreenX(x + width, canvas.width, xRange) - screenX);
    const screenY = worldToScreenY(y, canvas.height, yRange);
    const rectTop = Math.min(axisY, screenY);
    const rectHeight = Math.abs(axisY - screenY);
    context.fillStyle = y >= 0 ? "rgba(249, 115, 22, 0.14)" : "rgba(236, 72, 153, 0.14)";
    context.strokeStyle = y >= 0 ? "rgba(249, 115, 22, 0.42)" : "rgba(236, 72, 153, 0.4)";
    context.fillRect(screenX, rectTop, screenWidth, rectHeight);
    context.strokeRect(screenX, rectTop, screenWidth, rectHeight);
  }
  context.restore();
}

function drawLinearGrid(context, width, height, range, basis, strokeStyle, lineWidth) {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;

  for (let tick = -5; tick <= 5; tick += 1) {
    context.beginPath();
    for (let y = -5; y <= 5; y += 0.25) {
      const point = basis ? applyBasisTransform({ x: tick, y }, basis) : { x: tick, y };
      const screen = linearWorldToScreen(point.x, point.y, width, height, range);
      if (y === -5) context.moveTo(screen.x, screen.y);
      else context.lineTo(screen.x, screen.y);
    }
    context.stroke();

    context.beginPath();
    for (let x = -5; x <= 5; x += 0.25) {
      const point = basis ? applyBasisTransform({ x, y: tick }, basis) : { x, y: tick };
      const screen = linearWorldToScreen(point.x, point.y, width, height, range);
      if (x === -5) context.moveTo(screen.x, screen.y);
      else context.lineTo(screen.x, screen.y);
    }
    context.stroke();
  }
  context.restore();
}

function drawLinearAxes(context, width, height, range) {
  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.34)";
  context.lineWidth = 2;
  const originLeft = linearWorldToScreen(-range, 0, width, height, range);
  const originRight = linearWorldToScreen(range, 0, width, height, range);
  const originTop = linearWorldToScreen(0, range, width, height, range);
  const originBottom = linearWorldToScreen(0, -range, width, height, range);
  context.beginPath();
  context.moveTo(originLeft.x, originLeft.y);
  context.lineTo(originRight.x, originRight.y);
  context.moveTo(originTop.x, originTop.y);
  context.lineTo(originBottom.x, originBottom.y);
  context.stroke();
  context.restore();
}

function drawLinearShape(context, width, height, range, basis, determinant) {
  const originalSquare = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];
  const transformed = originalSquare.map((point) => applyBasisTransform(point, basis));

  context.save();
  context.fillStyle = determinant < 0 ? "rgba(251, 113, 133, 0.24)" : "rgba(253, 224, 71, 0.32)";
  context.strokeStyle = determinant < 0 ? "rgba(225, 29, 72, 0.82)" : "rgba(202, 138, 4, 0.82)";
  context.lineWidth = 2;
  context.beginPath();
  transformed.forEach((point, index) => {
    const screen = linearWorldToScreen(point.x, point.y, width, height, range);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawLinearUnitCircle(context, width, height, range, basis, options = {}) {
  const sampleCount = 80;
  context.save();
  context.strokeStyle = options.strokeStyle || "rgba(124, 58, 237, 0.74)";
  context.fillStyle = options.fillStyle || "rgba(124, 58, 237, 0.12)";
  context.lineWidth = 2;
  if (options.dashed) context.setLineDash([8, 8]);
  context.beginPath();
  for (let index = 0; index <= sampleCount; index += 1) {
    const theta = (Math.PI * 2 * index) / sampleCount;
    const point = {
      x: Math.cos(theta),
      y: Math.sin(theta)
    };
    const transformed = basis ? applyBasisTransform(point, basis) : point;
    const screen = linearWorldToScreen(transformed.x, transformed.y, width, height, range);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawLinearVector(context, width, height, range, vector, color, label) {
  const origin = linearWorldToScreen(0, 0, width, height, range);
  const tip = linearWorldToScreen(vector.x, vector.y, width, height, range);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(tip.x, tip.y);
  context.stroke();
  context.beginPath();
  context.arc(tip.x, tip.y, 9, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#0f172a";
  context.font = "600 15px var(--font-sans, sans-serif)";
  context.fillText(label, tip.x + 12, tip.y - 10);
  context.restore();
}

function buildDerivativeSnapshot(fn, x, h) {
  const safeH = Math.max(0.04, Math.abs(h));
  const y = safeEvaluate(fn, x);
  const secantY = safeEvaluate(fn, x + safeH);
  const leftY = safeEvaluate(fn, x - safeH);
  const secantSlope = Number.isFinite(y) && Number.isFinite(secantY) ? (secantY - y) / safeH : Number.NaN;
  const leftSlope = Number.isFinite(leftY) && Number.isFinite(y) ? (y - leftY) / safeH : Number.NaN;
  const rightSlope = secantSlope;
  const tangentSlope = numericDerivative(fn, x);
  const differentiable =
    Number.isFinite(leftSlope) &&
    Number.isFinite(rightSlope) &&
    Math.abs(leftSlope - rightSlope) < Math.max(0.3, Math.abs(leftSlope) * 0.18 + Math.abs(rightSlope) * 0.18);

  return {
    x,
    y,
    h: safeH,
    secantY,
    secantSlope,
    tangentSlope,
    leftSlope,
    rightSlope,
    differentiable
  };
}

function buildDerivativeMissionState(preset, snapshot) {
  if (!snapshot) {
    return {
      ...preset.mission,
      done: false,
      statusText: "まず点を動かしてみてください。"
    };
  }

  let done = false;
  let statusText = "";

  if (preset.mission.type === "zero") {
    const slope = snapshot.differentiable ? snapshot.tangentSlope : snapshot.secantSlope;
    done = Number.isFinite(slope) && Math.abs(slope) < 0.18;
    statusText = done ? "ほとんど平らです。山や谷の近くに来ました。" : `いまの傾きは ${formatNumber(slope)}。まだ坂が残っています。`;
  } else if (preset.mission.type === "target") {
    const slope = snapshot.differentiable ? snapshot.tangentSlope : snapshot.secantSlope;
    done = Number.isFinite(slope) && Math.abs(slope - preset.mission.target) < 0.2;
    statusText = done
      ? `${preset.mission.target} くらいの上り坂を見つけました。`
      : `いまの傾きは ${formatNumber(slope)}。${preset.mission.target} に近づけてみましょう。`;
  } else if (preset.mission.type === "nondiff") {
    done = !snapshot.differentiable && Math.abs(snapshot.x) < 0.18;
    statusText = done
      ? "左右の坂がちがうので、接線が 1 本に定まりません。"
      : "折れ曲がりの真ん中へ点を持っていくと、接線が決めにくくなります。";
  }

  return {
    ...preset.mission,
    done,
    statusText
  };
}

function buildIntegralMissionState(preset, area) {
  let done = false;
  let statusText = "";

  if (preset.mission.type === "zero") {
    done = Number.isFinite(area) && Math.abs(area) < 0.35;
    statusText = done ? "正と負がほぼつり合いました。" : `いまの合計は ${formatNumber(area)}。0 に近づけてみましょう。`;
  } else if (preset.mission.type === "target") {
    done = Number.isFinite(area) && Math.abs(area - preset.mission.target) < 0.35;
    statusText = done
      ? `${preset.mission.target} 付近までためられました。`
      : `いまは ${formatNumber(area)}。${preset.mission.target} を目安に区間を動かします。`;
  }

  return {
    ...preset.mission,
    done,
    statusText
  };
}

function describeSlope(value) {
  if (!Number.isFinite(value)) return "つかみにくい";
  if (Math.abs(value) < 0.18) return "ほぼ平ら";
  if (value > 2) return "かなり急";
  if (value > 0) return "上り坂";
  if (value < -2) return "かなり急な下り";
  return "下り坂";
}

function derivativeLineColor(value) {
  if (!Number.isFinite(value)) return "#7c3aed";
  if (Math.abs(value) < 0.18) return "#f59e0b";
  if (value > 0) return "#16a34a";
  return "#2563eb";
}

function derivativeMeterTone(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < 0.18) return "is-soft";
  if (value > 0) return "is-positive";
  return "is-cool";
}

function riemannSum(fn, left, right, partitions) {
  const steps = Math.max(1, partitions);
  const width = (right - left) / steps;
  let total = 0;
  for (let index = 0; index < steps; index += 1) {
    const x = left + width * (index + 0.5);
    total += safeEvaluate(fn, x) * width;
  }
  return total;
}

function applyBasisTransform(point, basis) {
  return {
    x: point.x * basis.u.x + point.y * basis.v.x,
    y: point.x * basis.u.y + point.y * basis.v.y
  };
}

function drawGeometryScene(context, scene) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);
  drawGraphGrid(context, canvas.width, canvas.height, 10, 10);

  context.save();
  context.lineWidth = 2.5;
  context.strokeStyle = "#1f2937";
  for (const segment of scene.segments) {
    drawGeometrySegment(context, segment.start, segment.end);
  }

  for (const polygon of scene.polygons) {
    drawGeometryPolygon(context, polygon, "rgba(59, 130, 246, 0.18)");
  }

  if (scene.polygonDraft.length > 1) {
    drawGeometryPolygon(context, scene.polygonDraft, "rgba(14, 165, 233, 0.12)", false);
  }

  for (const circle of scene.circles) {
    const center = worldToGeometryScreen(circle.center.x, circle.center.y, canvas.width, canvas.height);
    context.fillStyle = "rgba(168, 85, 247, 0.12)";
    context.strokeStyle = "#7c3aed";
    context.beginPath();
    context.arc(center.x, center.y, circle.radius * geometryScaleX(canvas.width), 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  if (scene.segmentDraft) {
    const center = worldToGeometryScreen(scene.segmentDraft.x, scene.segmentDraft.y, canvas.width, canvas.height);
    context.fillStyle = "#f97316";
    context.beginPath();
    context.arc(center.x, center.y, 6, 0, Math.PI * 2);
    context.fill();
  }

  if (scene.circleDraft) {
    const center = worldToGeometryScreen(scene.circleDraft.x, scene.circleDraft.y, canvas.width, canvas.height);
    context.fillStyle = "#a855f7";
    context.beginPath();
    context.arc(center.x, center.y, 6, 0, Math.PI * 2);
    context.fill();
  }

  for (const point of scene.points) {
    const screen = worldToGeometryScreen(point.x, point.y, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.beginPath();
    context.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#475569";
    context.font = "15px var(--font-sans, sans-serif)";
    context.fillText(point.label, screen.x + 10, screen.y - 10);
  }
  context.restore();
}

function drawGeometrySegment(context, start, end) {
  const canvas = context.canvas;
  const a = worldToGeometryScreen(start.x, start.y, canvas.width, canvas.height);
  const b = worldToGeometryScreen(end.x, end.y, canvas.width, canvas.height);
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
  context.fillStyle = "#2563eb";
  context.beginPath();
  context.arc(a.x, a.y, 4, 0, Math.PI * 2);
  context.arc(b.x, b.y, 4, 0, Math.PI * 2);
  context.fill();
}

function drawGeometryPolygon(context, polygon, fill, closed = true) {
  const canvas = context.canvas;
  context.beginPath();
  polygon.forEach((point, index) => {
    const screen = worldToGeometryScreen(point.x, point.y, canvas.width, canvas.height);
    if (index === 0) {
      context.moveTo(screen.x, screen.y);
    } else {
      context.lineTo(screen.x, screen.y);
    }
  });
  if (closed) {
    context.closePath();
    context.fillStyle = fill;
    context.fill();
  }
  context.strokeStyle = "#2563eb";
  context.stroke();
}

function drawSurfaceScene(context, config) {
  const { canvas } = context;
  context.clearRect(0, 0, canvas.width, canvas.height);
  paintMathBackground(context, canvas.width, canvas.height);

  if (!config.compiled.fn) {
    drawCanvasMessage(context, canvas.width, canvas.height, config.compiled.error || "式を入力してください。");
    return;
  }

  const points = [];
  const steps = 24;
  const range = config.gridRange;

  for (let yIndex = 0; yIndex <= steps; yIndex += 1) {
    const row = [];
    const worldY = -range + (2 * range * yIndex) / steps;
    for (let xIndex = 0; xIndex <= steps; xIndex += 1) {
      const worldX = -range + (2 * range * xIndex) / steps;
      const z = config.compiled.fn(worldX, worldY);
      row.push({
        x: worldX,
        y: worldY,
        z: Number.isFinite(z) ? z : 0
      });
    }
    points.push(row);
  }

  context.save();
  context.strokeStyle = "rgba(15, 118, 110, 0.82)";
  context.lineWidth = 1.4;

  for (let rowIndex = 0; rowIndex <= steps; rowIndex += 1) {
    context.beginPath();
    for (let columnIndex = 0; columnIndex <= steps; columnIndex += 1) {
      const projected = projectSurfacePoint(points[rowIndex][columnIndex], config, canvas);
      if (columnIndex === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }
    context.stroke();
  }

  context.strokeStyle = "rgba(59, 130, 246, 0.55)";
  for (let columnIndex = 0; columnIndex <= steps; columnIndex += 1) {
    context.beginPath();
    for (let rowIndex = 0; rowIndex <= steps; rowIndex += 1) {
      const projected = projectSurfacePoint(points[rowIndex][columnIndex], config, canvas);
      if (rowIndex === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }
    context.stroke();
  }

  context.restore();
}

function projectSurfacePoint(point, config, canvas) {
  const scaledX = point.x;
  const scaledY = point.y;
  const scaledZ = point.z * config.zScale;

  const cosY = Math.cos(config.rotationY);
  const sinY = Math.sin(config.rotationY);
  const cosX = Math.cos(config.rotationX);
  const sinX = Math.sin(config.rotationX);

  const x1 = scaledX * cosY + scaledZ * sinY;
  const z1 = -scaledX * sinY + scaledZ * cosY;
  const y1 = scaledY * cosX - z1 * sinX;

  return {
    x: canvas.width / 2 + x1 * config.zoom,
    y: canvas.height / 2 + y1 * config.zoom
  };
}

function geometryScreenToWorld(x, y, width, height) {
  return {
    x: ((x / width) * 20 - 10).toFixed(2) * 1,
    y: (10 - (y / height) * 20).toFixed(2) * 1
  };
}

function worldToGeometryScreen(x, y, width, height) {
  return {
    x: ((x + 10) / 20) * width,
    y: ((10 - y) / 20) * height
  };
}

function geometryScaleX(width) {
  return width / 20;
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nextPointLabel(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return alphabet[index];
  return `P${index + 1}`;
}

function toolLabel(tool) {
  return GEOMETRY_TOOLS.find((item) => item.id === tool)?.label || "幾何";
}

function geometryHint(tool, segmentDraft, polygonDraft, circleDraft) {
  if (tool === "point") return "キャンバスをクリックして点を置きます。";
  if (tool === "segment") {
    return segmentDraft ? "2点目をクリックすると線分が確定します。" : "始点と終点を順にクリックします。";
  }
  if (tool === "polygon") {
    return polygonDraft.length ? "頂点を追加して「多角形を閉じる」を押します。" : "頂点を順にクリックして多角形を作ります。";
  }
  if (tool === "circle") {
    return circleDraft ? "半径を決める点をクリックします。" : "中心をクリックしてから円周上の点をクリックします。";
  }
  return "";
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampFloat(value, min, max, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.abs(value) > 9999 ? value.toExponential(3) : value.toFixed(4);
  return rounded.replace(/\.?0+$/, "");
}

function safeEvaluate(fn, ...args) {
  try {
    const value = fn(...args);
    return Number.isFinite(value) ? value : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function pushUnique(values, candidate) {
  if (!Number.isFinite(candidate)) return;
  if (values.some((value) => Math.abs(value - candidate) < 1e-3)) return;
  values.push(candidate);
}

function parsePolynomial(input) {
  const tokens = tokenizePolynomial(input);
  let position = 0;

  function peek() {
    return tokens[position];
  }

  function consume(expected) {
    const token = tokens[position];
    if (!token || (expected && token.value !== expected)) {
      throw new Error("多項式を解釈できませんでした。掛け算は * で入力してください。");
    }
    position += 1;
    return token;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() && (peek().value === "+" || peek().value === "-")) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === "+" ? addPolynomial(value, right) : subtractPolynomial(value, right);
    }
    return value;
  }

  function parseTerm() {
    let value = parseFactor();
    while (peek() && peek().value === "*") {
      consume("*");
      value = multiplyPolynomial(value, parseFactor());
    }
    return value;
  }

  function parseFactor() {
    let value = parseUnary();
    while (peek() && peek().value === "^") {
      consume("^");
      const exponentPoly = parseUnary();
      if (polynomialDegree(exponentPoly) !== 0) {
        throw new Error("指数には整数を指定してください。");
      }
      const exponent = exponentPoly[0];
      if (!Number.isInteger(exponent) || exponent < 0 || exponent > 12) {
        throw new Error("指数は 0 以上 12 以下の整数で入力してください。");
      }
      value = powerPolynomial(value, exponent);
    }
    return value;
  }

  function parseUnary() {
    if (peek()?.value === "+") {
      consume("+");
      return parseUnary();
    }
    if (peek()?.value === "-") {
      consume("-");
      return negatePolynomial(parseUnary());
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("多項式が空です。");

    if (token.type === "number") {
      consume();
      return [token.numeric];
    }

    if (token.type === "variable") {
      consume();
      return [0, 1];
    }

    if (token.value === "(") {
      consume("(");
      const value = parseExpression();
      consume(")");
      return value;
    }

    throw new Error("多項式を解釈できませんでした。");
  }

  const polynomial = trimPolynomial(parseExpression());
  if (position !== tokens.length) {
    throw new Error("多項式の末尾を解釈できませんでした。");
  }

  return polynomial;
}

function tokenizePolynomial(input) {
  const source = `${input || ""}`.replace(/\s+/g, "");
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if ("+-*^()".includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "x" || char === "X") {
      tokens.push({ type: "variable", value: "x" });
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[0-9.]/.test(source[end])) {
        end += 1;
      }
      const slice = source.slice(index, end);
      const numeric = Number(slice);
      if (!Number.isFinite(numeric)) {
        throw new Error("数値を解釈できませんでした。");
      }
      tokens.push({ type: "number", value: slice, numeric });
      index = end;
      continue;
    }

    throw new Error(`未対応の文字があります: ${char}`);
  }

  return tokens;
}

function trimPolynomial(coeffs) {
  const next = [...coeffs];
  while (next.length > 1 && Math.abs(next[next.length - 1]) < 1e-9) {
    next.pop();
  }
  return next;
}

function polynomialDegree(coeffs) {
  return trimPolynomial(coeffs).length - 1;
}

function addPolynomial(left, right) {
  const length = Math.max(left.length, right.length);
  const result = Array.from({ length }, (_, index) => (left[index] || 0) + (right[index] || 0));
  return trimPolynomial(result);
}

function subtractPolynomial(left, right) {
  const length = Math.max(left.length, right.length);
  const result = Array.from({ length }, (_, index) => (left[index] || 0) - (right[index] || 0));
  return trimPolynomial(result);
}

function negatePolynomial(value) {
  return value.map((coefficient) => -coefficient);
}

function multiplyPolynomial(left, right) {
  const result = Array.from({ length: left.length + right.length - 1 }, () => 0);
  left.forEach((leftCoefficient, leftIndex) => {
    right.forEach((rightCoefficient, rightIndex) => {
      result[leftIndex + rightIndex] += leftCoefficient * rightCoefficient;
    });
  });
  return trimPolynomial(result);
}

function powerPolynomial(base, exponent) {
  let result = [1];
  for (let index = 0; index < exponent; index += 1) {
    result = multiplyPolynomial(result, base);
  }
  return result;
}

function derivePolynomial(coeffs) {
  if (coeffs.length <= 1) return [0];
  return trimPolynomial(coeffs.slice(1).map((coefficient, index) => coefficient * (index + 1)));
}

function evaluatePolynomial(coeffs, x) {
  return coeffs.reduce((total, coefficient, index) => total + coefficient * x ** index, 0);
}

function formatPolynomial(coeffs) {
  const normalized = trimPolynomial(coeffs);
  if (normalized.length === 1 && Math.abs(normalized[0]) < 1e-9) return "0";

  const parts = [];
  for (let exponent = normalized.length - 1; exponent >= 0; exponent -= 1) {
    const coefficient = normalized[exponent];
    if (Math.abs(coefficient) < 1e-9) continue;

    const sign = coefficient < 0 ? "-" : "+";
    const absCoefficient = Math.abs(coefficient);

    let body = "";
    if (exponent === 0) {
      body = formatNumber(absCoefficient);
    } else if (exponent === 1) {
      body = absCoefficient === 1 ? "x" : `${formatNumber(absCoefficient)}*x`;
    } else {
      body = absCoefficient === 1 ? `x^${exponent}` : `${formatNumber(absCoefficient)}*x^${exponent}`;
    }

    parts.push(`${sign} ${body}`);
  }

  return parts.join(" ").replace(/^\+\s/, "");
}

function factorPolynomial(coeffs) {
  let polynomial = trimPolynomial(coeffs);
  if (polynomial.length === 1) return formatPolynomial(polynomial);

  const factors = [];
  const scalar = extractPolynomialScalar(polynomial);
  if (Math.abs(scalar) > 1e-9 && Math.abs(scalar - 1) > 1e-9) {
    factors.push(formatNumber(scalar));
    polynomial = polynomial.map((coefficient) => coefficient / scalar);
  }

  let guard = 0;
  while (polynomialDegree(polynomial) > 1 && guard < 12) {
    guard += 1;
    const root = findRationalRoot(polynomial);
    if (root == null) break;
    factors.push(formatLinearFactor(root));
    polynomial = syntheticDivide(polynomial, root);
  }

  if (polynomialDegree(polynomial) === 2) {
    const [c, b, a] = polynomial;
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const sqrt = Math.sqrt(discriminant);
      if (Number.isFinite(sqrt)) {
        const root1 = (-b + sqrt) / (2 * a);
        const root2 = (-b - sqrt) / (2 * a);
        if (Math.abs(root1 - root2) < 1e-9) {
          factors.push(formatLinearFactor(root1));
          factors.push(formatLinearFactor(root2));
          polynomial = [1];
        } else if (Number.isFinite(root1) && Number.isFinite(root2)) {
          factors.push(formatLinearFactor(root1));
          factors.push(formatLinearFactor(root2));
          polynomial = [1];
        }
      }
    }
  } else if (polynomialDegree(polynomial) === 1) {
    factors.push(formatLinearPolynomial(polynomial));
    polynomial = [1];
  }

  if (!(polynomial.length === 1 && Math.abs(polynomial[0] - 1) < 1e-9)) {
    factors.push(`(${formatPolynomial(polynomial)})`);
  }

  return factors.join(" × ");
}

function extractPolynomialScalar(coeffs) {
  const integers = coeffs.every((coefficient) => Math.abs(coefficient - Math.round(coefficient)) < 1e-9);
  if (!integers) {
    if (coeffs[coeffs.length - 1] < 0) return -1;
    return 1;
  }

  const gcd = coeffs.reduce((current, coefficient) => gcdIntegers(current, Math.round(coefficient)), 0);
  if (gcd === 0) return 1;
  return coeffs[coeffs.length - 1] < 0 ? -Math.abs(gcd) : Math.abs(gcd);
}

function gcdIntegers(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  if (a === 0) return b;
  if (b === 0) return a;
  while (b) {
    const temp = a % b;
    a = b;
    b = temp;
  }
  return a;
}

function findRationalRoot(coeffs) {
  const normalized = coeffs.map((coefficient) => Math.round(coefficient));
  const constant = normalized[0];
  const leading = normalized[normalized.length - 1];
  if (constant === 0) return 0;

  const numerators = divisors(Math.abs(constant));
  const denominators = divisors(Math.abs(leading));
  for (const numerator of numerators) {
    for (const denominator of denominators) {
      const candidate = numerator / denominator;
      const possibilities = [candidate, -candidate];
      for (const value of possibilities) {
        if (Math.abs(evaluatePolynomial(coeffs, value)) < 1e-6) {
          return value;
        }
      }
    }
  }
  return null;
}

function divisors(value) {
  const result = [];
  for (let current = 1; current <= value; current += 1) {
    if (value % current === 0) result.push(current);
  }
  return result;
}

function syntheticDivide(coeffs, root) {
  const degree = polynomialDegree(coeffs);
  const descending = [...coeffs].reverse();
  const result = [descending[0]];

  for (let index = 1; index < descending.length; index += 1) {
    result[index] = descending[index] + result[index - 1] * root;
  }

  const quotientDescending = result.slice(0, degree);
  return trimPolynomial(quotientDescending.reverse());
}

function formatLinearFactor(root) {
  if (Math.abs(root) < 1e-9) return "(x)";
  if (root > 0) return `(x - ${formatNumber(root)})`;
  return `(x + ${formatNumber(Math.abs(root))})`;
}

function formatLinearPolynomial(coeffs) {
  const [constant, linear] = coeffs;
  return `(${formatPolynomial([constant, linear])})`;
}

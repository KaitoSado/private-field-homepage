"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const APP_TABS = [
  { id: "graph", label: "関数グラフ" },
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
        </div>
      </div>
    </div>
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

function drawGraphGrid(context, width, height, xRange, yRange) {
  context.save();
  context.strokeStyle = "rgba(148, 163, 184, 0.14)";
  context.lineWidth = 1;

  for (let x = -xRange; x <= xRange; x += 1) {
    const screenX = worldToScreenX(x, width, xRange);
    context.beginPath();
    context.moveTo(screenX, 0);
    context.lineTo(screenX, height);
    context.stroke();
  }

  for (let y = -yRange; y <= yRange; y += 1) {
    const screenY = worldToScreenY(y, height, yRange);
    context.beginPath();
    context.moveTo(0, screenY);
    context.lineTo(width, screenY);
    context.stroke();
  }

  context.strokeStyle = "rgba(15, 23, 42, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, worldToScreenY(0, height, yRange));
  context.lineTo(width, worldToScreenY(0, height, yRange));
  context.moveTo(worldToScreenX(0, width, xRange), 0);
  context.lineTo(worldToScreenX(0, width, xRange), height);
  context.stroke();

  context.restore();
}

function paintMathBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fcfcf9");
  gradient.addColorStop(0.5, "#f6f8f6");
  gradient.addColorStop(1, "#fdf8ef");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawCanvasMessage(context, width, height, message) {
  context.save();
  context.fillStyle = "#1f2937";
  context.font = "600 22px var(--font-sans, sans-serif)";
  context.fillText(message, 36, height / 2);
  context.restore();
}

function worldToScreenX(value, width, xRange) {
  return ((value + xRange) / (xRange * 2)) * width;
}

function worldToScreenY(value, height, yRange) {
  return height - ((value + yRange) / (yRange * 2)) * height;
}

function screenToWorldX(value, width, xRange) {
  return (value / width) * (xRange * 2) - xRange;
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

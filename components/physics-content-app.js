"use client";

import { useState } from "react";
import {
  PHYSICS_ATLAS,
  PHYSICS_LABS,
  PHYSICS_PRESETS,
  PHYSICS_VIEW_MODES,
  buildFieldModel,
  buildOpticsModel,
  buildProjectileModel,
  buildSpringModel,
  formatPhysicsNumber,
  getPhysicsLab
} from "@/lib/physics-content";

const INITIAL_PROJECTILE = { speed: 28, angleDeg: 46, gravity: 9.8, drag: 0.05, launchHeight: 1.2 };
const INITIAL_SPRING = { mass: 1.6, springConstant: 8.8, amplitude: 1.6, damping: 0.08 };
const INITIAL_FIELD = { chargeA: 4, chargeB: -4, distance: 6, probeX: 0, probeY: 2 };
const INITIAL_OPTICS = { focalLength: 3.2, objectDistance: 8, objectHeight: 2.4 };

function RangeField({ label, min, max, step, value, suffix = "", onChange }) {
  return (
    <label className="physics-control-field">
      <span>{label}</span>
      <strong>
        {formatPhysicsNumber(value, step < 1 ? 2 : 1)}
        {suffix}
      </strong>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function svgLinePath(points, mapPoint) {
  return points
    .map((point, index) => {
      const mapped = mapPoint(point);
      return `${index === 0 ? "M" : "L"} ${mapped.x.toFixed(1)} ${mapped.y.toFixed(1)}`;
    })
    .join(" ");
}

function PhysicsProjectileScene({ model }) {
  const width = 560;
  const height = 320;
  const pad = 34;
  const scaleX = (width - pad * 2) / model.maxX;
  const scaleY = (height - pad * 2) / model.maxY;
  const scale = Math.min(scaleX, scaleY);
  const toPoint = (point) => ({
    x: pad + point.x * scale,
    y: height - pad - point.y * scale
  });
  const path = svgLinePath(model.points, toPoint);
  const apex = toPoint(model.apex);
  const landing = toPoint(model.landing);
  const sample = toPoint(model.points[Math.min(Math.floor(model.points.length * 0.35), model.points.length - 1)]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="放物運動の軌道">
      <defs>
        <linearGradient id="physicsProjectileTrail" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#53a8bc" />
          <stop offset="100%" stopColor="#ffd04c" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {Array.from({ length: 7 }).map((_, index) => (
        <line
          key={`grid-x-${index}`}
          x1={pad}
          y1={pad + ((height - pad * 2) / 6) * index}
          x2={width - pad}
          y2={pad + ((height - pad * 2) / 6) * index}
          className="physics-grid-line"
        />
      ))}
      {Array.from({ length: 9 }).map((_, index) => (
        <line
          key={`grid-y-${index}`}
          x1={pad + ((width - pad * 2) / 8) * index}
          y1={pad}
          x2={pad + ((width - pad * 2) / 8) * index}
          y2={height - pad}
          className="physics-grid-line"
        />
      ))}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="physics-axis-line" />
      <line x1={pad} y1={height - pad} x2={pad} y2={pad} className="physics-axis-line" />
      <path d={path} fill="none" stroke="url(#physicsProjectileTrail)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={apex.x} cy={apex.y} r="7" className="physics-scene-accent" />
      <circle cx={landing.x} cy={landing.y} r="6" className="physics-scene-highlight" />
      <line x1={sample.x} y1={sample.y} x2={sample.x + 42} y2={sample.y - 18} className="physics-vector-line" />
      <circle cx={sample.x} cy={sample.y} r="8" className="physics-scene-orb" />
      <text x={apex.x + 10} y={apex.y - 10} className="physics-scene-label">apex</text>
      <text x={landing.x - 8} y={landing.y - 10} className="physics-scene-label">range</text>
    </svg>
  );
}

function springTracePath(points, width, height, pad, maxDisplacement) {
  return points
    .map((point, index) => {
      const x = pad + ((width - pad * 2) * index) / Math.max(points.length - 1, 1);
      const y = height / 2 - (point.displacement / maxDisplacement) * (height / 2 - pad);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildSpringCoil(startX, endX, centerY) {
  const segments = 8;
  const step = (endX - startX) / segments;
  let path = `M ${startX} ${centerY}`;
  for (let index = 1; index < segments; index += 1) {
    const x = startX + step * index;
    const y = centerY + (index % 2 === 0 ? -14 : 14);
    path += ` L ${x} ${y}`;
  }
  return `${path} L ${endX} ${centerY}`;
}

function PhysicsSpringScene({ model }) {
  const width = 560;
  const height = 320;
  const tracePad = 30;
  const coilStart = 88;
  const restX = 238;
  const centerY = 92;
  const offset = (model.current.displacement / Math.max(model.maxDisplacement, 0.2)) * 92;
  const blockX = restX + offset;
  const trace = springTracePath(model.points, width, 136, tracePad, model.maxDisplacement);
  const energyTotal = Math.max(model.current.total, 0.01);
  const potentialShare = (model.current.potential / energyTotal) * 100;
  const kineticShare = (model.current.kinetic / energyTotal) * 100;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="バネ振動の位置とエネルギー">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="58" y1={centerY} x2={width - 48} y2={centerY} className="physics-grid-line" />
      <path d={buildSpringCoil(coilStart, blockX, centerY)} fill="none" stroke="#56a6be" strokeWidth="5" strokeLinecap="round" />
      <rect x={blockX} y={centerY - 28} width="74" height="56" rx="18" className="physics-scene-highlight-fill" />
      <text x={blockX + 22} y={centerY + 6} className="physics-scene-text">m</text>
      <path d={trace} fill="none" stroke="#ffd56c" strokeWidth="4" strokeLinecap="round" />
      <line x1={tracePad} y1="226" x2={width - tracePad} y2="226" className="physics-axis-line" />
      <text x="36" y="212" className="physics-scene-label">x(t)</text>

      <g transform="translate(74 250)">
        <rect x="0" y="0" width="170" height="20" rx="999" className="physics-energy-rail" />
        <rect x="0" y="0" width={Math.max(10, (170 * potentialShare) / 100)} height="20" rx="999" className="physics-energy-potential" />
        <rect x={Math.max(10, (170 * potentialShare) / 100)} y="0" width={Math.max(10, (170 * kineticShare) / 100)} height="20" rx="999" className="physics-energy-kinetic" />
        <text x="0" y="-10" className="physics-scene-label">energy split</text>
      </g>
    </svg>
  );
}

function PhysicsFieldScene({ model }) {
  const width = 560;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 34;
  const toX = (value) => centerX + value * scale;
  const toY = (value) => centerY - value * scale;
  const probeStrength = Math.max(model.metrics.fieldStrength, 0.01);
  const probeScale = 42 / probeStrength;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="電場と観測点">
      <defs>
        <marker id="physicsArrowHead" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" fill="#4e7683" />
        </marker>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {model.arrows.map((arrow, index) => (
        <line
          key={`${arrow.x}-${arrow.y}-${index}`}
          x1={toX(arrow.x)}
          y1={toY(arrow.y)}
          x2={toX(arrow.x + arrow.dx)}
          y2={toY(arrow.y + arrow.dy)}
          className="physics-field-vector"
          markerEnd="url(#physicsArrowHead)"
        />
      ))}
      {model.charges.map((charge) => (
        <g key={charge.id}>
          <circle cx={toX(charge.x)} cy={toY(charge.y)} r="22" className={charge.q >= 0 ? "physics-charge-positive" : "physics-charge-negative"} />
          <text x={toX(charge.x)} y={toY(charge.y) + 6} textAnchor="middle" className="physics-charge-text">
            {charge.q >= 0 ? "+" : "−"}
          </text>
        </g>
      ))}
      <circle cx={toX(model.probe.x)} cy={toY(model.probe.y)} r="8" className="physics-scene-accent" />
      <line
        x1={toX(model.probe.x)}
        y1={toY(model.probe.y)}
        x2={toX(model.probe.x + model.probe.ex * probeScale)}
        y2={toY(model.probe.y + model.probe.ey * probeScale)}
        className="physics-vector-line"
        markerEnd="url(#physicsArrowHead)"
      />
      <text x={toX(model.probe.x) + 10} y={toY(model.probe.y) - 10} className="physics-scene-label">probe</text>
    </svg>
  );
}

function PhysicsOpticsScene({ model, params }) {
  const width = 560;
  const height = 320;
  const axisY = 174;
  const lensX = 286;
  const scale = 26;
  const objectX = lensX - params.objectDistance * scale;
  const objectHeight = params.objectHeight * 32;
  const imageX = model.imageDistance === null ? lensX + 210 : lensX + model.imageDistance * scale;
  const imageHeight = model.imageHeight === null ? 0 : model.imageHeight * 32;
  const focusOffset = params.focalLength * scale;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="薄レンズの光線図">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="42" y1={axisY} x2={width - 42} y2={axisY} className="physics-axis-line" />
      <line x1={lensX} y1="48" x2={lensX} y2={height - 48} className="physics-lens-line" />
      <ellipse cx={lensX} cy={axisY} rx="15" ry="92" className="physics-lens-fill" />
      <line x1={lensX - focusOffset} y1={axisY - 10} x2={lensX - focusOffset} y2={axisY + 10} className="physics-focus-line" />
      <line x1={lensX + focusOffset} y1={axisY - 10} x2={lensX + focusOffset} y2={axisY + 10} className="physics-focus-line" />

      <line x1={objectX} y1={axisY} x2={objectX} y2={axisY - objectHeight} className="physics-object-line" />
      <polygon points={`${objectX},${axisY - objectHeight - 12} ${objectX - 8},${axisY - objectHeight + 2} ${objectX + 8},${axisY - objectHeight + 2}`} className="physics-object-fill" />

      {model.imageDistance !== null ? (
        <>
          <line x1={imageX} y1={axisY} x2={imageX} y2={axisY - imageHeight} className="physics-image-line" />
          <polygon
            points={`${imageX},${axisY - imageHeight - (imageHeight >= 0 ? 12 : -12)} ${imageX - 8},${axisY - imageHeight + (imageHeight >= 0 ? 2 : -2)} ${imageX + 8},${axisY - imageHeight + (imageHeight >= 0 ? 2 : -2)}`}
            className="physics-image-fill"
          />
          <line x1={objectX} y1={axisY - objectHeight} x2={lensX} y2={axisY - objectHeight} className="physics-ray-line" />
          <line x1={lensX} y1={axisY - objectHeight} x2={imageX} y2={axisY - imageHeight} className="physics-ray-line" />
          <line x1={objectX} y1={axisY - objectHeight} x2={lensX} y2={axisY} className="physics-ray-line physics-ray-line-faint" />
          <line x1={lensX} y1={axisY} x2={imageX} y2={axisY - imageHeight} className="physics-ray-line physics-ray-line-faint" />
          {model.isVirtual ? (
            <line x1={lensX} y1={axisY - objectHeight} x2={imageX} y2={axisY - imageHeight} className="physics-ray-dashed" />
          ) : null}
        </>
      ) : null}

      <text x={lensX - focusOffset - 10} y={axisY + 28} className="physics-scene-label">F</text>
      <text x={lensX + focusOffset - 4} y={axisY + 28} className="physics-scene-label">F</text>
    </svg>
  );
}

function renderScene(labId, model, params) {
  if (labId === "projectile") return <PhysicsProjectileScene model={model} />;
  if (labId === "spring") return <PhysicsSpringScene model={model} />;
  if (labId === "field") return <PhysicsFieldScene model={model} />;
  return <PhysicsOpticsScene model={model} params={params} />;
}

function ModePanel({ mode, lab, activeLabId, onSelectLab }) {
  if (mode === "lab") {
    return (
      <section className="surface physics-mode-card">
        <div className="physics-mode-head">
          <div>
            <p className="eyebrow">Guided Lab</p>
            <h2>{lab.missionTitle}</h2>
            <p>{lab.missionBody}</p>
          </div>
        </div>
        <div className="physics-mode-grid">
          <article className="physics-note-panel">
            <h3>見るポイント</h3>
            <ul>
              {lab.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="physics-note-panel">
            <h3>式との接続</h3>
            <ul className="physics-equation-list">
              {lab.equations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    );
  }

  if (mode === "atlas") {
    return (
      <section className="surface physics-mode-card">
        <div className="physics-mode-head">
          <div>
            <p className="eyebrow">Theory Map</p>
            <h2>物理の地図</h2>
            <p>ラボを物理全体のどこに置くかを示します。古典から現代物理へ伸びる導線だけを見せます。</p>
          </div>
        </div>
        <div className="physics-atlas-grid">
          {PHYSICS_ATLAS.map((node) => (
            <article key={node.id} className={`physics-atlas-card ${node.labs.includes(activeLabId) ? "is-active" : ""}`}>
              <h3>{node.title}</h3>
              <p>{node.summary}</p>
              <div className="physics-chip-row">
                {node.labs.map((labId) => {
                  const relatedLab = getPhysicsLab(labId);
                  return (
                    <button
                      key={labId}
                      type="button"
                      className={`physics-chip ${labId === activeLabId ? "is-active" : ""}`}
                      onClick={() => onSelectLab(labId)}
                    >
                      {relatedLab.title}
                    </button>
                  );
                })}
              </div>
              <div className="physics-atlas-next">
                {node.next.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="surface physics-mode-card">
      <div className="physics-mode-head">
        <div>
          <p className="eyebrow">Sandbox</p>
          <h2>触って壊して理解する</h2>
          <p>PhET の分かりやすさと Algodoo の遊び心を意識し、まず手元の数値で世界の様子が変わる体験に寄せています。</p>
        </div>
      </div>
      <div className="physics-note-grid">
        <article className="physics-note-panel">
          <h3>この面でできること</h3>
          <ul>
            <li>パラメータを動かして世界の挙動を即時に見る</li>
            <li>ミッション preset から典型状況を一気に呼び出す</li>
            <li>ベクトル、保存量、像の向きなどの差分を確認する</li>
          </ul>
        </article>
        <article className="physics-note-panel">
          <h3>次の伸ばし方</h3>
          <ul>
            <li>2D 力学 sandbox の object placement を追加する</li>
            <li>回路、波動、干渉、流体の guided lab を増やす</li>
            <li>式の各項を scene 上でハイライトする mode を足す</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export function PhysicsContentApp() {
  const [mode, setMode] = useState("sandbox");
  const [activeLabId, setActiveLabId] = useState("projectile");
  const [projectile, setProjectile] = useState(INITIAL_PROJECTILE);
  const [spring, setSpring] = useState(INITIAL_SPRING);
  const [field, setField] = useState(INITIAL_FIELD);
  const [optics, setOptics] = useState(INITIAL_OPTICS);

  const activeLab = getPhysicsLab(activeLabId);
  const models = {
    projectile: buildProjectileModel(projectile),
    spring: buildSpringModel(spring),
    field: buildFieldModel(field),
    optics: buildOpticsModel(optics)
  };
  const activeModel = models[activeLabId];
  const presets = PHYSICS_PRESETS[activeLabId] || [];

  function applyPreset(values) {
    if (activeLabId === "projectile") setProjectile((current) => ({ ...current, ...values }));
    if (activeLabId === "spring") setSpring((current) => ({ ...current, ...values }));
    if (activeLabId === "field") setField((current) => ({ ...current, ...values }));
    if (activeLabId === "optics") setOptics((current) => ({ ...current, ...values }));
  }

  function renderControls() {
    if (activeLabId === "projectile") {
      return (
        <>
          <RangeField label="初速" min={8} max={46} step={0.5} value={projectile.speed} suffix=" m/s" onChange={(value) => setProjectile((current) => ({ ...current, speed: value }))} />
          <RangeField label="角度" min={10} max={80} step={1} value={projectile.angleDeg} suffix=" deg" onChange={(value) => setProjectile((current) => ({ ...current, angleDeg: value }))} />
          <RangeField label="重力" min={1} max={26} step={0.1} value={projectile.gravity} suffix=" m/s^2" onChange={(value) => setProjectile((current) => ({ ...current, gravity: value }))} />
          <RangeField label="空気抵抗" min={0} max={0.18} step={0.01} value={projectile.drag} onChange={(value) => setProjectile((current) => ({ ...current, drag: value }))} />
          <RangeField label="発射高さ" min={0} max={4} step={0.1} value={projectile.launchHeight} suffix=" m" onChange={(value) => setProjectile((current) => ({ ...current, launchHeight: value }))} />
        </>
      );
    }

    if (activeLabId === "spring") {
      return (
        <>
          <RangeField label="質量" min={0.4} max={3.2} step={0.1} value={spring.mass} suffix=" kg" onChange={(value) => setSpring((current) => ({ ...current, mass: value }))} />
          <RangeField label="バネ定数" min={3} max={18} step={0.2} value={spring.springConstant} suffix=" N/m" onChange={(value) => setSpring((current) => ({ ...current, springConstant: value }))} />
          <RangeField label="振幅" min={0.4} max={2.4} step={0.1} value={spring.amplitude} suffix=" m" onChange={(value) => setSpring((current) => ({ ...current, amplitude: value }))} />
          <RangeField label="減衰" min={0} max={0.4} step={0.01} value={spring.damping} onChange={(value) => setSpring((current) => ({ ...current, damping: value }))} />
        </>
      );
    }

    if (activeLabId === "field") {
      return (
        <>
          <RangeField label="左電荷" min={-6} max={6} step={1} value={field.chargeA} suffix=" q" onChange={(value) => setField((current) => ({ ...current, chargeA: value === 0 ? 1 : value }))} />
          <RangeField label="右電荷" min={-6} max={6} step={1} value={field.chargeB} suffix=" q" onChange={(value) => setField((current) => ({ ...current, chargeB: value === 0 ? -1 : value }))} />
          <RangeField label="電荷間距離" min={2} max={9} step={0.2} value={field.distance} suffix=" m" onChange={(value) => setField((current) => ({ ...current, distance: value }))} />
          <RangeField label="観測点 x" min={-5} max={5} step={0.1} value={field.probeX} suffix=" m" onChange={(value) => setField((current) => ({ ...current, probeX: value }))} />
          <RangeField label="観測点 y" min={-3} max={3} step={0.1} value={field.probeY} suffix=" m" onChange={(value) => setField((current) => ({ ...current, probeY: value }))} />
        </>
      );
    }

    return (
      <>
        <RangeField label="焦点距離" min={1.4} max={6} step={0.1} value={optics.focalLength} suffix=" m" onChange={(value) => setOptics((current) => ({ ...current, focalLength: value }))} />
        <RangeField label="物体距離" min={1.6} max={12} step={0.1} value={optics.objectDistance} suffix=" m" onChange={(value) => setOptics((current) => ({ ...current, objectDistance: value }))} />
        <RangeField label="物体の高さ" min={0.8} max={3.6} step={0.1} value={optics.objectHeight} suffix=" m" onChange={(value) => setOptics((current) => ({ ...current, objectHeight: value }))} />
      </>
    );
  }

  function renderMetrics() {
    if (activeLabId === "projectile") {
      return (
        <div className="physics-metric-grid">
          <article className="physics-metric-card"><span>射程</span><strong>{formatPhysicsNumber(activeModel.metrics.range, 2)} m</strong></article>
          <article className="physics-metric-card"><span>頂点</span><strong>{formatPhysicsNumber(activeModel.metrics.apexHeight, 2)} m</strong></article>
          <article className="physics-metric-card"><span>滞空時間</span><strong>{formatPhysicsNumber(activeModel.metrics.flightTime, 2)} s</strong></article>
          <article className="physics-metric-card"><span>残留エネルギー</span><strong>{formatPhysicsNumber(activeModel.metrics.energyRetention, 1)} %</strong></article>
        </div>
      );
    }

    if (activeLabId === "spring") {
      return (
        <div className="physics-metric-grid">
          <article className="physics-metric-card"><span>周期</span><strong>{formatPhysicsNumber(activeModel.metrics.period, 2)} s</strong></article>
          <article className="physics-metric-card"><span>角振動数</span><strong>{formatPhysicsNumber(activeModel.metrics.angularFrequency, 2)} rad/s</strong></article>
          <article className="physics-metric-card"><span>現在位置</span><strong>{formatPhysicsNumber(activeModel.current.displacement, 2)} m</strong></article>
          <article className="physics-metric-card"><span>総エネルギー</span><strong>{formatPhysicsNumber(activeModel.metrics.totalEnergy, 2)}</strong></article>
        </div>
      );
    }

    if (activeLabId === "field") {
      return (
        <div className="physics-metric-grid">
          <article className="physics-metric-card"><span>電場強度</span><strong>{formatPhysicsNumber(activeModel.metrics.fieldStrength, 2)}</strong></article>
          <article className="physics-metric-card"><span>電位</span><strong>{formatPhysicsNumber(activeModel.metrics.potential, 2)}</strong></article>
          <article className="physics-metric-card"><span>Ex</span><strong>{formatPhysicsNumber(activeModel.probe.ex, 2)}</strong></article>
          <article className="physics-metric-card"><span>Ey</span><strong>{formatPhysicsNumber(activeModel.probe.ey, 2)}</strong></article>
        </div>
      );
    }

    return (
      <div className="physics-metric-grid">
        <article className="physics-metric-card"><span>像距離</span><strong>{formatPhysicsNumber(activeModel.metrics.imageDistance, 2)} m</strong></article>
        <article className="physics-metric-card"><span>倍率</span><strong>{formatPhysicsNumber(activeModel.metrics.magnification, 2)}</strong></article>
        <article className="physics-metric-card"><span>像の高さ</span><strong>{formatPhysicsNumber(activeModel.metrics.imageHeight, 2)} m</strong></article>
        <article className="physics-metric-card"><span>像の種類</span><strong>{activeModel.isVirtual ? "虚像" : "実像"}</strong></article>
      </div>
    );
  }

  const activeParams = activeLabId === "projectile" ? projectile : activeLabId === "spring" ? spring : activeLabId === "field" ? field : optics;

  return (
    <div className="dashboard-layout physics-app-shell">
      <section className="section-grid section-head physics-hero">
        <div className="section-copy">
          <p className="eyebrow">Physics Playground</p>
          <h1 className="page-title">物理コンテンツ</h1>
          <p className="hero-lead physics-hero-lead">
            PhET の分かりやすさ、Algodoo の遊び心、Physion の自由度、GeoGebra の見える数理を合わせた、触って理解する物理ワークスペースです。
          </p>
        </div>
        <div className="physics-summary-grid">
          <article className="surface physics-summary-card"><span>views</span><strong>3</strong><small>遊ぶ / 学ぶ / 地図で見る</small></article>
          <article className="surface physics-summary-card"><span>labs</span><strong>4</strong><small>力学 / 振動 / 電場 / 光学</small></article>
          <article className="surface physics-summary-card"><span>style</span><strong>live</strong><small>数値と図が同時に動く</small></article>
          <article className="surface physics-summary-card"><span>goal</span><strong>現象→式</strong><small>理論へ繋がる導線</small></article>
        </div>
      </section>

      <section className="section-grid">
        <div className="physics-mode-row">
          {PHYSICS_VIEW_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`physics-mode-chip ${mode === item.id ? "is-active" : ""}`}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid physics-workbench">
        <aside className="surface physics-side-panel">
          <div className="physics-panel-head">
            <p className="eyebrow">Labs</p>
            <h2>看板ラボ</h2>
          </div>
          <div className="physics-lab-tabs">
            {PHYSICS_LABS.map((lab) => (
              <button
                key={lab.id}
                type="button"
                className={`physics-lab-tab ${activeLabId === lab.id ? "is-active" : ""}`}
                onClick={() => setActiveLabId(lab.id)}
              >
                <small>{lab.eyebrow}</small>
                <strong>{lab.title}</strong>
                <span>{lab.summary}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="physics-main-stack">
          <section className="surface physics-visual-card">
            <div className="physics-panel-head">
              <div>
                <p className="eyebrow">{activeLab.eyebrow}</p>
                <h2>{activeLab.title}</h2>
                <p>{activeLab.summary}</p>
              </div>
            </div>

            <div className="physics-chip-row">
              {presets.map((preset) => (
                <button key={preset.id} type="button" className="physics-chip" onClick={() => applyPreset(preset.values)}>
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="physics-scene-wrap">
              {renderScene(activeLabId, activeModel, activeParams)}
            </div>
          </section>

          <section className="physics-detail-grid">
            <article className="surface physics-controls-card">
              <div className="physics-panel-head">
                <div>
                  <p className="eyebrow">Controls</p>
                  <h2>パラメータ</h2>
                </div>
              </div>
              <div className="physics-control-grid">{renderControls()}</div>
            </article>

            <article className="surface physics-insight-card">
              <div className="physics-panel-head">
                <div>
                  <p className="eyebrow">Readout</p>
                  <h2>今の読み取り</h2>
                </div>
              </div>
              {renderMetrics()}
            </article>
          </section>

          <ModePanel mode={mode} lab={activeLab} activeLabId={activeLabId} onSelectLab={(labId) => setActiveLabId(labId)} />
        </div>
      </section>
    </div>
  );
}

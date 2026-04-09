"use client";

import { useEffect, useState } from "react";
import {
  PHYSICS_MODULES,
  PHYSICS_OVERLAY_OPTIONS,
  PHYSICS_PRESETS,
  PHYSICS_VIEW_MODES,
  buildCollisionModel,
  buildGasModel,
  buildMotionModel,
  buildQuantumModel,
  buildRelativityModel,
  buildRotationModel,
  formatPhysicsNumber,
  getPhysicsMissionResult,
  getPhysicsModule,
  getPhysicsOverlayState
} from "@/lib/physics-content";

const INITIAL_MOTION = { mass: 1.2, height: 5.2, slopeDeg: 34, friction: 0.08, kick: 0.3 };
const INITIAL_COLLISION = { massA: 1.2, massB: 1.8, velocityA: 5.4, velocityB: -1.2, restitution: 0.84 };
const INITIAL_ROTATION = { mass: 1.4, radius: 0.58, height: 4.6, slopeDeg: 27, inertiaFactor: 0.5 };
const INITIAL_GAS = { particleCount: 56, temperature: 48, volume: 1 };
const INITIAL_RELATIVITY = { beta: 0.62, properLength: 7, eventGap: 3 };
const INITIAL_QUANTUM = { energy: 2.6, barrierHeight: 4.8, barrierWidth: 1.3, packetWidth: 1.1 };

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

function ToggleField({ label, checked, disabled = false, onChange }) {
  return (
    <label className={`physics-checkbox-row ${disabled ? "is-disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function pathFromSeries(points, width, height, padY = 22) {
  const maxValue = Math.max(...points.map((point) => point.value), 0.001);
  return points
    .map((point, index) => {
      const x = 18 + ((width - 36) * index) / Math.max(points.length - 1, 1);
      const y = height - padY - ((height - padY * 2) * point.value) / maxValue;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderMotionScene(model, overlays) {
  const width = 640;
  const height = 320;
  const startX = 136;
  const startY = 62;
  const endX = 500;
  const endY = 252;
  const slopeAngle = Math.atan2(endY - startY, endX - startX);
  const progress = Math.min(0.88, Math.max(0.18, model.metrics.efficiency / 115));
  const ballX = startX + (endX - startX) * progress;
  const ballY = startY + (endY - startY) * progress;
  const arrowLength = 34 + Math.min(model.metrics.velocity * 5.4, 90);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="斜面を滑る球">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="40" y1="272" x2={width - 40} y2="272" className="physics-axis-line" />
      <polygon points={`${startX},${startY} ${endX},${endY} ${endX},272 ${startX},272`} className="physics-slope-fill" />
      {overlays.trajectory ? (
        <line x1={startX + 10} y1={startY + 8} x2={endX - 10} y2={endY - 8} className="physics-trace-line" />
      ) : null}
      <circle cx={ballX} cy={ballY - 18} r="20" className="physics-scene-orb" />
      {overlays.vectors ? (
        <>
          <line
            x1={ballX}
            y1={ballY - 18}
            x2={ballX + Math.cos(slopeAngle) * arrowLength}
            y2={ballY - 18 + Math.sin(slopeAngle) * arrowLength}
            className="physics-vector-line"
          />
          <line x1={ballX} y1={ballY - 18} x2={ballX} y2={ballY + 50} className="physics-force-line" />
        </>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(442 44)">
          <rect x="0" y="0" width="150" height="14" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(150 * model.kinetic) / Math.max(model.metrics.totalEnergy, 0.001)} height="14" rx="999" className="physics-energy-kinetic" />
          <rect
            x={(150 * model.kinetic) / Math.max(model.metrics.totalEnergy, 0.001)}
            y="0"
            width={(150 * model.heat) / Math.max(model.metrics.totalEnergy, 0.001)}
            height="14"
            rx="999"
            className="physics-energy-loss"
          />
          <text x="0" y="-10" className="physics-scene-label">energy split</text>
        </g>
      ) : null}
      <text x="52" y="58" className="physics-scene-label">top</text>
      <text x={endX - 12} y={endY - 18} className="physics-scene-label">bottom</text>
    </svg>
  );
}

function renderCollisionScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const beforeLeftX = 132;
  const beforeRightX = 352;
  const afterLeftX = 430 + model.nextVelocityA * 9;
  const afterRightX = 510 + model.nextVelocityB * 9;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="2体衝突の前後比較">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="40" y1="226" x2={width - 40} y2="226" className="physics-axis-line" />
      <line x1="318" y1="42" x2="318" y2="260" className="physics-divider-line" />
      <text x="100" y="62" className="physics-scene-label">before</text>
      <text x="404" y="62" className="physics-scene-label">after</text>
      <rect x={beforeLeftX} y="172" width={58} height="54" rx="16" className="physics-block-a" />
      <rect x={beforeRightX} y="168" width={84} height="58" rx="18" className="physics-block-b" />
      <rect x={afterLeftX} y="172" width={58} height="54" rx="16" className="physics-block-a" />
      <rect x={afterRightX} y="168" width={84} height="58" rx="18" className="physics-block-b" />
      {overlays.vectors ? (
        <>
          <line x1={beforeLeftX + 29} y1="152" x2={beforeLeftX + 29 + params.velocityA * 16} y2="152" className="physics-vector-line" />
          <line x1={beforeRightX + 42} y1="146" x2={beforeRightX + 42 + params.velocityB * 16} y2="146" className="physics-vector-line physics-vector-line-alt" />
          <line x1={afterLeftX + 29} y1="152" x2={afterLeftX + 29 + model.nextVelocityA * 16} y2="152" className="physics-vector-line" />
          <line x1={afterRightX + 42} y1="146" x2={afterRightX + 42 + model.nextVelocityB * 16} y2="146" className="physics-vector-line physics-vector-line-alt" />
        </>
      ) : null}
      {overlays.momentum ? (
        <g transform="translate(78 268)">
          <text x="0" y="0" className="physics-scene-label">p before {formatPhysicsNumber(model.beforeMomentum, 2)}</text>
          <text x="252" y="0" className="physics-scene-label">p after {formatPhysicsNumber(model.afterMomentum, 2)}</text>
        </g>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(430 74)">
          <rect x="0" y="0" width="136" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(136 * model.afterEnergy) / Math.max(model.beforeEnergy, 0.001)} height="12" rx="999" className="physics-energy-kinetic" />
          <text x="0" y="-10" className="physics-scene-label">energy retained</text>
        </g>
      ) : null}
    </svg>
  );
}

function renderRotationScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const startX = 146;
  const startY = 78;
  const endX = 474;
  const endY = 240;
  const progress = Math.min(0.86, Math.max(0.2, model.metrics.translationalShare / 100));
  const diskX = startX + (endX - startX) * progress;
  const diskY = startY + (endY - startY) * progress - params.radius * 26;
  const radius = params.radius * 26;
  const rotationAngle = model.angularVelocity * 0.12;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="斜面を転がる剛体">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <polygon points={`${startX},${startY} ${endX},${endY} ${endX},272 ${startX},272`} className="physics-slope-fill alt" />
      <line x1="42" y1="272" x2={width - 42} y2="272" className="physics-axis-line" />
      <circle cx={diskX} cy={diskY} r={radius} className="physics-rotation-body" />
      <line
        x1={diskX}
        y1={diskY}
        x2={diskX + Math.cos(rotationAngle) * radius}
        y2={diskY + Math.sin(rotationAngle) * radius}
        className="physics-rotation-spoke"
      />
      {overlays.vectors ? (
        <line x1={diskX} y1={diskY} x2={diskX + 82} y2={diskY + 28} className="physics-vector-line" />
      ) : null}
      {overlays.energy ? (
        <g transform="translate(430 42)">
          <rect x="0" y="0" width="148" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(148 * model.translational) / Math.max(model.translational + model.rotational, 0.001)} height="12" rx="999" className="physics-energy-kinetic" />
          <rect
            x={(148 * model.translational) / Math.max(model.translational + model.rotational, 0.001)}
            y="0"
            width={(148 * model.rotational) / Math.max(model.translational + model.rotational, 0.001)}
            height="12"
            rx="999"
            className="physics-energy-rotation"
          />
          <text x="0" y="-10" className="physics-scene-label">translation / rotation</text>
        </g>
      ) : null}
      {overlays.momentum ? (
        <text x="432" y="88" className="physics-scene-label">L = {formatPhysicsNumber(model.angularMomentum, 2)}</text>
      ) : null}
    </svg>
  );
}

function renderGasScene(model, overlays) {
  const width = 640;
  const height = 320;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="理想気体の粒子箱">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="84" y="38" width="474" height="220" rx="28" className="physics-gas-box" />
      {model.particles.map((particle, index) => (
        <g key={`${particle.x}-${particle.y}-${index}`}>
          <circle cx={84 + particle.x * 474} cy={38 + particle.y * 220} r="5.6" className="physics-gas-particle" />
          {overlays.vectors ? (
            <line
              x1={84 + particle.x * 474}
              y1={38 + particle.y * 220}
              x2={84 + particle.x * 474 + particle.dx * 3.2}
              y2={38 + particle.y * 220 - particle.dy * 3.2}
              className="physics-field-vector"
            />
          ) : null}
        </g>
      ))}
      {overlays.energy ? (
        <text x="430" y="290" className="physics-scene-label">pressure {formatPhysicsNumber(model.metrics.pressure, 2)}</text>
      ) : null}
    </svg>
  );
}

function renderRelativityScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const trackY = 208;
  const trainLength = model.contractedLength * 34;
  const trainX = 190;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="特殊相対論の列車と時空図">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="42" y1={trackY} x2={width - 42} y2={trackY} className="physics-axis-line" />
      <rect x={trainX} y={trackY - 54} width={trainLength} height="54" rx="18" className="physics-train-body" />
      <circle cx={trainX + 24} cy={trackY + 8} r="10" className="physics-train-wheel" />
      <circle cx={trainX + trainLength - 24} cy={trackY + 8} r="10" className="physics-train-wheel" />
      <circle cx={trainX + 16} cy={trackY - 54} r="9" className="physics-light-event" />
      <circle cx={trainX + trainLength - 16} cy={trackY - 54} r="9" className="physics-light-event" />
      {overlays.vectors ? (
        <line x1={trainX + 24} y1={trackY - 72} x2={trainX + 24 + model.beta * 120} y2={trackY - 72} className="physics-vector-line" />
      ) : null}
      <text x="56" y="72" className="physics-scene-label">beta = {formatPhysicsNumber(model.beta, 2)}c</text>
      <text x="56" y="98" className="physics-scene-label">gamma = {formatPhysicsNumber(model.gamma, 2)}</text>
      {overlays.spacetime ? (
        <g transform="translate(392 38)">
          <rect x="0" y="0" width="196" height="176" rx="18" className="physics-diagram-panel" />
          <line x1="18" y1="156" x2="176" y2="156" className="physics-axis-line" />
          <line x1="18" y1="156" x2="18" y2="18" className="physics-axis-line" />
          <line x1="18" y1="156" x2="86" y2="24" className="physics-world-line" />
          <line x1="18" y1="156" x2="134" y2="24" className="physics-world-line" />
          <line x1="18" y1="156" x2="156" y2="18" className="physics-light-cone-line" />
          <text x="26" y="30" className="physics-scene-label">ct</text>
          <text x="158" y="170" className="physics-scene-label">x</text>
        </g>
      ) : null}
      {overlays.graph ? (
        <text x="392" y="240" className="physics-scene-label">train times {formatPhysicsNumber(model.frontEventTrainTime, 2)} / {formatPhysicsNumber(model.backEventTrainTime, 2)}</text>
      ) : null}
    </svg>
  );
}

function quantumPath(model, width, height) {
  const points = model.density.map((point, index) => {
    const x = 22 + ((width - 44) * index) / Math.max(model.density.length - 1, 1);
    const y = height - 28 - point.amplitude * 112;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${points.join(" ")} L ${width - 22} ${height - 28} L 22 ${height - 28} Z`;
}

function renderQuantumScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const barrierX = 280 - params.barrierWidth * 36;
  const barrierWidth = params.barrierWidth * 72;
  const barrierHeight = params.barrierHeight * 24;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="量子トンネル効果">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="28" y1="250" x2={width - 28} y2="250" className="physics-axis-line" />
      <rect x={barrierX} y={250 - barrierHeight} width={barrierWidth} height={barrierHeight} rx="16" className="physics-barrier-fill" />
      {overlays.wave ? (
        <path d={quantumPath(model, width, height)} className="physics-wave-fill" />
      ) : null}
      <text x="48" y="62" className="physics-scene-label">T = {formatPhysicsNumber(model.transmission, 1)}%</text>
      <text x="48" y="88" className="physics-scene-label">R = {formatPhysicsNumber(model.reflection, 1)}%</text>
    </svg>
  );
}

function renderScene(moduleId, model, params, overlays) {
  if (moduleId === "motion") return renderMotionScene(model, overlays);
  if (moduleId === "collision") return renderCollisionScene(model, params, overlays);
  if (moduleId === "rotation") return renderRotationScene(model, params, overlays);
  if (moduleId === "gas") return renderGasScene(model, overlays);
  if (moduleId === "relativity") return renderRelativityScene(model, params, overlays);
  return renderQuantumScene(model, params, overlays);
}

function OverlayPanel({ module, overlays, onToggle }) {
  return (
    <article className="surface physics-controls-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Display Layer</p>
          <h2>見方の切替</h2>
          <p>現象の上に法則を重ねます。この app の本体です。</p>
        </div>
      </div>
      <div className="physics-overlay-grid">
        {PHYSICS_OVERLAY_OPTIONS.map((overlay) => {
          const enabled = module.overlays.includes(overlay.id);
          return (
            <div key={overlay.id} className={`physics-overlay-card ${enabled ? "" : "is-disabled"}`}>
              <ToggleField
                label={overlay.label}
                checked={Boolean(overlays[overlay.id])}
                disabled={!enabled}
                onChange={(checked) => onToggle(overlay.id, checked)}
              />
              <small>{overlay.hint}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function MissionCard({ module, mission }) {
  return (
    <article className="surface physics-insight-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Mission</p>
          <h2>{module.missionTitle}</h2>
          <p>{module.missionBody}</p>
        </div>
        <span className={`physics-status-pill ${mission.passed ? "is-pass" : "is-wait"}`}>
          {mission.passed ? "達成" : "調整中"}
        </span>
      </div>
      <div className="physics-mission-target">
        <strong>{mission.label}</strong>
        <span>{mission.target}</span>
      </div>
    </article>
  );
}

function LawPanel({ module, viewMode }) {
  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">{viewMode === "shift" ? "World Shift" : viewMode === "law" ? "Law View" : "Playground"}</p>
          <h2>{viewMode === "shift" ? "同じ出来事の見え方をずらす" : viewMode === "law" ? "法則を scene に重ねる" : "まず手で動かして確かめる"}</h2>
          <p>
            {viewMode === "shift"
              ? `${module.worldShift.from}。${module.worldShift.to}。`
              : viewMode === "law"
                ? "式を別画面へ追いやらず、いま見ている scene の上に保存則と可視化を重ねます。"
                : "PhET の分かりやすさと Algodoo の触感を優先し、まず現象を操作できる状態を作ります。"}
          </p>
        </div>
      </div>
      <div className="physics-note-grid">
        <article className="physics-note-panel">
          <h3>この章の law</h3>
          <ul>
            {module.lawNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="physics-note-panel">
          <h3>章の役割</h3>
          <ul>
            <li>chapter: {module.chapter}</li>
            <li>scope: {module.status}</li>
            <li>next: {viewMode === "shift" ? "次の理論へ接続" : "overlay を増やして理解を深める"}</li>
          </ul>
        </article>
      </div>
    </article>
  );
}

function GraphPanel({ moduleId, model, overlays }) {
  if (moduleId === "motion") {
    const series = [
      { label: "位置E", value: model.potential },
      { label: "運動E", value: model.kinetic },
      { label: "熱", value: model.heat }
    ];
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Graph / Log</p>
            <h2>エネルギーの受け渡し</h2>
          </div>
        </div>
        <div className="physics-bar-grid">
          {series.map((item) => (
            <div key={item.label} className="physics-bar-card">
              <span>{item.label}</span>
              <div className="physics-bar-rail">
                <div className="physics-bar-fill" style={{ width: `${(item.value / Math.max(model.metrics.totalEnergy, 0.001)) * 100}%` }} />
              </div>
              <strong>{formatPhysicsNumber(item.value, 2)}</strong>
            </div>
          ))}
        </div>
        {overlays.graph ? <small className="physics-log-note">x-t よりもまず保存量の出入りを優先して見せています。</small> : null}
      </article>
    );
  }

  if (moduleId === "collision") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Graph / Log</p>
            <h2>before / after 比較</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>運動量</span>
            <strong>{formatPhysicsNumber(model.beforeMomentum, 2)} {"->"} {formatPhysicsNumber(model.afterMomentum, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>エネルギー</span>
            <strong>{formatPhysicsNumber(model.beforeEnergy, 2)} {"->"} {formatPhysicsNumber(model.afterEnergy, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>重心系</span>
            <strong>{formatPhysicsNumber(model.centerVelocity, 2)} m/s</strong>
          </div>
        </div>
      </article>
    );
  }

  if (moduleId === "rotation") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Graph / Log</p>
            <h2>並進と回転の配分</h2>
          </div>
        </div>
        <div className="physics-bar-grid">
          <div className="physics-bar-card">
            <span>並進</span>
            <div className="physics-bar-rail"><div className="physics-bar-fill is-kinetic" style={{ width: `${model.metrics.translationalShare}%` }} /></div>
            <strong>{formatPhysicsNumber(model.translational, 2)}</strong>
          </div>
          <div className="physics-bar-card">
            <span>回転</span>
            <div className="physics-bar-rail"><div className="physics-bar-fill is-rotation" style={{ width: `${100 - model.metrics.translationalShare}%` }} /></div>
            <strong>{formatPhysicsNumber(model.rotational, 2)}</strong>
          </div>
        </div>
      </article>
    );
  }

  if (moduleId === "gas") {
    const maxCount = Math.max(...model.histogram.map((bucket) => bucket.count), 1);
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Histogram</p>
            <h2>速度分布</h2>
          </div>
        </div>
        <div className="physics-histogram">
          {model.histogram.map((bucket) => (
            <div key={bucket.label} className="physics-histogram-bar">
              <div className="physics-histogram-fill" style={{ height: `${(bucket.count / maxCount) * 100}%` }} />
              <span>{bucket.label}</span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (moduleId === "relativity") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Spacetime</p>
            <h2>観測者で変わるもの</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>収縮した長さ</span>
            <strong>{formatPhysicsNumber(model.contractedLength, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>同時性のずれ</span>
            <strong>{formatPhysicsNumber(model.metrics.simultaneityGap, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>時間の遅れ</span>
            <strong>{formatPhysicsNumber(model.metrics.timeDilation, 2)}x</strong>
          </div>
        </div>
      </article>
    );
  }

  const series = model.density.map((point) => ({ value: point.amplitude }));
  return (
    <article className="surface physics-log-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Wave Function</p>
          <h2>確率密度の profile</h2>
        </div>
      </div>
      <svg viewBox="0 0 420 180" className="physics-mini-graph" role="img" aria-label="波動関数の確率密度">
        <rect x="0" y="0" width="420" height="180" rx="18" className="physics-diagram-panel" />
        <path d={pathFromSeries(series, 420, 180)} fill="none" stroke="#53a8bc" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </article>
  );
}

function buildCurrentModel(moduleId, state) {
  if (moduleId === "motion") return buildMotionModel(state.motion);
  if (moduleId === "collision") return buildCollisionModel(state.collision);
  if (moduleId === "rotation") return buildRotationModel(state.rotation);
  if (moduleId === "gas") return buildGasModel(state.gas);
  if (moduleId === "relativity") return buildRelativityModel(state.relativity);
  return buildQuantumModel(state.quantum);
}

export function PhysicsContentApp() {
  const [viewMode, setViewMode] = useState("playground");
  const [moduleId, setModuleId] = useState("motion");
  const [overlays, setOverlays] = useState(() => getPhysicsOverlayState("motion"));
  const [motion, setMotion] = useState(INITIAL_MOTION);
  const [collision, setCollision] = useState(INITIAL_COLLISION);
  const [rotation, setRotation] = useState(INITIAL_ROTATION);
  const [gas, setGas] = useState(INITIAL_GAS);
  const [relativity, setRelativity] = useState(INITIAL_RELATIVITY);
  const [quantum, setQuantum] = useState(INITIAL_QUANTUM);

  useEffect(() => {
    setOverlays((current) => getPhysicsOverlayState(moduleId, current));
  }, [moduleId]);

  const module = getPhysicsModule(moduleId);
  const state = { motion, collision, rotation, gas, relativity, quantum };
  const model = buildCurrentModel(moduleId, state);
  const mission = getPhysicsMissionResult(moduleId, model);

  function applyPreset(values) {
    if (moduleId === "motion") setMotion((current) => ({ ...current, ...values }));
    if (moduleId === "collision") setCollision((current) => ({ ...current, ...values }));
    if (moduleId === "rotation") setRotation((current) => ({ ...current, ...values }));
    if (moduleId === "gas") setGas((current) => ({ ...current, ...values }));
    if (moduleId === "relativity") setRelativity((current) => ({ ...current, ...values }));
    if (moduleId === "quantum") setQuantum((current) => ({ ...current, ...values }));
  }

  function renderControls() {
    if (moduleId === "motion") {
      return (
        <>
          <RangeField label="質量" min={0.6} max={3.4} step={0.1} value={motion.mass} suffix=" kg" onChange={(value) => setMotion((current) => ({ ...current, mass: value }))} />
          <RangeField label="高さ" min={1.8} max={7.2} step={0.1} value={motion.height} suffix=" m" onChange={(value) => setMotion((current) => ({ ...current, height: value }))} />
          <RangeField label="斜面角" min={12} max={58} step={1} value={motion.slopeDeg} suffix=" deg" onChange={(value) => setMotion((current) => ({ ...current, slopeDeg: value }))} />
          <RangeField label="摩擦" min={0} max={0.34} step={0.01} value={motion.friction} onChange={(value) => setMotion((current) => ({ ...current, friction: value }))} />
          <RangeField label="初期 kick" min={0} max={1.5} step={0.05} value={motion.kick} suffix=" m" onChange={(value) => setMotion((current) => ({ ...current, kick: value }))} />
        </>
      );
    }

    if (moduleId === "collision") {
      return (
        <>
          <RangeField label="赤の質量" min={0.5} max={3.4} step={0.1} value={collision.massA} suffix=" kg" onChange={(value) => setCollision((current) => ({ ...current, massA: value }))} />
          <RangeField label="青の質量" min={0.5} max={3.4} step={0.1} value={collision.massB} suffix=" kg" onChange={(value) => setCollision((current) => ({ ...current, massB: value }))} />
          <RangeField label="赤の速度" min={-4} max={8} step={0.1} value={collision.velocityA} suffix=" m/s" onChange={(value) => setCollision((current) => ({ ...current, velocityA: value }))} />
          <RangeField label="青の速度" min={-4} max={6} step={0.1} value={collision.velocityB} suffix=" m/s" onChange={(value) => setCollision((current) => ({ ...current, velocityB: value }))} />
          <RangeField label="反発係数" min={0} max={1} step={0.02} value={collision.restitution} onChange={(value) => setCollision((current) => ({ ...current, restitution: value }))} />
        </>
      );
    }

    if (moduleId === "rotation") {
      return (
        <>
          <RangeField label="質量" min={0.6} max={3.2} step={0.1} value={rotation.mass} suffix=" kg" onChange={(value) => setRotation((current) => ({ ...current, mass: value }))} />
          <RangeField label="半径" min={0.3} max={1} step={0.02} value={rotation.radius} suffix=" m" onChange={(value) => setRotation((current) => ({ ...current, radius: value }))} />
          <RangeField label="高さ" min={2} max={6} step={0.1} value={rotation.height} suffix=" m" onChange={(value) => setRotation((current) => ({ ...current, height: value }))} />
          <RangeField label="斜面角" min={10} max={42} step={1} value={rotation.slopeDeg} suffix=" deg" onChange={(value) => setRotation((current) => ({ ...current, slopeDeg: value }))} />
          <RangeField label="慣性係数" min={0.35} max={1.1} step={0.05} value={rotation.inertiaFactor} onChange={(value) => setRotation((current) => ({ ...current, inertiaFactor: value }))} />
        </>
      );
    }

    if (moduleId === "gas") {
      return (
        <>
          <RangeField label="粒子数" min={20} max={120} step={2} value={gas.particleCount} onChange={(value) => setGas((current) => ({ ...current, particleCount: value }))} />
          <RangeField label="温度" min={12} max={100} step={1} value={gas.temperature} suffix=" K*" onChange={(value) => setGas((current) => ({ ...current, temperature: value }))} />
          <RangeField label="体積" min={0.6} max={1.6} step={0.05} value={gas.volume} suffix=" V" onChange={(value) => setGas((current) => ({ ...current, volume: value }))} />
        </>
      );
    }

    if (moduleId === "relativity") {
      return (
        <>
          <RangeField label="列車速度" min={0.05} max={0.94} step={0.01} value={relativity.beta} suffix=" c" onChange={(value) => setRelativity((current) => ({ ...current, beta: value }))} />
          <RangeField label="固有長" min={4} max={10} step={0.2} value={relativity.properLength} suffix=" m" onChange={(value) => setRelativity((current) => ({ ...current, properLength: value }))} />
          <RangeField label="事象間隔" min={1} max={6} step={0.2} value={relativity.eventGap} suffix=" m" onChange={(value) => setRelativity((current) => ({ ...current, eventGap: value }))} />
        </>
      );
    }

    return (
      <>
        <RangeField label="粒子エネルギー" min={0.6} max={7} step={0.1} value={quantum.energy} suffix=" E" onChange={(value) => setQuantum((current) => ({ ...current, energy: value }))} />
        <RangeField label="障壁高さ" min={1} max={8} step={0.1} value={quantum.barrierHeight} suffix=" V0" onChange={(value) => setQuantum((current) => ({ ...current, barrierHeight: value }))} />
        <RangeField label="障壁幅" min={0.5} max={2.5} step={0.05} value={quantum.barrierWidth} suffix=" a" onChange={(value) => setQuantum((current) => ({ ...current, barrierWidth: value }))} />
        <RangeField label="波束幅" min={0.6} max={2} step={0.05} value={quantum.packetWidth} suffix=" sigma" onChange={(value) => setQuantum((current) => ({ ...current, packetWidth: value }))} />
      </>
    );
  }

  return (
    <div className="dashboard-layout physics-app-shell">
      <section className="section-grid section-head physics-hero">
        <div className="section-copy">
          <p className="eyebrow">Physics Playground</p>
          <h1 className="page-title">同じ世界を、異なる法則で見る</h1>
          <p className="hero-lead physics-hero-lead">
            PhET の教育的な絞り込み、Algodoo の触れる快感、Physion の自由度、GeoGebra の可視化の強さを参考に、
            現象と法則を同じ画面の上で切り替える物理 app に寄せました。
          </p>
        </div>
        <div className="physics-entry-grid">
          {PHYSICS_VIEW_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`surface physics-entry-card ${viewMode === item.id ? "is-active" : ""}`}
              onClick={() => setViewMode(item.id)}
            >
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <small>{item.body}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="physics-module-rail">
          {PHYSICS_MODULES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`physics-module-tab ${moduleId === item.id ? "is-active" : ""}`}
              onClick={() => setModuleId(item.id)}
            >
              <small>{item.chapter}</small>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid physics-workbench">
        <aside className="surface physics-side-panel">
          <div className="physics-panel-head">
            <div>
              <p className="eyebrow">Module</p>
              <h2>{module.title}</h2>
              <p>{module.summary}</p>
            </div>
          </div>

          <div className="physics-chip-row">
            {(PHYSICS_PRESETS[moduleId] || []).map((preset) => (
              <button key={preset.id} type="button" className="physics-chip" onClick={() => applyPreset(preset.values)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="physics-summary-grid">
            <article className="surface physics-summary-card">
              <span>Mode</span>
              <strong>{module.chapter}</strong>
              <small>{module.status}</small>
            </article>
            <article className="surface physics-summary-card">
              <span>View</span>
              <strong>{PHYSICS_VIEW_MODES.find((item) => item.id === viewMode)?.title || "Playground"}</strong>
              <small>同じ scene を別の視点で読む</small>
            </article>
          </div>

          <div className="physics-control-grid">
            {renderControls()}
          </div>
        </aside>

        <div className="physics-main-stack">
          <section className="surface physics-visual-card">
            <div className="physics-panel-head">
              <div>
                <p className="eyebrow">{module.chapter}</p>
                <h2>{module.title}</h2>
                <p>{module.summary}</p>
              </div>
            </div>
            <div className="physics-scene-wrap">
              {renderScene(moduleId, model, state[moduleId], overlays)}
            </div>
          </section>

          <div className="physics-detail-grid">
            <OverlayPanel
              module={module}
              overlays={overlays}
              onToggle={(overlayId, checked) => setOverlays((current) => ({ ...current, [overlayId]: checked }))}
            />
            <MissionCard module={module} mission={mission} />
          </div>

          <LawPanel module={module} viewMode={viewMode} />
          <GraphPanel moduleId={moduleId} model={model} overlays={overlays} />
        </div>
      </section>
    </div>
  );
}

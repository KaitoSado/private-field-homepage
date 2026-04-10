"use client";

import { useEffect, useState } from "react";
import {
  PHYSICS_DEFAULTS,
  PHYSICS_HOME_CATEGORIES,
  PHYSICS_OVERLAY_OPTIONS,
  PHYSICS_PRESETS,
  PHYSICS_VIEW_MODES,
  buildPhysicsSceneModel,
  formatPhysicsNumber,
  getPhysicsCategory,
  getPhysicsMissionResult,
  getPhysicsOverlayState,
  getPhysicsScene,
  getScenesForCategory
} from "@/lib/physics-content";

const SPEED_OPTIONS = [0.5, 1, 2, 4];

function cloneDefaultPhysicsState() {
  return Object.fromEntries(Object.entries(PHYSICS_DEFAULTS).map(([key, value]) => [key, { ...value }]));
}

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

function mapPoint(point, bounds, width, height, pad = 24) {
  const xRange = Math.max(bounds.xMax - bounds.xMin, 0.0001);
  const yRange = Math.max(bounds.yMax - bounds.yMin, 0.0001);
  return {
    x: pad + ((point.x - bounds.xMin) / xRange) * (width - pad * 2),
    y: height - pad - ((point.y - bounds.yMin) / yRange) * (height - pad * 2)
  };
}

function pathFromSeries(points, width, height, bounds, pad = 24) {
  return points
    .map((point, index) => {
      const mapped = mapPoint(point, bounds, width, height, pad);
      return `${index === 0 ? "M" : "L"} ${mapped.x.toFixed(1)} ${mapped.y.toFixed(1)}`;
    })
    .join(" ");
}

function areaFromSeries(points, width, height, bounds, pad = 24) {
  const line = pathFromSeries(points, width, height, bounds, pad);
  const first = mapPoint(points[0], bounds, width, height, pad);
  const last = mapPoint(points[points.length - 1], bounds, width, height, pad);
  const baseline = height - pad;
  return `${line} L ${last.x.toFixed(1)} ${baseline.toFixed(1)} L ${first.x.toFixed(1)} ${baseline.toFixed(1)} Z`;
}

function niceStep(range, targetTicks = 5) {
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

function renderGrid(width, height, bounds, pad, opts = {}) {
  const { xLabel, yLabel, xUnit, yUnit } = opts;
  const elements = [];
  const xRange = bounds.xMax - bounds.xMin;
  const yRange = bounds.yMax - bounds.yMin;
  const xStep = niceStep(xRange);
  const yStep = niceStep(yRange);
  const xStart = Math.ceil(bounds.xMin / xStep) * xStep;
  const yStart = Math.ceil(bounds.yMin / yStep) * yStep;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const toX = (v) => pad + ((v - bounds.xMin) / xRange) * innerW;
  const toY = (v) => height - pad - ((v - bounds.yMin) / yRange) * innerH;

  for (let v = xStart; v <= bounds.xMax + xStep * 0.01; v += xStep) {
    const x = toX(v);
    if (x < pad - 1 || x > width - pad + 1) continue;
    elements.push(<line key={`gx${v}`} x1={x} y1={pad} x2={x} y2={height - pad} className="physics-grid-line" />);
    elements.push(<line key={`tx${v}`} x1={x} y1={height - pad} x2={x} y2={height - pad + 5} className="physics-tick-mark" />);
    elements.push(<text key={`lx${v}`} x={x} y={height - pad + 16} textAnchor="middle" className="physics-tick-label">{Number(v.toFixed(6))}</text>);
  }
  for (let v = yStart; v <= bounds.yMax + yStep * 0.01; v += yStep) {
    const y = toY(v);
    if (y < pad - 1 || y > height - pad + 1) continue;
    elements.push(<line key={`gy${v}`} x1={pad} y1={y} x2={width - pad} y2={y} className="physics-grid-line" />);
    elements.push(<line key={`ty${v}`} x1={pad - 5} y1={y} x2={pad} y2={y} className="physics-tick-mark" />);
    elements.push(<text key={`ly${v}`} x={pad - 8} y={y + 3.5} textAnchor="end" className="physics-tick-label">{Number(v.toFixed(6))}</text>);
  }

  elements.push(<line key="ax" x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="physics-axis-line" />);
  elements.push(<line key="ay" x1={pad} y1={height - pad} x2={pad} y2={pad} className="physics-axis-line" />);

  if (xLabel) {
    const label = xUnit ? `${xLabel} [${xUnit}]` : xLabel;
    elements.push(<text key="xlbl" x={width - pad} y={height - pad + 28} textAnchor="end" className="physics-axis-title">{label}</text>);
  }
  if (yLabel) {
    const label = yUnit ? `${yLabel} [${yUnit}]` : yLabel;
    elements.push(<text key="ylbl" x={pad} y={pad - 10} textAnchor="start" className="physics-axis-title">{label}</text>);
  }

  return <g className="physics-grid-group">{elements}</g>;
}

function renderProjectileScene(model, overlays) {
  const width = 640;
  const height = 320;
  const bounds = {
    xMin: 0,
    xMax: Math.max(model.metrics.range * 1.05, 0.1),
    yMin: 0,
    yMax: Math.max(model.metrics.peakHeight * 1.15, 0.1)
  };
  const ball = mapPoint(model.position, bounds, width, height, 34);
  const velocityScale = 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="放物運動">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {renderGrid(width, height, bounds, 34, { xLabel: "x", yLabel: "y", xUnit: "m", yUnit: "m" })}
      {overlays.trajectory ? (
        <path
          d={pathFromSeries(model.trajectory, width, height, bounds, 34)}
          fill="none"
          stroke="rgba(83, 168, 188, 0.78)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}
      <circle cx={ball.x} cy={ball.y} r="16" className="physics-scene-orb" />
      {overlays.vectors ? (
        <>
          <line x1={ball.x} y1={ball.y} x2={ball.x + model.velocity.x * velocityScale} y2={ball.y - model.velocity.y * velocityScale} className="physics-vector-line" />
          <line x1={ball.x} y1={ball.y} x2={ball.x} y2={ball.y + 58} style={{ stroke: "rgba(214, 138, 51, 0.82)", strokeWidth: 3, strokeLinecap: "round" }} />
        </>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(430 46)">
          <rect x="0" y="0" width="152" height="12" rx="999" className="physics-energy-rail" />
          <rect
            x="0"
            y="0"
            width={(152 * model.kinetic) / Math.max(model.metrics.totalEnergy, 0.001)}
            height="12"
            rx="999"
            className="physics-energy-kinetic"
          />
          <rect
            x={(152 * model.kinetic) / Math.max(model.metrics.totalEnergy, 0.001)}
            y="0"
            width={(152 * model.potential) / Math.max(model.metrics.totalEnergy, 0.001)}
            height="12"
            rx="999"
            style={{ fill: "rgba(255, 213, 108, 0.9)" }}
          />
          <text x="0" y="-10" className="physics-scene-label">K / U</text>
        </g>
      ) : null}
    </svg>
  );
}

function renderCollisionScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const beforeLeftX = 126;
  const beforeRightX = 348;
  const afterLeftX = 432 + model.nextVelocityA * 9;
  const afterRightX = 508 + model.nextVelocityB * 9;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="衝突と運動量保存">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="38" y1="228" x2={width - 38} y2="228" className="physics-axis-line" />
      <line x1="320" y1="48" x2="320" y2="258" style={{ stroke: "rgba(23, 29, 36, 0.14)", strokeWidth: 2, strokeDasharray: "9 8" }} />
      <text x="96" y="60" className="physics-scene-label">衝突前</text>
      <text x="400" y="60" className="physics-scene-label">衝突後</text>
      <rect x={beforeLeftX} y="174" width="58" height="54" rx="16" style={{ fill: "rgba(255, 128, 96, 0.2)", stroke: "rgba(204, 87, 67, 0.52)", strokeWidth: 2 }} />
      <text x={beforeLeftX + 29} y="206" textAnchor="middle" className="physics-tick-label">{formatPhysicsNumber(params.massA, 1)} kg</text>
      <rect x={beforeRightX} y="170" width="84" height="58" rx="18" style={{ fill: "rgba(103, 153, 242, 0.18)", stroke: "rgba(59, 108, 204, 0.52)", strokeWidth: 2 }} />
      <text x={beforeRightX + 42} y="204" textAnchor="middle" className="physics-tick-label">{formatPhysicsNumber(params.massB, 1)} kg</text>
      <rect x={afterLeftX} y="174" width="58" height="54" rx="16" style={{ fill: "rgba(255, 128, 96, 0.2)", stroke: "rgba(204, 87, 67, 0.52)", strokeWidth: 2 }} />
      <rect x={afterRightX} y="170" width="84" height="58" rx="18" style={{ fill: "rgba(103, 153, 242, 0.18)", stroke: "rgba(59, 108, 204, 0.52)", strokeWidth: 2 }} />
      {overlays.vectors ? (
        <>
          <line x1={beforeLeftX + 29} y1="150" x2={beforeLeftX + 29 + params.velocityA * 18} y2="150" className="physics-vector-line" />
          <line x1={beforeRightX + 42} y1="146" x2={beforeRightX + 42 + params.velocityB * 18} y2="146" style={{ stroke: "rgba(59, 108, 204, 0.82)", strokeWidth: 3, strokeLinecap: "round" }} />
          <line x1={afterLeftX + 29} y1="150" x2={afterLeftX + 29 + model.nextVelocityA * 18} y2="150" className="physics-vector-line" />
          <line x1={afterRightX + 42} y1="146" x2={afterRightX + 42 + model.nextVelocityB * 18} y2="146" style={{ stroke: "rgba(59, 108, 204, 0.82)", strokeWidth: 3, strokeLinecap: "round" }} />
        </>
      ) : null}
      {overlays.momentum ? (
        <g transform="translate(80 270)">
          <text x="0" y="0" className="physics-scene-label">p before {formatPhysicsNumber(model.beforeMomentum, 2)}</text>
          <text x="248" y="0" className="physics-scene-label">p after {formatPhysicsNumber(model.afterMomentum, 2)}</text>
        </g>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(434 76)">
          <rect x="0" y="0" width="132" height="12" rx="999" className="physics-energy-rail" />
          <rect
            x="0"
            y="0"
            width={(132 * model.afterEnergy) / Math.max(model.beforeEnergy, 0.001)}
            height="12"
            rx="999"
            className="physics-energy-kinetic"
          />
          <text x="0" y="-10" className="physics-scene-label">energy retained</text>
        </g>
      ) : null}
    </svg>
  );
}

function renderOscillatorScene(model, overlays) {
  const width = 640;
  const height = 320;
  const centerX = 284;
  const centerY = 166;
  const massX = centerX + model.position * 82;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="単振動">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="82" y1={centerY} x2={width - 82} y2={centerY} className="physics-axis-line" />
      <line x1={centerX} y1={centerY - 60} x2={centerX} y2={centerY + 60} style={{ stroke: "rgba(23, 29, 36, 0.12)", strokeWidth: 1.5, strokeDasharray: "6 5" }} />
      <text x={centerX} y={centerY + 76} textAnchor="middle" className="physics-tick-label">x = 0</text>
      <rect x="92" y={centerY - 44} width="24" height="88" rx="8" style={{ fill: "rgba(23, 29, 36, 0.14)" }} />
      {(() => {
        const sx = 116;
        const ex = massX - 36;
        const coils = 6;
        const segLen = (ex - sx) / coils;
        const amp = Math.min(24, Math.max(8, segLen * 0.6));
        let d = `M ${sx} ${centerY}`;
        for (let i = 0; i < coils; i++) {
          const x0 = sx + segLen * i;
          const x1 = sx + segLen * (i + 1);
          const cx1 = x0 + segLen * 0.33;
          const cx2 = x0 + segLen * 0.67;
          const sign = i % 2 === 0 ? -1 : 1;
          d += ` C ${cx1} ${centerY + sign * amp} ${cx2} ${centerY - sign * amp} ${x1} ${centerY}`;
        }
        return (
          <path d={d} fill="none" stroke="rgba(78, 118, 131, 0.88)" strokeWidth="4" strokeLinecap="round" />
        );
      })()}
      <rect x={massX - 28} y={centerY - 28} width="56" height="56" rx="18" className="physics-scene-orb" />
      {overlays.vectors ? (
        <line x1={massX} y1={centerY - 46} x2={massX + model.velocity * 24} y2={centerY - 46} className="physics-vector-line" />
      ) : null}
      {overlays.energy ? (
        <g transform="translate(418 44)">
          <rect x="0" y="0" width="154" height="12" rx="999" className="physics-energy-rail" />
          <rect
            x="0"
            y="0"
            width={(154 * model.kinetic) / Math.max(model.totalEnergy, 0.001)}
            height="12"
            rx="999"
            className="physics-energy-kinetic"
          />
          <rect
            x={(154 * model.kinetic) / Math.max(model.totalEnergy, 0.001)}
            y="0"
            width={(154 * model.springEnergy) / Math.max(model.totalEnergy, 0.001)}
            height="12"
            rx="999"
            style={{ fill: "rgba(255, 213, 108, 0.92)" }}
          />
          <text x="0" y="-10" className="physics-scene-label">K / spring</text>
        </g>
      ) : null}
      {overlays.phase ? (
        <g transform="translate(446 136)">
          <circle cx="0" cy="0" r="54" style={{ fill: "none", stroke: "rgba(23, 29, 36, 0.14)", strokeWidth: 2 }} />
          <line x1="0" y1="0" x2={(model.position / Math.max(model.metrics.amplitude + 0.001, 0.3)) * 54} y2={(-model.velocity / Math.max(Math.abs(model.velocity) + 0.4, 0.4)) * 54} className="physics-vector-line" />
          <text x="-20" y="78" className="physics-scene-label">phase</text>
        </g>
      ) : null}
    </svg>
  );
}

function renderGasScene(model, overlays) {
  const width = 640;
  const height = 320;
  const left = 84;
  const top = 42;
  const boxWidth = model.boxWidth * 420;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="理想気体">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x={left} y={top} width={boxWidth} height="228" rx="26" style={{ fill: "rgba(255, 255, 255, 0.86)", stroke: "rgba(23, 29, 36, 0.12)", strokeWidth: 2 }} />
      <line x1={left + boxWidth} y1={top - 12} x2={left + boxWidth} y2={top + 240} style={{ stroke: "rgba(214, 138, 51, 0.76)", strokeWidth: 6, strokeLinecap: "round" }} />
      {model.particles.map((particle, index) => (
        <g key={index}>
          <circle cx={left + particle.x * 420} cy={top + particle.y * 228} r="5.2" style={{ fill: "rgba(83, 168, 188, 0.9)" }} />
          {overlays.vectors ? (
            <line
              x1={left + particle.x * 420}
              y1={top + particle.y * 228}
              x2={left + particle.x * 420 + particle.dx * 2.2}
              y2={top + particle.y * 228 - particle.dy * 2.2}
              className="physics-field-vector"
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function renderWaveScene(model, overlays) {
  const width = 640;
  const height = 320;
  const leftBounds = { xMin: -1, xMax: 1, yMin: -1.4, yMax: 1.4 };
  const rightBounds = { xMin: 0, xMax: 2, yMin: -1.4, yMax: 1.4 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="波の反射と屈折">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="0" y="0" width="320" height={height} style={{ fill: "rgba(255, 255, 255, 0.72)" }} />
      <rect x="320" y="0" width="320" height={height} style={{ fill: "rgba(160, 216, 234, 0.14)" }} />
      <line x1="320" y1="36" x2="320" y2="284" style={{ stroke: "rgba(23, 29, 36, 0.16)", strokeWidth: 3, strokeDasharray: "8 7" }} />
      <line x1="42" y1="160" x2="600" y2="160" className="physics-axis-line" />
      {overlays.wave ? (
        <>
          <path d={pathFromSeries(model.left, 280, 260, leftBounds, 26)} transform="translate(18 30)" fill="none" stroke="#53a8bc" strokeWidth="4" strokeLinecap="round" />
          <path d={pathFromSeries(model.right, 280, 260, rightBounds, 26)} transform="translate(330 30)" fill="none" stroke="#d68a33" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}
      {overlays.vectors ? (
        <>
          <line x1="128" y1="76" x2="218" y2="76" className="physics-vector-line" />
          <line x1="414" y1="76" x2="486" y2="76" style={{ stroke: "rgba(214, 138, 51, 0.82)", strokeWidth: 3, strokeLinecap: "round" }} />
        </>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(388 44)">
          <rect x="0" y="0" width="160" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(160 * model.metrics.transmission) / 100} height="12" rx="999" style={{ fill: "rgba(214, 138, 51, 0.84)" }} />
          <text x="0" y="-10" className="physics-scene-label">T {formatPhysicsNumber(model.metrics.transmission, 1)}%</text>
        </g>
      ) : null}
      <text x="64" y="42" className="physics-scene-label">媒質 A</text>
      <text x="392" y="42" className="physics-scene-label">媒質 B (n={formatPhysicsNumber(model.metrics.refractiveIndex || 1.42, 2)})</text>
    </svg>
  );
}

function renderRelativityScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const originX = 112;
  const originY = 252;
  const eventX = originX + params.eventX * 56;
  const eventY = originY - params.eventT * 42;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="ローレンツ変換">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="56" y="40" width="528" height="236" rx="26" className="physics-diagram-panel" />
      <line x1={originX} y1={originY} x2="564" y2={originY} className="physics-axis-line" />
      <line x1={originX} y1={originY} x2={originX} y2="60" className="physics-axis-line" />
      {[2, 4, 6, 8].map((v) => {
        const x = originX + v * 56;
        return x < 560 ? <g key={`xt${v}`}><line x1={x} y1={originY} x2={x} y2={originY + 5} className="physics-tick-mark" /><text x={x} y={originY + 16} textAnchor="middle" className="physics-tick-label">{v}</text></g> : null;
      })}
      {[1, 2, 3, 4].map((v) => {
        const y = originY - v * 42;
        return y > 55 ? <g key={`yt${v}`}><line x1={originX - 5} y1={y} x2={originX} y2={y} className="physics-tick-mark" /><text x={originX - 8} y={y + 3.5} textAnchor="end" className="physics-tick-label">{v}</text></g> : null;
      })}
      {overlays.spacetime ? (
        <>
          <line x1={originX} y1={originY} x2={originX + 176} y2="60" style={{ stroke: "rgba(214, 138, 51, 0.76)", strokeWidth: 2.5, strokeDasharray: "8 6" }} />
          <line x1={originX} y1={originY} x2={originX + 18 + params.beta * 118} y2="68" style={{ stroke: "rgba(78, 118, 131, 0.88)", strokeWidth: 3 }} />
          <line x1={originX - 4} y1={originY - params.beta * 64} x2="544" y2={originY - params.beta * 64 - params.beta * 48} style={{ stroke: "rgba(83, 168, 188, 0.66)", strokeWidth: 3 }} />
        </>
      ) : null}
      {overlays.vectors ? (
        <line x1="444" y1="76" x2={444 + params.beta * 116} y2="76" className="physics-vector-line" />
      ) : null}
      <circle cx={eventX} cy={eventY} r="9" style={{ fill: "rgba(255, 213, 108, 0.94)" }} />
      <text x="74" y="72" className="physics-scene-label">ct</text>
      <text x="548" y="272" className="physics-scene-label">x</text>
      <text x="426" y="112" className="physics-scene-label">
        gamma {formatPhysicsNumber(model.metrics.gamma, 2)}
      </text>
      <text x="426" y="136" className="physics-scene-label">
        x' {formatPhysicsNumber(model.metrics.xPrime, 2)}
      </text>
      <text x="426" y="160" className="physics-scene-label">
        ct' {formatPhysicsNumber(model.metrics.tPrime, 2)}
      </text>
    </svg>
  );
}

function renderQuantumScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const barrierX = 284 - params.barrierWidth * 36;
  const barrierWidth = params.barrierWidth * 72;
  const barrierHeight = params.barrierHeight * 22;
  const bounds = { xMin: -6, xMax: 6, yMin: 0, yMax: 1.1 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="1D量子井戸">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="28" y1="252" x2={width - 28} y2="252" className="physics-axis-line" />
      <rect x={barrierX} y={252 - barrierHeight} width={barrierWidth} height={barrierHeight} rx="18" style={{ fill: "rgba(103, 153, 242, 0.18)", stroke: "rgba(59, 108, 204, 0.55)", strokeWidth: 2 }} />
      <text x={barrierX + barrierWidth / 2} y={252 - barrierHeight - 8} textAnchor="middle" className="physics-axis-title">V₀</text>
      <rect x="84" y="252" width="112" height="74" rx="18" style={{ fill: "rgba(83, 168, 188, 0.08)", stroke: "rgba(83, 168, 188, 0.26)", strokeWidth: 2 }} />
      {overlays.probability ? (
        <path d={areaFromSeries(model.density, width, height, bounds, 28)} style={{ fill: "rgba(83, 168, 188, 0.16)", stroke: "rgba(83, 168, 188, 0.82)", strokeWidth: 3 }} />
      ) : null}
      {overlays.energy ? (
        <>
          <line x1="36" y1={252 - params.energy * 22} x2="600" y2={252 - params.energy * 22} style={{ stroke: "rgba(214, 138, 51, 0.82)", strokeWidth: 3, strokeDasharray: "8 6" }} />
          <text x="608" y={252 - params.energy * 22 + 4} className="physics-axis-title">E</text>
        </>
      ) : null}
      <text x="48" y="60" className="physics-scene-label">
        T {formatPhysicsNumber(model.metrics.transmission, 1)}%
      </text>
      <text x="48" y="84" className="physics-scene-label">
        束縛準位 {model.metrics.boundLevels}
      </text>
    </svg>
  );
}

function renderScene(sceneId, model, params, overlays) {
  if (sceneId === "projectile") return renderProjectileScene(model, overlays);
  if (sceneId === "collision") return renderCollisionScene(model, params, overlays);
  if (sceneId === "oscillator") return renderOscillatorScene(model, overlays);
  if (sceneId === "gas") return renderGasScene(model, overlays);
  if (sceneId === "wave") return renderWaveScene(model, overlays);
  if (sceneId === "relativity") return renderRelativityScene(model, params, overlays);
  return renderQuantumScene(model, params, overlays);
}

function OverlayPanel({ scene, overlays, onToggle }) {
  return (
    <article className="surface physics-controls-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">View Layer</p>
          <h2>見方の切替</h2>
          <p>現象はそのままに、いま必要な layer だけを重ねます。</p>
        </div>
      </div>
      <div className="physics-overlay-grid">
        {PHYSICS_OVERLAY_OPTIONS.map((overlay) => {
          const enabled = scene.overlays.includes(overlay.id);
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

function MissionCard({ scene, mission }) {
  return (
    <article className="surface physics-insight-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Mission</p>
          <h2>{scene.missionTitle}</h2>
          <p>{scene.missionBody}</p>
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

function PlaybackControls({ isPlaying, speed, onToggle, onReset, onStep, onSpeed }) {
  return (
    <div className="physics-playback-row">
      <div className="physics-playback-group">
        <button type="button" className="physics-chip" onClick={onToggle}>
          {isPlaying ? "停止" : "再生"}
        </button>
        <button type="button" className="physics-chip" onClick={onStep}>
          1 step
        </button>
        <button type="button" className="physics-chip" onClick={onReset}>
          リセット
        </button>
      </div>
      <div className="physics-speed-strip">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`physics-speed-chip ${speed === option ? "is-active" : ""}`}
            onClick={() => onSpeed(option)}
          >
            {option}x
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniSeriesChart({ series, bounds, color = "#53a8bc", fillColor = "rgba(83, 168, 188, 0.16)", ariaLabel }) {
  return (
    <svg viewBox="0 0 420 180" className="physics-mini-graph" role="img" aria-label={ariaLabel}>
      <rect x="0" y="0" width="420" height="180" rx="18" className="physics-diagram-panel" />
      <path d={areaFromSeries(series, 420, 180, bounds, 24)} fill={fillColor} />
      <path d={pathFromSeries(series, 420, 180, bounds, 24)} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function GraphPanel({ sceneId, model, params, overlays }) {
  if (sceneId === "projectile") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Graph / Log</p>
            <h2>軌道から読める量</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>range</span>
            <strong>{formatPhysicsNumber(model.metrics.range, 2)} m</strong>
          </div>
          <div className="physics-compare-card">
            <span>peak</span>
            <strong>{formatPhysicsNumber(model.metrics.peakHeight, 2)} m</strong>
          </div>
          <div className="physics-compare-card">
            <span>flight</span>
            <strong>{formatPhysicsNumber(model.metrics.timeOfFlight, 2)} s</strong>
          </div>
        </div>
        {overlays.graph ? (
          <div className="physics-bar-grid">
            <div className="physics-bar-card">
              <span>kinetic</span>
              <div className="physics-bar-rail">
                <div className="physics-bar-fill" style={{ width: `${(model.kinetic / Math.max(model.metrics.totalEnergy, 0.001)) * 100}%` }} />
              </div>
              <strong>{formatPhysicsNumber(model.kinetic, 2)} J</strong>
            </div>
            <div className="physics-bar-card">
              <span>potential</span>
              <div className="physics-bar-rail">
                <div className="physics-bar-fill is-rotation" style={{ width: `${(model.potential / Math.max(model.metrics.totalEnergy, 0.001)) * 100}%` }} />
              </div>
              <strong>{formatPhysicsNumber(model.potential, 2)} J</strong>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  if (sceneId === "collision") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Before / After</p>
            <h2>何が保たれたか</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>momentum</span>
            <strong>{formatPhysicsNumber(model.beforeMomentum, 2)} {"->"} {formatPhysicsNumber(model.afterMomentum, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>energy</span>
            <strong>{formatPhysicsNumber(model.beforeEnergy, 2)} {"->"} {formatPhysicsNumber(model.afterEnergy, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>center frame</span>
            <strong>{formatPhysicsNumber(model.metrics.centerVelocity, 2)} m/s</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "oscillator") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">x(t)</p>
            <h2>時間変化とエネルギー交換</h2>
          </div>
        </div>
        {overlays.graph ? (
          <MiniSeriesChart
            series={model.series}
            bounds={{ xMin: 0, xMax: model.series[model.series.length - 1].x, yMin: -Math.max(params.amplitude, 0.2), yMax: Math.max(params.amplitude, 0.2) }}
            ariaLabel="単振動の x-t"
          />
        ) : null}
        <div className="physics-bar-grid">
          <div className="physics-bar-card">
            <span>kinetic</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill" style={{ width: `${(model.kinetic / Math.max(model.totalEnergy, 0.001)) * 100}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.kinetic, 2)} J</strong>
          </div>
          <div className="physics-bar-card">
            <span>spring</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill is-rotation" style={{ width: `${(model.springEnergy / Math.max(model.totalEnergy, 0.001)) * 100}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.springEnergy, 2)} J</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "gas") {
    const maxCount = Math.max(...model.histogram.map((bucket) => bucket.count), 1);
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Distribution</p>
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
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>pressure</span>
            <strong>{formatPhysicsNumber(model.metrics.pressure, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>mean v</span>
            <strong>{formatPhysicsNumber(model.metrics.averageSpeed, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>density</span>
            <strong>{formatPhysicsNumber(model.metrics.density, 2)}</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "wave") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Boundary</p>
            <h2>反射と透過</h2>
          </div>
        </div>
        <div className="physics-bar-grid">
          <div className="physics-bar-card">
            <span>reflection</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill" style={{ width: `${model.metrics.reflection}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.reflection, 1)}%</strong>
          </div>
          <div className="physics-bar-card">
            <span>transmission</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill is-rotation" style={{ width: `${model.metrics.transmission}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.transmission, 1)}%</strong>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>lambda2</span>
            <strong>{formatPhysicsNumber(model.metrics.refractedWavelength, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>v2</span>
            <strong>{formatPhysicsNumber(model.metrics.phaseVelocity, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>n</span>
            <strong>{formatPhysicsNumber(params.refractiveIndex, 2)}</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "relativity") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Transform</p>
            <h2>座標の読み替え</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>gamma</span>
            <strong>{formatPhysicsNumber(model.metrics.gamma, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>x'</span>
            <strong>{formatPhysicsNumber(model.metrics.xPrime, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>ct'</span>
            <strong>{formatPhysicsNumber(model.metrics.tPrime, 2)}</strong>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="surface physics-log-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Probability</p>
          <h2>状態として読む</h2>
        </div>
      </div>
      {overlays.graph ? (
        <MiniSeriesChart
          series={model.density}
          bounds={{ xMin: -6, xMax: 6, yMin: 0, yMax: 1.1 }}
          ariaLabel="1D量子井戸の確率密度"
        />
      ) : null}
      <div className="physics-compare-bars">
        <div className="physics-compare-card">
          <span>transmission</span>
          <strong>{formatPhysicsNumber(model.metrics.transmission, 1)}%</strong>
        </div>
        <div className="physics-compare-card">
          <span>reflection</span>
          <strong>{formatPhysicsNumber(model.metrics.reflection, 1)}%</strong>
        </div>
        <div className="physics-compare-card">
          <span>bound</span>
          <strong>{model.metrics.boundLevels}</strong>
        </div>
      </div>
    </article>
  );
}

function SandboxPanel({ scene }) {
  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Sandbox</p>
          <h2>{scene.title}</h2>
        </div>
      </div>
      <ul className="physics-hint-list">
        {scene.observationPoints.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function GuidedLabPanel({ scene }) {
  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Guided Lab</p>
          <h2>{scene.title}</h2>
        </div>
      </div>
      <ol className="physics-hint-list">
        {scene.observationPoints.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </article>
  );
}

function MathLinkPanel({ scene, formula, model, params, onSelectFormula }) {
  const quantities = formula.getQuantities(model, params);

  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Math Link</p>
          <h2>{scene.title}</h2>
        </div>
      </div>
      <div className="physics-chip-row">
        {scene.formulas.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`physics-chip ${formula.id === item.id ? "is-active" : ""}`}
            onClick={() => onSelectFormula(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="physics-note-grid">
        <article className="physics-note-panel">
          <h3>{formula.label}</h3>
          <p><code>{formula.expression}</code></p>
          <p>{formula.meaning}</p>
        </article>
        <article className="physics-note-panel">
          <h3>いま画面で見る量</h3>
          <div className="physics-metric-grid">
            {quantities.map((item) => (
              <div key={item.label} className="physics-metric-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </article>
  );
}

function TheoryMapPanel({ scene, onJump }) {
  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Theory Map</p>
          <h2>{scene.title}</h2>
        </div>
      </div>
      <div className="physics-atlas-grid">
        <article className="physics-atlas-card is-active">
          <h3>{scene.academicTitle}</h3>
          <p>{scene.theoryMap.bridge}</p>
        </article>
      </div>
      <div className="physics-connection-row">
        {scene.theoryMap.next.map((targetId) => {
          const target = getPhysicsScene(targetId);
          return (
            <button key={targetId} type="button" className="physics-chip" onClick={() => onJump(targetId)}>
              {target.title}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function PhysicsContentApp() {
  const [viewMode, setViewMode] = useState("sandbox");
  const [categoryId, setCategoryId] = useState(PHYSICS_HOME_CATEGORIES[0].id);
  const [sceneId, setSceneId] = useState("projectile");
  const [sceneState, setSceneState] = useState(() => cloneDefaultPhysicsState());
  const [overlays, setOverlays] = useState(() => getPhysicsOverlayState("projectile"));
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(0);
  const [activeFormulaId, setActiveFormulaId] = useState(getPhysicsScene("projectile").formulas[0].id);

  useEffect(() => {
    setOverlays((current) => getPhysicsOverlayState(sceneId, current));
    const scene = getPhysicsScene(sceneId);
    setActiveFormulaId(scene.formulas[0]?.id || "");
    setSimTime(0);
  }, [sceneId]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setSimTime((current) => current + 0.08 * speed);
    }, 110);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);

  const scene = getPhysicsScene(sceneId);
  const category = getPhysicsCategory(categoryId);
  const scenes = getScenesForCategory(categoryId);
  const params = sceneState[sceneId];
  const model = buildPhysicsSceneModel(sceneId, params, { time: simTime, speed });
  const mission = getPhysicsMissionResult(sceneId, model);
  const activeFormula = scene.formulas.find((item) => item.id === activeFormulaId) || scene.formulas[0];

  function selectCategory(nextCategoryId) {
    setCategoryId(nextCategoryId);
    const nextScenes = getScenesForCategory(nextCategoryId);
    if (nextScenes.length > 0) {
      setSceneId(nextScenes[0].id);
    }
  }

  function selectScene(nextSceneId) {
    const nextScene = getPhysicsScene(nextSceneId);
    setCategoryId(nextScene.categoryId);
    setSceneId(nextSceneId);
  }

  function updateParam(key, value) {
    setSceneState((current) => ({
      ...current,
      [sceneId]: {
        ...current[sceneId],
        [key]: value
      }
    }));
  }

  function applyPreset(values) {
    setSceneState((current) => ({
      ...current,
      [sceneId]: {
        ...current[sceneId],
        ...values
      }
    }));
  }

  function resetScene() {
    setSceneState((current) => ({
      ...current,
      [sceneId]: { ...PHYSICS_DEFAULTS[sceneId] }
    }));
    setSimTime(0);
  }

  function stepScene() {
    setSimTime((current) => current + 0.08 * speed);
  }

  function selectFormula(formula) {
    setActiveFormulaId(formula.id);
    setOverlays((current) => {
      const next = { ...current };
      for (const overlayId of formula.recommendedOverlays) {
        if (scene.overlays.includes(overlayId)) next[overlayId] = true;
      }
      return next;
    });
  }

  function renderControls() {
    if (sceneId === "projectile") {
      return (
        <>
          <RangeField label="初速" min={8} max={24} step={0.2} value={params.speed} suffix=" m/s" onChange={(value) => updateParam("speed", value)} />
          <RangeField label="角度" min={10} max={78} step={1} value={params.angleDeg} suffix=" deg" onChange={(value) => updateParam("angleDeg", value)} />
          <RangeField label="重力" min={1.6} max={15} step={0.1} value={params.gravity} suffix=" m/s^2" onChange={(value) => updateParam("gravity", value)} />
          <RangeField label="drag" min={0} max={0.3} step={0.01} value={params.drag} onChange={(value) => updateParam("drag", value)} />
          <RangeField label="質量" min={0.4} max={3} step={0.1} value={params.mass} suffix=" kg" onChange={(value) => updateParam("mass", value)} />
        </>
      );
    }

    if (sceneId === "collision") {
      return (
        <>
          <RangeField label="赤の質量" min={0.5} max={3.4} step={0.1} value={params.massA} suffix=" kg" onChange={(value) => updateParam("massA", value)} />
          <RangeField label="青の質量" min={0.5} max={3.4} step={0.1} value={params.massB} suffix=" kg" onChange={(value) => updateParam("massB", value)} />
          <RangeField label="赤の速度" min={-4} max={8} step={0.1} value={params.velocityA} suffix=" m/s" onChange={(value) => updateParam("velocityA", value)} />
          <RangeField label="青の速度" min={-4} max={6} step={0.1} value={params.velocityB} suffix=" m/s" onChange={(value) => updateParam("velocityB", value)} />
          <RangeField label="反発係数" min={0} max={1} step={0.02} value={params.restitution} onChange={(value) => updateParam("restitution", value)} />
        </>
      );
    }

    if (sceneId === "oscillator") {
      return (
        <>
          <RangeField label="質量" min={0.6} max={2.4} step={0.1} value={params.mass} suffix=" kg" onChange={(value) => updateParam("mass", value)} />
          <RangeField label="ばね定数" min={4} max={18} step={0.2} value={params.spring} suffix=" N/m" onChange={(value) => updateParam("spring", value)} />
          <RangeField label="振幅" min={0.4} max={1.8} step={0.05} value={params.amplitude} suffix=" m" onChange={(value) => updateParam("amplitude", value)} />
          <RangeField label="減衰" min={0} max={0.28} step={0.01} value={params.damping} onChange={(value) => updateParam("damping", value)} />
          <RangeField label="初期位相" min={0} max={180} step={1} value={params.phaseDeg} suffix=" deg" onChange={(value) => updateParam("phaseDeg", value)} />
        </>
      );
    }

    if (sceneId === "gas") {
      return (
        <>
          <RangeField label="粒子数" min={20} max={120} step={2} value={params.particleCount} onChange={(value) => updateParam("particleCount", value)} />
          <RangeField label="温度" min={12} max={100} step={1} value={params.temperature} suffix=" K*" onChange={(value) => updateParam("temperature", value)} />
          <RangeField label="体積" min={0.6} max={1.6} step={0.05} value={params.volume} suffix=" V" onChange={(value) => updateParam("volume", value)} />
          <RangeField label="粒子質量" min={0.6} max={1.6} step={0.05} value={params.massScale} onChange={(value) => updateParam("massScale", value)} />
        </>
      );
    }

    if (sceneId === "wave") {
      return (
        <>
          <RangeField label="振幅" min={0.5} max={1.6} step={0.05} value={params.amplitude} onChange={(value) => updateParam("amplitude", value)} />
          <RangeField label="周波数" min={0.6} max={2.4} step={0.05} value={params.frequency} onChange={(value) => updateParam("frequency", value)} />
          <RangeField label="波長" min={0.6} max={2.2} step={0.05} value={params.wavelength} onChange={(value) => updateParam("wavelength", value)} />
          <RangeField label="屈折率" min={1} max={2} step={0.02} value={params.refractiveIndex} onChange={(value) => updateParam("refractiveIndex", value)} />
        </>
      );
    }

    if (sceneId === "relativity") {
      return (
        <>
          <RangeField label="beta" min={0.05} max={0.94} step={0.01} value={params.beta} suffix=" c" onChange={(value) => updateParam("beta", value)} />
          <RangeField label="event x" min={2} max={8} step={0.1} value={params.eventX} onChange={(value) => updateParam("eventX", value)} />
          <RangeField label="event ct" min={1} max={6} step={0.1} value={params.eventT} onChange={(value) => updateParam("eventT", value)} />
          <RangeField label="固有長" min={4} max={10} step={0.2} value={params.properLength} suffix=" m" onChange={(value) => updateParam("properLength", value)} />
        </>
      );
    }

    return (
      <>
        <RangeField label="粒子エネルギー" min={0.6} max={7} step={0.1} value={params.energy} suffix=" E" onChange={(value) => updateParam("energy", value)} />
        <RangeField label="障壁高さ" min={1} max={8} step={0.1} value={params.barrierHeight} suffix=" V0" onChange={(value) => updateParam("barrierHeight", value)} />
        <RangeField label="障壁幅" min={0.5} max={2.5} step={0.05} value={params.barrierWidth} suffix=" a" onChange={(value) => updateParam("barrierWidth", value)} />
        <RangeField label="波束幅" min={0.6} max={2} step={0.05} value={params.packetWidth} suffix=" sigma" onChange={(value) => updateParam("packetWidth", value)} />
      </>
    );
  }

  return (
    <div className="dashboard-layout physics-app-shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <p className="eyebrow">Physics Playground</p>
          <h1 className="page-title">物理コンテンツ</h1>
        </div>
      </section>

      <section className="section-grid">
        <div className="physics-chip-row">
          {PHYSICS_HOME_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`physics-chip ${categoryId === item.id ? "is-active" : ""}`}
              onClick={() => selectCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="physics-scene-grid">
          {scenes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`physics-scene-card ${sceneId === item.id ? "is-active" : ""}`}
              onClick={() => selectScene(item.id)}
            >
              <strong>{item.title}</strong>
              <small>{item.academicTitle}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid physics-workbench">
        <aside className="surface physics-side-panel">
          <div className="physics-panel-head">
            <div>
              <p className="eyebrow">{category.label}</p>
              <h2>{scene.title}</h2>
              <p>{scene.summary}</p>
            </div>
          </div>

          <PlaybackControls
            isPlaying={isPlaying}
            speed={speed}
            onToggle={() => setIsPlaying((current) => !current)}
            onReset={resetScene}
            onStep={stepScene}
            onSpeed={setSpeed}
          />

          <div className="physics-chip-row">
            {(PHYSICS_PRESETS[sceneId] || []).map((preset) => (
              <button key={preset.id} type="button" className="physics-chip" onClick={() => applyPreset(preset.values)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="physics-control-grid">
            {renderControls()}
          </div>
        </aside>

        <div className="physics-main-stack">
          <div className="physics-chip-row">
            {PHYSICS_VIEW_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`physics-chip ${viewMode === item.id ? "is-active" : ""}`}
                onClick={() => setViewMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <section className="surface physics-visual-card">
            <div className="physics-panel-head">
              <div>
                <p className="eyebrow">{scene.academicTitle}</p>
                <h2>{scene.title}</h2>
              </div>
            </div>
            <div className="physics-scene-wrap">
              {renderScene(sceneId, model, params, overlays)}
            </div>
          </section>

          <div className="physics-detail-grid">
            <OverlayPanel
              scene={scene}
              overlays={overlays}
              onToggle={(overlayId, checked) => setOverlays((current) => ({ ...current, [overlayId]: checked }))}
            />
            <MissionCard scene={scene} mission={mission} />
          </div>

          {viewMode === "sandbox" ? <SandboxPanel scene={scene} /> : null}
          {viewMode === "guided" ? <GuidedLabPanel scene={scene} /> : null}
          {viewMode === "math" ? (
            <MathLinkPanel scene={scene} formula={activeFormula} model={model} params={params} onSelectFormula={selectFormula} />
          ) : null}
          {viewMode === "theory" ? <TheoryMapPanel scene={scene} onJump={selectScene} /> : null}

          <GraphPanel sceneId={sceneId} model={model} params={params} overlays={overlays} />
        </div>
      </section>
    </div>
  );
}

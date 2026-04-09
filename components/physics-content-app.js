"use client";

import { useEffect, useState } from "react";
import {
  PHYSICS_DEFAULTS,
  PHYSICS_HOME_CATEGORIES,
  PHYSICS_OVERLAY_OPTIONS,
  PHYSICS_PRESETS,
  PHYSICS_SCENES,
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
  const x = pad + ((point.x - bounds.xMin) / xRange) * (width - pad * 2);
  const y = height - pad - ((point.y - bounds.yMin) / yRange) * (height - pad * 2);
  return { x, y };
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

function renderRigidScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const startX = 126;
  const startY = 74;
  const endX = 506;
  const endY = 252;
  const radius = params.radius * 26;
  const diskX = startX + (endX - startX) * model.progress;
  const diskY = startY + (endY - startY) * model.progress - radius * 0.92;
  const spokeX = diskX + Math.cos(model.phaseAngle) * radius;
  const spokeY = diskY + Math.sin(model.phaseAngle) * radius;
  const angle = Math.atan2(endY - startY, endX - startX);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="剛体回転の scene">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <polygon
        points={`${startX},${startY} ${endX},${endY} ${endX},272 ${startX},272`}
        style={{ fill: "rgba(83, 168, 188, 0.14)", stroke: "rgba(83, 168, 188, 0.28)", strokeWidth: 2 }}
      />
      <line x1="44" y1="272" x2={width - 44} y2="272" className="physics-axis-line" />
      {overlays.trajectory ? (
        <line
          x1={startX + 12}
          y1={startY + 18}
          x2={endX - 18}
          y2={endY - 18}
          style={{ stroke: "rgba(255, 213, 108, 0.78)", strokeWidth: 4, strokeDasharray: "8 7", strokeLinecap: "round" }}
        />
      ) : null}
      <circle cx={diskX} cy={diskY} r={radius} style={{ fill: "#ffffff", stroke: "#53a8bc", strokeWidth: 4 }} />
      <line x1={diskX} y1={diskY} x2={spokeX} y2={spokeY} style={{ stroke: "#4e7683", strokeWidth: 4, strokeLinecap: "round" }} />
      {overlays.vectors ? (
        <line
          x1={diskX}
          y1={diskY}
          x2={diskX + Math.cos(angle) * (48 + model.metrics.velocity * 3.2)}
          y2={diskY + Math.sin(angle) * (48 + model.metrics.velocity * 3.2)}
          className="physics-vector-line"
        />
      ) : null}
      {overlays.energy ? (
        <g transform="translate(426 40)">
          <rect x="0" y="0" width="154" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(154 * model.metrics.translationalShare) / 100} height="12" rx="999" className="physics-energy-kinetic" />
          <rect
            x={(154 * model.metrics.translationalShare) / 100}
            y="0"
            width={154 - (154 * model.metrics.translationalShare) / 100}
            height="12"
            rx="999"
            style={{ fill: "rgba(255, 213, 108, 0.92)" }}
          />
          <text x="0" y="-10" className="physics-scene-label">translation / rotation</text>
        </g>
      ) : null}
      {overlays.phase ? (
        <text x="430" y="82" className="physics-scene-label">
          omega {formatPhysicsNumber(model.metrics.angularVelocity, 2)}
        </text>
      ) : null}
      <text x="54" y="58" className="physics-scene-label">start</text>
      <text x="512" y="238" className="physics-scene-label">finish</text>
    </svg>
  );
}

function renderFluidScene(model, overlays) {
  const width = 640;
  const height = 320;
  const obstacleX = 334;
  const obstacleY = 162;
  const obstacleR = 30 + model.metrics.wakeWidth * 16;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="流体と障害物の scene">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {overlays.heatmap
        ? model.heatCells.map((cell) => {
            const column = cell.index % 6;
            const row = Math.floor(cell.index / 6);
            return (
              <rect
                key={cell.index}
                x={70 + column * 84}
                y={48 + row * 38}
                width="84"
                height="38"
                style={{ fill: `rgba(83, 168, 188, ${0.08 + cell.intensity * 0.32})` }}
              />
            );
          })
        : null}
      <rect x="66" y="42" width="510" height="228" rx="28" style={{ fill: "none", stroke: "rgba(23, 29, 36, 0.12)", strokeWidth: 2 }} />
      {model.streamLines.map((line) => (
        <path
          key={line.id}
          d={pathFromSeries(line.points, width, height, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 70)}
          fill="none"
          stroke="rgba(78, 118, 131, 0.9)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <circle cx={obstacleX} cy={obstacleY} r={obstacleR} style={{ fill: "rgba(255, 255, 255, 0.92)", stroke: "rgba(78, 118, 131, 0.6)", strokeWidth: 3 }} />
      {overlays.vectors
        ? model.field.map((vector, index) => (
            <line
              key={index}
              x1={70 + vector.x * 510}
              y1={42 + vector.y * 228}
              x2={70 + vector.x * 510 + vector.vx * 24}
              y2={42 + vector.y * 228 + vector.vy * 24}
              className="physics-field-vector"
            />
          ))
        : null}
      <text x="64" y="28" className="physics-scene-label">upstream</text>
      <text x="504" y="28" className="physics-scene-label">wake</text>
    </svg>
  );
}

function renderWaveScene(model, overlays) {
  const width = 640;
  const height = 320;
  const leftPath = pathFromSeries(model.left, width / 2 + 18, height, { xMin: -1, xMax: 1, yMin: -1.2, yMax: 1.2 }, 28);
  const rightPath = pathFromSeries(model.right, width / 2 + 18, height, { xMin: 0, xMax: 2, yMin: -1.2, yMax: 1.2 }, 28);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="波の反射と屈折">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="0" y="0" width="320" height={height} style={{ fill: "rgba(255, 255, 255, 0.7)" }} />
      <rect x="320" y="0" width="320" height={height} style={{ fill: "rgba(160, 216, 234, 0.12)" }} />
      <line x1="320" y1="32" x2="320" y2="288" style={{ stroke: "rgba(23, 29, 36, 0.16)", strokeWidth: 3, strokeDasharray: "9 8" }} />
      <line x1="38" y1="160" x2="602" y2="160" className="physics-axis-line" />
      {overlays.wave ? (
        <>
          <path d={leftPath} transform="translate(0 0)" fill="none" stroke="#53a8bc" strokeWidth="4" strokeLinecap="round" />
          <path d={rightPath} transform="translate(302 0)" fill="none" stroke="#d68a33" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}
      {overlays.vectors ? (
        <>
          <line x1="120" y1="78" x2="204" y2="78" className="physics-vector-line" />
          <line x1="428" y1="78" x2="500" y2="78" style={{ stroke: "rgba(214, 138, 51, 0.82)", strokeWidth: 3, strokeLinecap: "round" }} />
        </>
      ) : null}
      {overlays.energy ? (
        <g transform="translate(390 40)">
          <rect x="0" y="0" width="160" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(160 * model.transmission) / 100} height="12" rx="999" style={{ fill: "rgba(214, 138, 51, 0.82)" }} />
          <text x="0" y="-10" className="physics-scene-label">
            T {formatPhysicsNumber(model.transmission, 1)}%
          </text>
        </g>
      ) : null}
      <text x="60" y="46" className="physics-scene-label">medium A</text>
      <text x="392" y="46" className="physics-scene-label">medium B</text>
    </svg>
  );
}

function renderEntropyScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const openingHeight = 42 + params.opening * 110;
  const openingTop = 160 - openingHeight / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="拡散と混合の scene">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {overlays.heatmap
        ? model.cells.map((count, index) => {
            const column = index % 5;
            const row = Math.floor(index / 5);
            return (
              <rect
                key={index}
                x={70 + column * 100}
                y={56 + row * 52}
                width="100"
                height="52"
                style={{ fill: `rgba(83, 168, 188, ${0.04 + count / 120})` }}
              />
            );
          })
        : null}
      <rect x="70" y="56" width="500" height="208" rx="24" style={{ fill: "none", stroke: "rgba(23, 29, 36, 0.12)", strokeWidth: 2 }} />
      <line x1="320" y1="56" x2="320" y2={openingTop} style={{ stroke: "rgba(23, 29, 36, 0.24)", strokeWidth: 8 }} />
      <line x1="320" y1={openingTop + openingHeight} x2="320" y2="264" style={{ stroke: "rgba(23, 29, 36, 0.24)", strokeWidth: 8 }} />
      {model.particles.map((particle, index) => (
        <circle
          key={index}
          cx={70 + particle.x * 500}
          cy={56 + particle.y * 208}
          r={particle.frozen ? 4 : 5.5}
          style={{
            fill: particle.species === "a" ? "rgba(255, 128, 96, 0.9)" : "rgba(103, 153, 242, 0.88)",
            opacity: particle.frozen ? 0.58 : 1
          }}
        />
      ))}
      {overlays.phase ? (
        <g transform="translate(420 30)">
          <rect x="0" y="0" width="146" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={(146 * model.metrics.entropy) / 100} height="12" rx="999" style={{ fill: "rgba(83, 168, 188, 0.88)" }} />
          <text x="0" y="-10" className="physics-scene-label">
            entropy {formatPhysicsNumber(model.metrics.entropy, 1)}
          </text>
        </g>
      ) : null}
      <text x="80" y="42" className="physics-scene-label">separated</text>
      <text x="458" y="42" className="physics-scene-label">mixed</text>
    </svg>
  );
}

function renderPhaseScene(model, overlays) {
  const width = 640;
  const height = 320;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="相図と相転移">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      {model.cells.map((cell) => {
        const column = cell.index % 8;
        const row = Math.floor(cell.index / 8);
        const fill =
          cell.phase === "solid"
            ? "rgba(103, 153, 242, 0.2)"
            : cell.phase === "liquid"
              ? "rgba(83, 168, 188, 0.16)"
              : "rgba(255, 213, 108, 0.2)";
        return <rect key={cell.index} x={84 + column * 52} y={48 + row * 44} width="52" height="44" style={{ fill }} />;
      })}
      <rect x="84" y="48" width="416" height="220" rx="24" style={{ fill: "none", stroke: "rgba(23, 29, 36, 0.14)", strokeWidth: 2 }} />
      <line x1="84" y1="268" x2="500" y2="268" className="physics-axis-line" />
      <line x1="84" y1="268" x2="84" y2="48" className="physics-axis-line" />
      <circle
        cx={84 + model.point.x * 378}
        cy={268 - model.point.y * 190}
        r="10"
        style={{ fill: "#ffffff", stroke: "#1b2430", strokeWidth: 3 }}
      />
      {overlays.phase ? (
        <g transform="translate(522 62)">
          <rect x="0" y="0" width="32" height="152" rx="16" style={{ fill: "rgba(23, 29, 36, 0.08)" }} />
          <rect
            x="0"
            y={152 - (152 * model.metrics.orderParameter) / 100}
            width="32"
            height={(152 * model.metrics.orderParameter) / 100}
            rx="16"
            style={{ fill: "rgba(83, 168, 188, 0.88)" }}
          />
          <text x="-4" y="176" className="physics-scene-label">
            order
          </text>
        </g>
      ) : null}
      <text x="92" y="36" className="physics-scene-label">pressure</text>
      <text x="438" y="294" className="physics-scene-label">temperature</text>
      <text x="522" y="242" className="physics-scene-label">{model.phase}</text>
    </svg>
  );
}

function renderRelativityScene(model, overlays) {
  const width = 640;
  const height = 320;
  const originX = 112;
  const originY = 252;
  const eventX = originX + 52 * 5.4;
  const eventY = originY - 34 * 3.2;
  const simultaneityY = originY - model.beta * 56;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="ローレンツ変換の時空図">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="56" y="40" width="528" height="236" rx="26" className="physics-diagram-panel" />
      <line x1={originX} y1={originY} x2={560} y2={originY} className="physics-axis-line" />
      <line x1={originX} y1={originY} x2={originX} y2={60} className="physics-axis-line" />
      {overlays.spacetime ? (
        <>
          <line x1={originX} y1={originY} x2={originX + 170} y2={62} style={{ stroke: "rgba(214, 138, 51, 0.78)", strokeWidth: 2.5, strokeDasharray: "8 6" }} />
          <line x1={originX} y1={originY} x2={originX + 22 + model.beta * 120} y2={70} style={{ stroke: "rgba(78, 118, 131, 0.88)", strokeWidth: 3 }} />
          <line x1={originX - 6} y1={simultaneityY} x2={538} y2={simultaneityY - model.beta * 46} style={{ stroke: "rgba(83, 168, 188, 0.66)", strokeWidth: 3 }} />
        </>
      ) : null}
      {overlays.vectors ? (
        <line x1={462} y1={76} x2={462 + model.beta * 110} y2={76} className="physics-vector-line" />
      ) : null}
      <circle cx={eventX} cy={eventY} r="9" style={{ fill: "rgba(255, 213, 108, 0.94)" }} />
      <text x="74" y="72" className="physics-scene-label">ct</text>
      <text x="548" y="272" className="physics-scene-label">x</text>
      <text x="426" y="108" className="physics-scene-label">
        gamma {formatPhysicsNumber(model.gamma, 2)}
      </text>
      <text x="426" y="132" className="physics-scene-label">
        x' {formatPhysicsNumber(model.xPrime, 2)}
      </text>
      <text x="426" y="156" className="physics-scene-label">
        ct' {formatPhysicsNumber(model.tPrime, 2)}
      </text>
    </svg>
  );
}

function renderPreQuantumScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const orbitRadius = 34 + params.orbitLevel * 18;
  const orbitX = 188;
  const orbitY = 164;
  const electronX = orbitX + Math.cos(model.phaseAngle) * orbitRadius;
  const electronY = orbitY + Math.sin(model.phaseAngle) * orbitRadius;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="前期量子論の scene">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <circle cx={orbitX} cy={orbitY} r="18" style={{ fill: "rgba(255, 128, 96, 0.9)" }} />
      {overlays.eigen
        ? [1, 2, 3, 4, 5, 6].map((level) => (
            <circle
              key={level}
              cx={orbitX}
              cy={orbitY}
              r={32 + level * 18}
              style={{ fill: "none", stroke: level === params.orbitLevel ? "rgba(83, 168, 188, 0.9)" : "rgba(23, 29, 36, 0.12)", strokeWidth: level === params.orbitLevel ? 3 : 1.5 }}
            />
          ))
        : null}
      <circle cx={electronX} cy={electronY} r="8" style={{ fill: "#53a8bc" }} />
      {model.metrics.kineticEnergy > 0 ? (
        <line x1="292" y1="96" x2={292 + model.metrics.kineticEnergy * 38} y2="96" className="physics-vector-line" />
      ) : null}
      {overlays.energy ? (
        <g transform="translate(372 54)">
          <rect x="0" y="0" width="178" height="12" rx="999" className="physics-energy-rail" />
          <rect x="0" y="0" width={Math.min(178, model.metrics.photonEnergy * 24)} height="12" rx="999" className="physics-energy-kinetic" />
          <text x="0" y="-10" className="physics-scene-label">photon energy</text>
        </g>
      ) : null}
      <text x="372" y="110" className="physics-scene-label">
        K {formatPhysicsNumber(model.metrics.kineticEnergy, 2)} eV
      </text>
      <text x="372" y="136" className="physics-scene-label">
        lambda {formatPhysicsNumber(model.metrics.spectralWavelength, 0)} nm
      </text>
      <text x="76" y="48" className="physics-scene-label">Bohr orbit</text>
    </svg>
  );
}

function renderQuantum1DScene(model, params, overlays) {
  const width = 640;
  const height = 320;
  const barrierX = 280 - params.barrierWidth * 36;
  const barrierWidth = params.barrierWidth * 72;
  const barrierHeight = params.barrierHeight * 22;
  const densityBounds = { xMin: -6, xMax: 6, yMin: 0, yMax: 1.1 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="1D量子井戸とトンネル">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <line x1="28" y1="250" x2={width - 28} y2="250" className="physics-axis-line" />
      <rect x={barrierX} y={250 - barrierHeight} width={barrierWidth} height={barrierHeight} rx="18" style={{ fill: "rgba(103, 153, 242, 0.18)", stroke: "rgba(59, 108, 204, 0.55)", strokeWidth: 2 }} />
      <rect x="78" y="250" width="118" height={params.wellDepth * 10} rx="18" style={{ fill: "rgba(83, 168, 188, 0.08)", stroke: "rgba(83, 168, 188, 0.28)", strokeWidth: 2 }} />
      {overlays.probability ? (
        <path d={areaFromSeries(model.density, width, height, densityBounds, 28)} style={{ fill: "rgba(83, 168, 188, 0.18)", stroke: "rgba(83, 168, 188, 0.82)", strokeWidth: 3 }} />
      ) : null}
      {overlays.energy ? (
        <line x1="40" y1={250 - params.energy * 20} x2="600" y2={250 - params.energy * 20} style={{ stroke: "rgba(214, 138, 51, 0.86)", strokeWidth: 3, strokeDasharray: "8 6" }} />
      ) : null}
      <text x="48" y="60" className="physics-scene-label">
        T {formatPhysicsNumber(model.transmission, 1)}%
      </text>
      <text x="48" y="84" className="physics-scene-label">
        bound {model.boundLevels}
      </text>
    </svg>
  );
}

function renderOscillatorScene(model, overlays) {
  const width = 640;
  const height = 320;
  const potentialPath = "M 120 250 C 190 150 250 86 320 74 C 390 86 450 150 520 250";
  const densityBounds = { xMin: -3.8, xMax: 3.8, yMin: 0, yMax: 1.1 };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="量子調和振動子">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <path d={potentialPath} fill="none" stroke="rgba(78, 118, 131, 0.9)" strokeWidth="4" />
      {overlays.eigen
        ? model.levels.map((level) => (
            <line
              key={level.index}
              x1="150"
              y1={248 - level.energy * 34}
              x2="490"
              y2={248 - level.energy * 34}
              style={{ stroke: level.index === model.selectedLevel ? "rgba(214, 138, 51, 0.88)" : "rgba(23, 29, 36, 0.18)", strokeWidth: level.index === model.selectedLevel ? 4 : 2 }}
            />
          ))
        : null}
      {overlays.probability ? (
        <path d={areaFromSeries(model.density, width, height, densityBounds, 72)} style={{ fill: "rgba(83, 168, 188, 0.16)", stroke: "rgba(83, 168, 188, 0.82)", strokeWidth: 3 }} />
      ) : null}
      <text x="74" y="56" className="physics-scene-label">
        n {model.selectedLevel}
      </text>
      <text x="74" y="82" className="physics-scene-label">
        omega {formatPhysicsNumber(model.metrics.omega, 2)}
      </text>
    </svg>
  );
}

function renderChaosScene(model, overlays) {
  const width = 640;
  const height = 320;
  const logisticCurve = Array.from({ length: 80 }, (_, index) => {
    const x = index / 79;
    return { x, y: 3.98 * x * (1 - x) };
  });
  const sequencePath = pathFromSeries(model.sequenceA, width / 2 - 8, height - 34, { xMin: 0, xMax: model.sequenceA.length - 1, yMin: 0, yMax: 1 }, 26);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="physics-scene-svg" role="img" aria-label="ロジスティック写像とカオス">
      <rect x="0" y="0" width={width} height={height} rx="28" className="physics-scene-panel" />
      <rect x="40" y="40" width="250" height="240" rx="20" className="physics-diagram-panel" />
      <line x1="64" y1="254" x2="264" y2="254" className="physics-axis-line" />
      <line x1="64" y1="254" x2="64" y2="58" className="physics-axis-line" />
      <path d={pathFromSeries(logisticCurve, 250, 240, { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, 24)} transform="translate(40 40)" fill="none" stroke="#53a8bc" strokeWidth="4" />
      <line x1="64" y1="254" x2="264" y2="54" style={{ stroke: "rgba(23, 29, 36, 0.14)", strokeWidth: 2 }} />
      <path d={sequencePath} transform="translate(0 20)" fill="none" stroke="rgba(214, 138, 51, 0.82)" strokeWidth="3" />
      {overlays.branching ? (
        <g transform="translate(336 34)">
          <rect x="0" y="0" width="250" height="248" rx="20" className="physics-diagram-panel" />
          {model.branching.map((point, index) => (
            <circle
              key={index}
              cx={16 + ((point.x - 2.7) / 1.4) * 218}
              cy={228 - point.y * 194}
              r="1.8"
              style={{ fill: "rgba(83, 168, 188, 0.78)" }}
            />
          ))}
        </g>
      ) : null}
      <text x="52" y="32" className="physics-scene-label">
        cobweb
      </text>
      <text x="348" y="30" className="physics-scene-label">
        branching
      </text>
    </svg>
  );
}

function renderScene(sceneId, model, params, overlays) {
  if (sceneId === "rigid") return renderRigidScene(model, params, overlays);
  if (sceneId === "fluid") return renderFluidScene(model, overlays);
  if (sceneId === "wave") return renderWaveScene(model, overlays);
  if (sceneId === "entropy") return renderEntropyScene(model, params, overlays);
  if (sceneId === "phase") return renderPhaseScene(model, overlays);
  if (sceneId === "relativity") return renderRelativityScene(model, overlays);
  if (sceneId === "prequantum") return renderPreQuantumScene(model, params, overlays);
  if (sceneId === "quantum1d") return renderQuantum1DScene(model, params, overlays);
  if (sceneId === "oscillator") return renderOscillatorScene(model, overlays);
  return renderChaosScene(model, overlays);
}

function SceneMissionCard({ scene, mission }) {
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

function OverlayPanel({ scene, overlays, onToggle }) {
  return (
    <article className="surface physics-controls-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Display Layer</p>
          <h2>表示切替</h2>
          <p>scene は固定したまま、見たい法則だけを重ねます。</p>
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

function SceneModePanel({ scene, viewMode, category }) {
  return (
    <article className="surface physics-mode-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">{PHYSICS_VIEW_MODES.find((mode) => mode.id === viewMode)?.title || "Playground"}</p>
          <h2>
            {viewMode === "playground"
              ? "まず動かす"
              : viewMode === "law"
                ? "法則を重ねて読む"
                : "秩序がどう現れるかを見る"}
          </h2>
          <p>
            {viewMode === "playground"
              ? `${category.label}という現象分類から入り、細かい専門語は scene のあとに出します。`
              : viewMode === "law"
                ? `${scene.academicTitle} の要点を、別画面へ追い出さずに今の図へ重ねます。`
                : scene.emergenceNote}
          </p>
        </div>
      </div>
      <div className="physics-note-grid">
        <article className="physics-note-panel">
          <h3>この scene で見る law</h3>
          <ul>
            {scene.lawNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="physics-note-panel">
          <h3>なぜここに置くか</h3>
          <ul>
            <li>phenomenon: {category.label}</li>
            <li>difficulty: {scene.difficulty}</li>
            <li>scope: {scene.status}</li>
            <li>theme: 連続変形 / 相の切替 / 時空 / 量子化</li>
          </ul>
        </article>
      </div>
    </article>
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
  if (sceneId === "rigid") {
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
            <div className="physics-bar-rail">
              <div className="physics-bar-fill is-kinetic" style={{ width: `${model.metrics.translationalShare}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.translational, 2)}</strong>
          </div>
          <div className="physics-bar-card">
            <span>回転</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill is-rotation" style={{ width: `${100 - model.metrics.translationalShare}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.rotational, 2)}</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "fluid") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Field Summary</p>
            <h2>流れ場の指標</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>Re</span>
            <strong>{formatPhysicsNumber(model.metrics.reynolds, 0)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>圧力損失</span>
            <strong>{formatPhysicsNumber(model.metrics.pressureDrop, 2)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>wake 幅</span>
            <strong>{formatPhysicsNumber(model.metrics.wakeWidth, 2)}</strong>
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
            <p className="eyebrow">Reflection / Transmission</p>
            <h2>境界で失われない量</h2>
          </div>
        </div>
        <div className="physics-bar-grid">
          <div className="physics-bar-card">
            <span>反射率</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill" style={{ width: `${model.metrics.reflection}%`, background: "linear-gradient(90deg, #53a8bc, #79bfd1)" }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.reflection, 1)}%</strong>
          </div>
          <div className="physics-bar-card">
            <span>透過率</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill" style={{ width: `${model.metrics.transmission}%`, background: "linear-gradient(90deg, #d68a33, #ffd56c)" }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.transmission, 1)}%</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "entropy") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Entropy / Mixing</p>
            <h2>戻りにくさの指標</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>entropy</span>
            <strong>{formatPhysicsNumber(model.metrics.entropy, 1)}</strong>
          </div>
          <div className="physics-compare-card">
            <span>mixedness</span>
            <strong>{formatPhysicsNumber(model.metrics.mixedness, 1)}%</strong>
          </div>
          <div className="physics-compare-card">
            <span>frozen</span>
            <strong>{formatPhysicsNumber(model.metrics.frozenRatio, 1)}%</strong>
          </div>
        </div>
      </article>
    );
  }

  if (sceneId === "phase") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Order Parameter</p>
            <h2>相の切替を数で見る</h2>
          </div>
        </div>
        <div className="physics-compare-bars">
          <div className="physics-compare-card">
            <span>phase</span>
            <strong>{model.phase}</strong>
          </div>
          <div className="physics-compare-card">
            <span>order</span>
            <strong>{formatPhysicsNumber(model.metrics.orderParameter, 1)}%</strong>
          </div>
          <div className="physics-compare-card">
            <span>criticality</span>
            <strong>{formatPhysicsNumber(model.metrics.criticality, 1)}%</strong>
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
            <h2>変換後の座標</h2>
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

  if (sceneId === "prequantum") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Threshold / Spectrum</p>
            <h2>古典が破れる場所</h2>
          </div>
        </div>
        <div className="physics-bar-grid">
          <div className="physics-bar-card">
            <span>光子エネルギー</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill" style={{ width: `${Math.min(100, (model.metrics.photonEnergy / 6) * 100)}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.photonEnergy, 2)} eV</strong>
          </div>
          <div className="physics-bar-card">
            <span>放出電子</span>
            <div className="physics-bar-rail">
              <div className="physics-bar-fill is-rotation" style={{ width: `${Math.min(100, model.metrics.kineticEnergy * 30)}%` }} />
            </div>
            <strong>{formatPhysicsNumber(model.metrics.kineticEnergy, 2)} eV</strong>
          </div>
        </div>
        {overlays.graph ? (
          <div className="physics-spectrum-strip">
            {model.spectrum.map((line) => (
              <div key={line.level} className="physics-spectrum-line" style={{ left: `${100 - ((line.wavelength - 380) / 380) * 100}%`, height: `${line.strength * 100}%` }}>
                <span>n{line.level}</span>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  if (sceneId === "quantum1d") {
    return (
      <article className="surface physics-log-card">
        <div className="physics-panel-head">
          <div>
            <p className="eyebrow">Probability</p>
            <h2>障壁と井戸の結果</h2>
          </div>
        </div>
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
            <span>bound levels</span>
            <strong>{model.metrics.boundLevels}</strong>
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
            <p className="eyebrow">Eigenstates</p>
            <h2>量子化されたばね</h2>
          </div>
        </div>
        <MiniSeriesChart
          series={model.density}
          bounds={{ xMin: -3.8, xMax: 3.8, yMin: 0, yMax: 1.1 }}
          color="#53a8bc"
          ariaLabel="量子調和振動子の確率密度"
        />
      </article>
    );
  }

  return (
    <article className="surface physics-log-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Chaos</p>
          <h2>時間発展の差</h2>
        </div>
      </div>
      {overlays.graph ? (
        <MiniSeriesChart
          series={model.sequenceA}
          bounds={{ xMin: 0, xMax: Math.max(model.sequenceA.length - 1, 1), yMin: 0, yMax: 1 }}
          color="#d68a33"
          fillColor="rgba(214, 138, 51, 0.15)"
          ariaLabel="ロジスティック写像の時間発展"
        />
      ) : null}
      <div className="physics-compare-bars">
        <div className="physics-compare-card">
          <span>lyapunov</span>
          <strong>{formatPhysicsNumber(model.metrics.lyapunov, 3)}</strong>
        </div>
        <div className="physics-compare-card">
          <span>final gap</span>
          <strong>{formatPhysicsNumber(model.metrics.finalGap, 4)}</strong>
        </div>
        <div className="physics-compare-card">
          <span>regime</span>
          <strong>{model.metrics.regime}</strong>
        </div>
      </div>
    </article>
  );
}

function TheoryMapCard({ scene, onJump }) {
  return (
    <article className="surface physics-log-card">
      <div className="physics-panel-head">
        <div>
          <p className="eyebrow">Theory Map</p>
          <h2>この scene が伸びる先</h2>
        </div>
      </div>
      <div className="physics-connection-row">
        {scene.connections.map((targetId) => {
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

export function PhysicsContentApp() {
  const [viewMode, setViewMode] = useState("playground");
  const [categoryId, setCategoryId] = useState(PHYSICS_HOME_CATEGORIES[0].id);
  const [sceneId, setSceneId] = useState("rigid");
  const [sceneState, setSceneState] = useState(() => cloneDefaultPhysicsState());
  const [overlays, setOverlays] = useState(() => getPhysicsOverlayState("rigid"));
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [simTime, setSimTime] = useState(0);
  const [simStep, setSimStep] = useState(0);

  useEffect(() => {
    setOverlays((current) => getPhysicsOverlayState(sceneId, current));
    setSimTime(0);
    setSimStep(0);
  }, [sceneId]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setSimTime((current) => current + 0.08 * speed);
      setSimStep((current) => current + 1);
    }, 110);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);

  const scene = getPhysicsScene(sceneId);
  const category = getPhysicsCategory(categoryId);
  const scenes = getScenesForCategory(categoryId);
  const params = sceneState[sceneId];
  const model = buildPhysicsSceneModel(sceneId, params, { time: simTime, step: simStep, speed });
  const mission = getPhysicsMissionResult(sceneId, model);

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
    setSimStep(0);
  }

  function stepScene() {
    setSimTime((current) => current + 0.08 * speed);
    setSimStep((current) => current + 1);
  }

  function renderControls() {
    if (sceneId === "rigid") {
      return (
        <>
          <RangeField label="質量" min={0.8} max={3} step={0.1} value={params.mass} suffix=" kg" onChange={(value) => updateParam("mass", value)} />
          <RangeField label="半径" min={0.35} max={1} step={0.02} value={params.radius} suffix=" m" onChange={(value) => updateParam("radius", value)} />
          <RangeField label="斜面角" min={10} max={42} step={1} value={params.slopeDeg} suffix=" deg" onChange={(value) => updateParam("slopeDeg", value)} />
          <RangeField label="慣性係数" min={0.35} max={1.05} step={0.05} value={params.inertiaFactor} onChange={(value) => updateParam("inertiaFactor", value)} />
          <RangeField label="高さ" min={2.5} max={6.5} step={0.1} value={params.height} suffix=" m" onChange={(value) => updateParam("height", value)} />
        </>
      );
    }

    if (sceneId === "fluid") {
      return (
        <>
          <RangeField label="流速" min={1} max={4.6} step={0.1} value={params.flowSpeed} suffix=" u" onChange={(value) => updateParam("flowSpeed", value)} />
          <RangeField label="粘性" min={0.3} max={1.8} step={0.05} value={params.viscosity} onChange={(value) => updateParam("viscosity", value)} />
          <RangeField label="障害物半径" min={0.6} max={1.4} step={0.05} value={params.obstacleSize} onChange={(value) => updateParam("obstacleSize", value)} />
          <RangeField label="密度" min={0.7} max={1.6} step={0.05} value={params.density} onChange={(value) => updateParam("density", value)} />
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

    if (sceneId === "entropy") {
      return (
        <>
          <RangeField label="粒子数" min={24} max={96} step={2} value={params.particleCount} onChange={(value) => updateParam("particleCount", value)} />
          <RangeField label="温度" min={4} max={84} step={1} value={params.temperature} suffix=" K*" onChange={(value) => updateParam("temperature", value)} />
          <RangeField label="開口" min={0.05} max={1} step={0.01} value={params.opening} onChange={(value) => updateParam("opening", value)} />
          <RangeField label="冷却" min={0} max={1} step={0.02} value={params.cooling} onChange={(value) => updateParam("cooling", value)} />
        </>
      );
    }

    if (sceneId === "phase") {
      return (
        <>
          <RangeField label="温度" min={4} max={96} step={1} value={params.temperature} suffix=" T" onChange={(value) => updateParam("temperature", value)} />
          <RangeField label="圧力" min={0.8} max={9.4} step={0.1} value={params.pressure} suffix=" P" onChange={(value) => updateParam("pressure", value)} />
          <RangeField label="結合強度" min={0.6} max={1.4} step={0.02} value={params.coupling} onChange={(value) => updateParam("coupling", value)} />
        </>
      );
    }

    if (sceneId === "relativity") {
      return (
        <>
          <RangeField label="速度 beta" min={0.05} max={0.94} step={0.01} value={params.beta} suffix=" c" onChange={(value) => updateParam("beta", value)} />
          <RangeField label="event x" min={2} max={8} step={0.1} value={params.eventX} onChange={(value) => updateParam("eventX", value)} />
          <RangeField label="event ct" min={1} max={6} step={0.1} value={params.eventT} onChange={(value) => updateParam("eventT", value)} />
        </>
      );
    }

    if (sceneId === "prequantum") {
      return (
        <>
          <RangeField label="周波数" min={0.5} max={1.6} step={0.02} value={params.frequency} suffix=" PHz" onChange={(value) => updateParam("frequency", value)} />
          <RangeField label="強度" min={0.3} max={1.5} step={0.05} value={params.intensity} onChange={(value) => updateParam("intensity", value)} />
          <RangeField label="仕事関数" min={1.4} max={4.4} step={0.05} value={params.workFunction} suffix=" eV" onChange={(value) => updateParam("workFunction", value)} />
          <RangeField label="軌道準位" min={3} max={6} step={1} value={params.orbitLevel} onChange={(value) => updateParam("orbitLevel", value)} />
        </>
      );
    }

    if (sceneId === "quantum1d") {
      return (
        <>
          <RangeField label="粒子エネルギー" min={0.8} max={6.5} step={0.1} value={params.energy} suffix=" E" onChange={(value) => updateParam("energy", value)} />
          <RangeField label="障壁高さ" min={1.5} max={8} step={0.1} value={params.barrierHeight} suffix=" V0" onChange={(value) => updateParam("barrierHeight", value)} />
          <RangeField label="障壁幅" min={0.5} max={2.4} step={0.05} value={params.barrierWidth} suffix=" a" onChange={(value) => updateParam("barrierWidth", value)} />
          <RangeField label="井戸深さ" min={2.5} max={8.5} step={0.1} value={params.wellDepth} suffix=" D" onChange={(value) => updateParam("wellDepth", value)} />
        </>
      );
    }

    if (sceneId === "oscillator") {
      return (
        <>
          <RangeField label="量子数 n" min={0} max={4} step={1} value={params.level} onChange={(value) => updateParam("level", value)} />
          <RangeField label="ばね定数" min={0.6} max={2.2} step={0.05} value={params.stiffness} onChange={(value) => updateParam("stiffness", value)} />
          <RangeField label="質量" min={0.6} max={1.8} step={0.05} value={params.mass} onChange={(value) => updateParam("mass", value)} />
          <RangeField label="横方向 scale" min={0.7} max={1.5} step={0.02} value={params.stretch} onChange={(value) => updateParam("stretch", value)} />
        </>
      );
    }

    return (
      <>
        <RangeField label="非線形パラメータ r" min={2.8} max={4} step={0.01} value={params.r} onChange={(value) => updateParam("r", value)} />
        <RangeField label="初期値 A" min={0.05} max={0.95} step={0.001} value={params.seedA} onChange={(value) => updateParam("seedA", value)} />
        <RangeField label="初期値 B" min={0.05} max={0.95} step={0.001} value={params.seedB} onChange={(value) => updateParam("seedB", value)} />
        <RangeField label="反復回数" min={20} max={64} step={1} value={params.iterations} onChange={(value) => updateParam("iterations", value)} />
      </>
    );
  }

  return (
    <div className="dashboard-layout physics-app-shell">
      <section className="section-grid section-head physics-hero">
        <div className="section-copy">
          <p className="eyebrow">Physics Playground: Emergence Lab</p>
          <h1 className="page-title">秩序が崩れたり現れたりする世界を、触って読む</h1>
          <p className="hero-lead physics-hero-lead">
            PhET の絞り込み、Algodoo と Physion の手触り、GeoGebra の可視化の強さを参考に、
            回転、流れ、波、不可逆性、相転移、時空、量子化を 1 本の app でつなぎました。
          </p>
        </div>

        <div className="physics-entry-grid">
          {PHYSICS_VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`surface physics-entry-card ${viewMode === mode.id ? "is-active" : ""}`}
              onClick={() => setViewMode(mode.id)}
            >
              <span>{mode.label}</span>
              <strong>{mode.title}</strong>
              <small>{mode.body}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="physics-category-grid">
          {PHYSICS_HOME_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`surface physics-category-card ${categoryId === item.id ? "is-active" : ""}`}
              onClick={() => selectCategory(item.id)}
            >
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <small>{item.body}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="physics-scene-grid">
          {scenes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`physics-scene-card ${sceneId === item.id ? "is-active" : ""}`}
              onClick={() => selectScene(item.id)}
            >
              <div className="physics-scene-meta">
                <span className="physics-badge">{item.difficulty}</span>
                <span className="physics-badge">{item.status}</span>
                <span className="physics-badge">{item.parameterCount} params</span>
              </div>
              <strong>{item.title}</strong>
              <small>{item.academicTitle}</small>
              <p>{item.summary}</p>
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

          <div className="physics-summary-grid">
            <article className="surface physics-summary-card">
              <span>View</span>
              <strong>{PHYSICS_VIEW_MODES.find((mode) => mode.id === viewMode)?.title || "Playground"}</strong>
              <small>scene は固定、読み方だけ変える</small>
            </article>
            <article className="surface physics-summary-card">
              <span>Scene</span>
              <strong>{scene.difficulty}</strong>
              <small>{scene.academicTitle}</small>
            </article>
          </div>

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
          <section className="surface physics-visual-card">
            <div className="physics-panel-head">
              <div>
                <p className="eyebrow">{scene.academicTitle}</p>
                <h2>{scene.title}</h2>
                <p>{scene.summary}</p>
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
            <SceneMissionCard scene={scene} mission={mission} />
          </div>

          <SceneModePanel scene={scene} viewMode={viewMode} category={category} />
          <GraphPanel sceneId={sceneId} model={model} params={params} overlays={overlays} />
          <TheoryMapCard scene={scene} onJump={selectScene} />
        </div>
      </section>
    </div>
  );
}

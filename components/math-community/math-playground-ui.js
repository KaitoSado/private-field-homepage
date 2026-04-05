"use client";

const DEFAULT_MODES = [
  { id: "play", label: "あそぶ" },
  { id: "edit", label: "いじる" },
  { id: "mission", label: "ミッション" }
];

export function MathPlaygroundLayout({ workspace, controls, caption, footer }) {
  return (
    <div className="math-playground-shell">
      <div className="math-panel-grid">
        <div className="surface math-workspace-card">
          {workspace}
          {caption ? <div className="math-canvas-caption">{caption}</div> : null}
        </div>

        <div className="surface math-side-card">
          <div className="math-control-stack">{controls}</div>
        </div>
      </div>

      {footer ? <div className="surface math-footer-card">{footer}</div> : null}
    </div>
  );
}

export function MathPlaygroundHeader({ title, starter }) {
  return (
    <div className="math-card-head math-playground-head">
      <h2>{title}</h2>
      {starter ? <span className="math-starter-pill">{starter}</span> : null}
    </div>
  );
}

export function MathModeTabs({ activeId, onSelect, items = DEFAULT_MODES }) {
  return (
    <div className="math-mode-tabs" role="tablist" aria-label="数学プレイグラウンドのモード">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          className={`math-mode-tab ${item.id === activeId ? "is-active" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MathPresetRow({ options, activeId, onSelect }) {
  return (
    <div className="math-chip-row">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`button button-ghost button-small ${item.id === activeId ? "is-active" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function MathActionRow({ children }) {
  return <div className="math-action-row">{children}</div>;
}

export function MathPlayPauseResetBar({
  isRunning,
  onToggleRun,
  onReset,
  onRandom,
  runLabel = "自動で動かす",
  stopLabel = "止める",
  resetLabel = "リセット",
  randomLabel = "おまかせ"
}) {
  return (
    <MathActionRow>
      {onRandom ? (
        <button type="button" className="button button-ghost button-small" onClick={onRandom}>
          {randomLabel}
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className="button button-ghost button-small" onClick={onReset}>
          {resetLabel}
        </button>
      ) : null}
      {onToggleRun ? (
        <button type="button" className="button button-ghost button-small" onClick={onToggleRun}>
          {isRunning ? stopLabel : runLabel}
        </button>
      ) : null}
    </MathActionRow>
  );
}

export function MathSliderField({ label, min, max, step = "1", value, onChange }) {
  return (
    <label className="field math-slider-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function MathNumberField({ label, value, onChange, min, max, step = "0.1" }) {
  return (
    <label className="field math-number-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function MathToggleField({ label, checked, onChange }) {
  return (
    <button
      type="button"
      className={`math-toggle ${checked ? "is-active" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span className="math-toggle-pill">{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

export function MathStoryCard({ title, children, className = "" }) {
  return (
    <div className={`math-readout ${className}`.trim()}>
      <strong>{title}</strong>
      {typeof children === "string" ? <span>{children}</span> : children}
    </div>
  );
}

export function MathStatusMessage({ title, children, tone = "" }) {
  return (
    <div className={`math-readout math-status-message ${tone}`.trim()}>
      <strong>{title}</strong>
      {typeof children === "string" ? <span>{children}</span> : children}
    </div>
  );
}

export function MathLegendRow({ items }) {
  return (
    <div className="math-legend-row">
      {items.map((item) => (
        <span key={item.label}>
          <i className={`math-legend-dot ${item.tone}`.trim()} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function MathKpi({ label, value }) {
  return (
    <div className="math-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function MathValueMeter({ label, value, min, max, valueLabel, accentClass = "", displayValue }) {
  const numericValue = typeof value === "number" ? value : Number(value);
  const ratio = Number.isFinite(numericValue) ? Math.min(100, Math.max(0, ((numericValue - min) / (max - min || 1)) * 100)) : 0;

  return (
    <div className={`math-meter-card ${accentClass}`.trim()}>
      <div className="math-card-head">
        <h3>{label}</h3>
        <strong>{displayValue ?? value}</strong>
      </div>
      <div className="math-meter-track">
        <div className="math-meter-fill" style={{ width: `${ratio}%` }} />
      </div>
      <span className="math-meter-note">{valueLabel}</span>
    </div>
  );
}

export function MathMissionCard({ mission }) {
  return (
    <div className={`math-mission-card ${mission.done ? "is-complete" : ""}`}>
      <span className="math-mission-badge">{mission.done ? "達成" : "ミッション"}</span>
      <strong>{mission.title}</strong>
      <p>{mission.description}</p>
      <span className="math-mission-status">{mission.statusText}</span>
    </div>
  );
}

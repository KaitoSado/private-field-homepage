"use client";

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

export function MathSliderField({ label, min, max, step = "1", value, onChange }) {
  return (
    <label className="field math-slider-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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

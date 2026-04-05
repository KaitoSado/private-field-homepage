"use client";

const AXIS_LABELS = ["X", "Y", "Z"];

export function ObjectInspectorPanel({
  object,
  transformMode,
  onSetTransformMode,
  onUpdateField,
  onDelete,
  canDelete,
  sceneStats
}) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">inspector</p>
        <h2 className="text-lg font-semibold text-slate-900">選択中のオブジェクト</h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["translate", "移動", "W"],
          ["rotate", "回転", "E"],
          ["scale", "拡大", "R"]
        ].map(([mode, label, key]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSetTransformMode(mode)}
            className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              transformMode === mode
                ? "bg-slate-900 text-white shadow-[0_14px_24px_rgba(15,23,42,0.24)]"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <div>{label}</div>
            <div className={`mt-1 text-[11px] ${transformMode === mode ? "text-slate-200" : "text-slate-400"}`}>{key}</div>
          </button>
        ))}
      </div>

      {object ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">{object.name}</div>
            <div className="mt-1 text-xs text-slate-500">{object.url ? "外部モデル読み込み済み" : "未選択"}</div>
          </div>

          <TransformGroup title="位置" values={object.position} onChange={(axis, value) => onUpdateField("position", axis, value)} />
          <TransformGroup
            title="回転 (deg)"
            values={object.rotation.map((value) => radiansToDegrees(value))}
            onChange={(axis, value) => onUpdateField("rotation", axis, degreesToRadians(value))}
          />
          <TransformGroup title="大きさ" values={object.scale} onChange={(axis, value) => onUpdateField("scale", axis, value)} min={0.1} step={0.1} />

          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete で削除
          </button>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm leading-7 text-slate-500">
          左パネルかビューポートから
          <br />
          オブジェクトを選んでください。
        </div>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
        <Kpi label="Object" value={sceneStats.count} />
        <Kpi label="Selected" value={object ? 1 : 0} />
      </div>
    </aside>
  );
}

function TransformGroup({ title, values, onChange, min = -1000, step = 0.1 }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="grid grid-cols-3 gap-2">
        {AXIS_LABELS.map((axisLabel, axis) => (
          <label key={axisLabel} className="grid gap-1 text-xs text-slate-500">
            <span>{axisLabel}</span>
            <input
              type="number"
              value={Number.isFinite(values[axis]) ? Number(values[axis].toFixed(2)) : 0}
              min={min}
              step={step}
              onChange={(event) => onChange(axis, Number(event.target.value))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="text-lg text-slate-900">{value}</strong>
    </div>
  );
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

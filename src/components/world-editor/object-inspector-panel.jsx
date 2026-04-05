"use client";

const AXIS_LABELS = ["X", "Y", "Z"];

export function ObjectInspectorPanel({
  object,
  transformMode,
  onSetTransformMode,
  onUpdateField,
  onDelete,
  canDelete,
  sceneStats,
  lighting,
  environment,
  fog,
  camera,
  onUpdateLightingField,
  onUpdateEnvironmentField,
  onUpdateFogField,
  onSaveCameraBookmark,
  onRequestCameraPose,
  onRenameCameraBookmark,
  onRemoveCameraBookmark,
  canUndo,
  canRedo,
  onUndo,
  onRedo
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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Redo
        </button>
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

      <ControlSection title="ライト">
        <ColorField label="アンビエントの色" value={lighting.ambient.color} onChange={(value) => onUpdateLightingField("ambient", "color", value)} />
        <RangeField
          label="アンビエントの強さ"
          value={lighting.ambient.intensity}
          min={0}
          max={2.5}
          step={0.05}
          onChange={(value) => onUpdateLightingField("ambient", "intensity", value)}
        />
        <ColorField label="太陽光の色" value={lighting.directional.color} onChange={(value) => onUpdateLightingField("directional", "color", value)} />
        <RangeField
          label="太陽光の強さ"
          value={lighting.directional.intensity}
          min={0}
          max={4}
          step={0.05}
          onChange={(value) => onUpdateLightingField("directional", "intensity", value)}
        />
        <TransformGroup
          title="太陽光の向き"
          values={lighting.directional.direction}
          onChange={(axis, value) => {
            const next = [...lighting.directional.direction];
            next[axis] = value;
            onUpdateLightingField("directional", "direction", next);
          }}
          min={-20}
          step={0.1}
        />
      </ControlSection>

      <ControlSection title="背景と環境">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["color", "背景色"],
            ["environment", "HDR環境"]
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onUpdateEnvironmentField("mode", mode)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                environment.mode === mode ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {environment.mode === "color" ? (
          <ColorField label="背景色" value={environment.backgroundColor} onChange={(value) => onUpdateEnvironmentField("backgroundColor", value)} />
        ) : (
          <SelectField
            label="環境プリセット"
            value={environment.environmentPreset}
            options={[
              ["sunset", "Sunset"],
              ["city", "City"],
              ["warehouse", "Warehouse"],
              ["dawn", "Dawn"],
              ["night", "Night"]
            ]}
            onChange={(value) => onUpdateEnvironmentField("environmentPreset", value)}
          />
        )}
      </ControlSection>

      <ControlSection title="フォグ">
        <ToggleField label="フォグを使う" checked={fog.enabled} onChange={(checked) => onUpdateFogField("enabled", checked)} />
        <ColorField label="フォグの色" value={fog.color} onChange={(value) => onUpdateFogField("color", value)} />
        <RangeField label="近くから" value={fog.near} min={1} max={60} step={1} onChange={(value) => onUpdateFogField("near", value)} />
        <RangeField label="遠くまで" value={fog.far} min={10} max={120} step={1} onChange={(value) => onUpdateFogField("far", value)} />
      </ControlSection>

      <ControlSection title="カメラ">
        <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">保存した視点</div>
              <div className="text-xs text-slate-500">最大 5件</div>
            </div>
            <button
              type="button"
              onClick={onSaveCameraBookmark}
              disabled={camera.bookmarks.length >= 5}
              className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              今の視点を保存
            </button>
          </div>
          {camera.bookmarks.length ? (
            <div className="space-y-2">
              {camera.bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <input
                      value={bookmark.label}
                      onChange={(event) => onRenameCameraBookmark(bookmark.id, event.target.value)}
                      className="w-full rounded-lg border border-transparent bg-transparent text-sm font-semibold text-slate-900 outline-none focus:border-slate-300 focus:bg-white focus:px-2 focus:py-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequestCameraPose(bookmark.pose)}
                    className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                  >
                    移動
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveCameraBookmark(bookmark.id)}
                    className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-300"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">まだ保存した視点はありません。</div>
          )}
        </div>
      </ControlSection>

      <div className="mt-auto grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
        <Kpi label="Object" value={sceneStats.count} />
        <Kpi label="Selected" value={object ? 1 : 0} />
      </div>
    </aside>
  );
}

function ControlSection({ title, children }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {children}
    </div>
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

function RangeField({ label, value, min, max, step, onChange }) {
  return (
    <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{Number(value).toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-16 rounded-xl border border-slate-200 bg-white" />
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
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

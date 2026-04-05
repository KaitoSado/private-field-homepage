"use client";

export function ObjectListPanel({
  objects,
  selectedId,
  onSelect,
  onRename,
  onTriggerImport,
  onTriggerSceneImport,
  onExportScene,
  onClearScene,
  status
}) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">objects</p>
        <h2 className="text-lg font-semibold text-slate-900">読み込んだモデル</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button type="button" onClick={onTriggerImport} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          GLB / GLTF を追加
        </button>
        <button
          type="button"
          onClick={onTriggerSceneImport}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          JSON 読み込み
        </button>
        <button
          type="button"
          onClick={onExportScene}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          JSON 保存
        </button>
        <button
          type="button"
          onClick={onClearScene}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
        >
          全消し
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
        {status || "GLB/GLTF をドラッグ&ドロップすると、ここに並びます。"}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {objects.length ? (
          objects.map((object, index) => (
            <button
              key={object.id}
              type="button"
              onClick={() => onSelect(object.id)}
              className={`grid w-full gap-2 rounded-2xl border px-3 py-3 text-left transition ${
                selectedId === object.id
                  ? "border-cyan-300 bg-cyan-50 shadow-[0_16px_30px_rgba(8,145,178,0.14)]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">#{index + 1}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{object.mimeType?.includes("json") ? "GLTF" : "GLB"}</span>
              </div>
              <input
                value={object.name}
                onChange={(event) => onRename(object.id, event.target.value)}
                onClick={(event) => event.stopPropagation()}
                className="rounded-xl border border-transparent bg-transparent px-0 py-0 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:px-2 focus:py-1"
              />
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm leading-7 text-slate-500">
            左のボタンか、中央のビューポートへ
            <br />
            GLB / GLTF を落としてください。
          </div>
        )}
      </div>
    </aside>
  );
}

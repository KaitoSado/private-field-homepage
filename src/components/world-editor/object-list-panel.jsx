"use client";

export function ObjectListPanel({
  sceneName,
  onSceneNameChange,
  objects,
  selectedId,
  onSelect,
  onRename,
  onTriggerImport,
  onTriggerSceneImport,
  onExportScene,
  onShareScene,
  onSaveScene,
  status,
  scenes = [],
  currentSceneId,
  onCreateScene,
  onSwitchScene,
  onDeleteScene,
  showSceneManager = true,
  projectLabel,
  projectRole,
  members = [],
  onCopyInvite,
  inviteEnabled = false,
  inviteLabel = "招待リンク",
  projectAccessMode = "invite_only",
  onToggleProjectAccessMode,
  accessModeEnabled = false
}) {
  const saveLabel = showSceneManager ? "ローカル保存" : "変更を保存";
  const shareLabel = showSceneManager ? "URL共有" : `${inviteLabel}を共有`;

  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_24px_60px_rgba(20,29,40,0.08)] backdrop-blur">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">scene</p>
          <h2 className="text-lg font-semibold text-slate-900">空間の管理</h2>
        </div>
        <input
          value={sceneName}
          onChange={(event) => onSceneNameChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-300"
          placeholder="シーン名"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button type="button" onClick={onTriggerImport} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          GLB / GLTF を追加
        </button>
        <button
          type="button"
          onClick={onSaveScene}
          className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onExportScene}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          ファイル書き出し
        </button>
        <button
          type="button"
          onClick={onTriggerSceneImport}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          ファイル読み込み
        </button>
        <button
          type="button"
          onClick={onShareScene}
          className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 sm:col-span-2 xl:col-span-1"
        >
          {shareLabel}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-600">
        {status || "GLB / GLTF を落として、シーンを保存しながら組みます。"}
      </div>

      <section className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {projectLabel ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-slate-400">project</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{projectLabel}</div>
                {projectRole ? <div className="mt-1 text-xs text-slate-500">あなたの権限: {projectRole}</div> : null}
                <div className="mt-1 text-xs text-slate-500">{projectAccessMode === "open" ? "現在: 開放モード" : "現在: 招待制"}</div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {accessModeEnabled && onToggleProjectAccessMode ? (
                  <button
                    type="button"
                    onClick={onToggleProjectAccessMode}
                    className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    {projectAccessMode === "open" ? "招待制に戻す" : "開放モードにする"}
                  </button>
                ) : null}
                {inviteEnabled && onCopyInvite ? (
                  <button
                    type="button"
                    onClick={onCopyInvite}
                    className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    {inviteLabel}
                  </button>
                ) : null}
              </div>
            </div>
            {members.length ? (
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <span key={member.userId} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700">
                    {member.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">読み込んだモデル</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{objects.length} 件</span>
          </div>

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
              上の「GLB / GLTF を追加」か、
              <br />
              画面中央へのドラッグ&ドロップで追加できます。
            </div>
          )}
        </div>

        {showSceneManager ? (
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">シーン一覧</h3>
              <button
                type="button"
                onClick={onCreateScene}
                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                新規作成
              </button>
            </div>

            <div className="space-y-2">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-3 ${
                    scene.id === currentSceneId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <button type="button" onClick={() => onSwitchScene(scene.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold">{scene.name}</div>
                    <div className={`mt-1 text-[11px] ${scene.id === currentSceneId ? "text-slate-300" : "text-slate-500"}`}>
                      {formatUpdatedAt(scene.updatedAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteScene(scene.id)}
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold transition ${
                      scene.id === currentSceneId ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) return "未保存";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未保存";
  return `${date.getMonth() + 1}/${date.getDate()} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

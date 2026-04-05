"use client";

export function CollabChatPanel({ open, onToggle, messages, draft, onDraftChange, onSend }) {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 w-[320px] max-w-[calc(100%-2rem)] rounded-[24px] border border-white/10 bg-slate-950/80 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-white"
      >
        <span>チャット</span>
        <span className="text-slate-300">{open ? "閉じる" : "開く"}</span>
      </button>

      {open ? (
        <div className="grid gap-3 border-t border-white/10 px-4 py-4">
          <div className="max-h-60 overflow-y-auto space-y-2">
            {messages.length ? (
              messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] font-semibold text-cyan-200">{message.authorName}</div>
                  <div className="mt-1 text-sm leading-6 text-white">{message.content}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-slate-300">まだメッセージはありません。</div>
            )}
          </div>
          <div className="grid gap-2">
            <textarea
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              rows={3}
              placeholder="ここで雑談や相談を流せます"
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300"
            />
            <button type="button" onClick={onSend} className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
              送信
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

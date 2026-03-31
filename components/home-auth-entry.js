"use client";

import { useEffect, useRef, useState } from "react";
import { AuthPanel } from "@/components/auth-panel";

export function HomeAuthEntry() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  return (
    <>
      <button type="button" className="button button-primary" onClick={() => setOpen((current) => !current)}>
        {open ? "閉じる" : "無料ではじめる"}
      </button>

      {open ? (
        <section ref={panelRef} className="home-auth-reveal">
          <div className="surface home-auth-shell">
            <div className="home-auth-copy">
              <p className="eyebrow">Start here</p>
              <h2>このまま登録して、自分の公開ページを作る。</h2>
              <p className="headline">
                ページ移動せずにここでログインまたは新規登録できます。登録後はそのまま自分の公開ページへ移動します。
              </p>
            </div>
            <AuthPanel />
          </div>
        </section>
      ) : null}
    </>
  );
}

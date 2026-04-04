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
          <div className="home-auth-shell">
            <AuthPanel />
          </div>
        </section>
      ) : null}
    </>
  );
}

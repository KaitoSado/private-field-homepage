"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    void fetch("/api/telemetry/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        level: "error",
        message: error?.message || "App router error",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        stack: error?.stack || "",
        source: "app.error"
      })
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="shell narrow-shell">
      <section className="surface empty-state">
        <p className="eyebrow">500</p>
        <h1>エラーが発生しました</h1>
        <p>時間をおいて再試行するか、継続する場合はサポートへ連絡してください。</p>
        <div className="hero-actions">
          <button type="button" className="button button-primary" onClick={() => reset()}>
            再試行
          </button>
          <Link href="/contact" className="button button-secondary">
            問い合わせ
          </Link>
        </div>
      </section>
    </main>
  );
}

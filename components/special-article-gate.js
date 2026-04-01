"use client";

import { useState } from "react";

export function SpecialArticleGate({ articleId }) {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/special-articles/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          articleId,
          password
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "パスワードを確認できませんでした。");
      }

      window.location.reload();
    } catch (error) {
      setStatus(error.message || "パスワードを確認できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="surface search-panel form-stack special-article-gate" onSubmit={handleSubmit}>
      <div className="section-copy">
        <p className="eyebrow">Password required</p>
        <h2>この記事はパスワードが必要です</h2>
        <p className="muted">閲覧するには指定されたパスワードを入力してください。</p>
      </div>

      <label className="field">
        <span>パスワード</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="パスワードを入力"
          required
        />
      </label>

      <div className="hero-actions">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "確認中..." : "開く"}
        </button>
      </div>

      <p className={`status-text ${status ? "status-error" : ""}`}>
        {status || "パスワードが一致すると、そのまま記事本文を表示します。"}
      </p>
    </form>
  );
}

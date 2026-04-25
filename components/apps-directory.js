"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const categories = [
  { key: "all", label: "すべて" },
  { key: "social", label: "暮らし・共同" },
  { key: "study", label: "学習・研究" },
  { key: "play", label: "遊び" },
  { key: "create", label: "制作" },
  { key: "info", label: "情報" }
];

const statusGroups = [
  {
    key: "live",
    label: "公開中",
    description: "使えるもの。"
  },
  {
    key: "soon",
    label: "準備中",
    description: "未公開。"
  },
  {
    key: "preview",
    label: "準備室",
    description: "試運転。"
  }
];

const categoryLabels = {
  social: "共同",
  study: "学習",
  play: "遊び",
  create: "制作",
  info: "情報",
  ops: "運営"
};

const statusLabels = {
  live: "公開中",
  soon: "公開前",
  preview: "準備室",
  ops: "管理用"
};

export function AppsDirectory({ apps, operations }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory = category === "all" || app.category === category;
      const haystack = [app.name, app.formalName, app.summary, app.signal, categoryLabels[app.category], statusLabels[app.status]]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [apps, category, normalizedQuery]);

  const groupedApps = statusGroups.map((group) => ({
    ...group,
    apps: filteredApps.filter((app) => app.status === group.key)
  }));

  return (
    <section className="apps-directory" aria-label="アプリ一覧">
      <div className="apps-directory-tools">
        <label className="apps-directory-search">
          <span>検索</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="英語 / 研究 / 投票"
          />
        </label>
        <div className="apps-directory-filters" aria-label="カテゴリ">
          {categories.map((item) => (
            <button
              key={item.key}
              type="button"
              className={category === item.key ? "is-active" : ""}
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="apps-directory-layout">
        <aside className="apps-directory-rail" aria-label="状態別件数">
          {statusGroups.map((group) => {
            const count = filteredApps.filter((app) => app.status === group.key).length;
            return (
              <div key={group.key}>
                <span>{group.label}</span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </aside>

        <div className="apps-shelves">
          <div className="apps-results-head">
            <h2>Apps</h2>
            <p>{filteredApps.length}件</p>
          </div>

          {groupedApps.map((group) =>
            group.apps.length ? (
              <section key={group.key} className={`apps-shelf-section is-${group.key}`}>
                <div className="apps-shelf-head">
                  <h3>{group.label}</h3>
                  <p>{group.description}</p>
                </div>
                <div className="apps-app-list">
                  {group.apps.map((app) => (
                    <AppShelfItem key={`${group.key}-${app.name}`} app={app} />
                  ))}
                </div>
              </section>
            ) : null
          )}

          {!filteredApps.length ? (
            <div className="apps-empty-state">
              <h3>該当なし</h3>
              <p>検索を変える。</p>
            </div>
          ) : null}

          <section className="apps-shelf-section is-ops">
            <div className="apps-shelf-head">
              <h3>運営用</h3>
              <p>管理・点検。</p>
            </div>
            <div className="apps-ops-list">
              {operations.map((app) => (
                <AppShelfItem key={`ops-${app.name}`} app={app} compact />
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function AppShelfItem({ app, compact = false }) {
  const content = (
    <>
      <span className="apps-app-mark" aria-hidden="true">
        {app.signal}
      </span>
      <span className="apps-app-copy">
        <span className="apps-app-meta">
          <span>{categoryLabels[app.category]}</span>
          <span>{statusLabels[app.status]}</span>
        </span>
        <strong>{app.formalName || app.name}</strong>
        <span>{app.summary}</span>
      </span>
      <span className="apps-app-action">{app.href ? "開く" : "準備中"}</span>
    </>
  );

  const className = `apps-app-row is-${app.status}${compact ? " is-compact" : ""}`;

  if (!app.href) {
    return (
      <article className={className} aria-disabled="true">
        {content}
      </article>
    );
  }

  return (
    <Link href={app.href} className={className}>
      {content}
    </Link>
  );
}

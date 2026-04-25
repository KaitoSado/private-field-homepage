"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SignaturePostShelf({ username, posts }) {
  const availableTags = [];

  for (const post of posts) {
    for (const tag of post.tags || []) {
      if (!availableTags.includes(tag)) {
        availableTags.push(tag);
      }
    }
  }

  const filterOptions = ["all", ...availableTags.slice(0, 4)];
  const [activeFilter, setActiveFilter] = useState("all");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const visiblePosts =
    activeFilter === "all" ? posts : posts.filter((post) => (post.tags || []).includes(activeFilter));
  const featuredPosts = visiblePosts.slice(0, 3);
  const archivedPosts = visiblePosts.slice(3);

  useEffect(() => {
    setArchiveOpen(false);
  }, [activeFilter]);

  return (
    <div className="signature-shelf">
      {filterOptions.length > 1 ? (
        <div className="signature-filter-row">
          {filterOptions.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`signature-filter-chip ${activeFilter === filter ? "is-active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === "all" ? "すべて" : `#${filter}`}
            </button>
          ))}
        </div>
      ) : null}

      <div className="signature-post-grid">
        {featuredPosts.length ? (
          <>
            {featuredPosts.map((post) => {
              const thumbnail = getPostThumbnail(post);
              return (
                <Link key={post.id} href={`/@${username}/${post.slug}`} className="signature-post-card">
                  <div className="post-card-head">
                    <span>{formatDate(post.published_at || post.updated_at)}</span>
                    <span>{post.tags[0] ? `#${post.tags[0]}` : "制作メモ"}</span>
                  </div>
                  <div className={`signature-post-body ${thumbnail ? "has-thumb" : ""}`}>
                    <div className="signature-post-copy">
                      <h3>{post.title}</h3>
                      <p className="signature-post-preview">{getPostPreview(post)}</p>
                    </div>
                    {thumbnail ? (
                      <div className="signature-post-thumb-wrap signature-post-thumb-wrap-inline">
                        <img src={thumbnail} alt={`${post.title} のサムネイル`} className="signature-post-thumb" />
                      </div>
                    ) : null}
                  </div>
                  {post.tags.length ? (
                    <div className="tag-row">
                      {post.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              );
            })}
            <Link href={`/@${username}/special-articles`} className="signature-post-card signature-post-card-special">
              <div className="post-card-head">
                <span>長文</span>
                <span>まとめ</span>
              </div>
              <div className="signature-post-copy">
                <h3>特別記事</h3>
                <p className="signature-post-preview">
                  通常の記事とは別に、深くまとめた長文や限定公開の読みものを置くための入口です。
                </p>
              </div>
              <div className="signature-special-cta">
                <span>特別記事を見る</span>
              </div>
            </Link>
          </>
        ) : (
          <div className="signature-post-card empty-state">
            <h3>一致する記事がありません</h3>
            <p>別のタグに切り替えると、他の公開記事が表示されます。</p>
          </div>
        )}
      </div>

      {archivedPosts.length ? (
        <div className="signature-post-archive">
          <button
            type="button"
            className="signature-inline-toggle signature-archive-toggle"
            onClick={() => setArchiveOpen((current) => !current)}
          >
            {archiveOpen ? "アーカイブをたたむ" : `過去の記事をもっと見る (${archivedPosts.length})`}
          </button>

          {archiveOpen ? (
            <div className="signature-post-archive-list">
              {archivedPosts.map((post) => (
                <Link key={post.id} href={`/@${username}/${post.slug}`} className="signature-post-archive-item">
                  {getPostThumbnail(post) ? (
                    <div className="signature-post-archive-thumb-wrap">
                      <img src={getPostThumbnail(post)} alt={`${post.title} のサムネイル`} className="signature-post-archive-thumb" />
                    </div>
                  ) : null}
                  <div className="signature-post-archive-meta">
                    <span>{formatDate(post.published_at || post.updated_at)}</span>
                    <span>{post.tags[0] ? `#${post.tags[0]}` : "制作メモ"}</span>
                  </div>
                  <strong>{post.title}</strong>
                  <p>{getPostPreview(post, 96)}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "下書き";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function getPostPreview(post, limit = 120) {
  const source = `${post.excerpt || post.body || ""}`.trim();
  if (!source) {
    return "制作の意図や問いを添えると、ここに表示されます。";
  }

  if (source.length <= limit) {
    return source;
  }

  const preview = source.slice(0, limit);
  const breakIndex = Math.max(preview.lastIndexOf("\n"), preview.lastIndexOf(" "));
  const safePreview = (breakIndex > Math.floor(limit * 0.6) ? preview.slice(0, breakIndex) : preview).trimEnd();
  return `${safePreview}…`;
}

function getPostThumbnail(post) {
  if (post.cover_image_url) return post.cover_image_url;
  const firstImage = Array.isArray(post.media_items)
    ? post.media_items.find((item) => item?.kind !== "video" && item?.url)
    : null;
  return firstImage?.url || "";
}

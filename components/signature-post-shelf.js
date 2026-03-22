"use client";

import { useState } from "react";
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

  const visiblePosts =
    activeFilter === "all" ? posts : posts.filter((post) => (post.tags || []).includes(activeFilter));

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
              {filter === "all" ? "All" : `#${filter}`}
            </button>
          ))}
        </div>
      ) : null}

      <div className="signature-post-grid">
        {visiblePosts.length ? (
          visiblePosts.map((post) => (
            <Link key={post.id} href={`/@${username}/${post.slug}`} className="signature-post-card">
              <div className="post-card-head">
                <span>{formatDate(post.published_at || post.updated_at)}</span>
                <span>{post.tags[0] ? `#${post.tags[0]}` : "Field note"}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.excerpt || "制作の意図や問いを添えると、ここに表示されます。"}</p>
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
          ))
        ) : (
          <div className="signature-post-card empty-state">
            <h3>一致する記事がありません</h3>
            <p>別のタグに切り替えると、他の公開記事が表示されます。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

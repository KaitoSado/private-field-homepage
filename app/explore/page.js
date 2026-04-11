import Link from "next/link";
import { AvatarMark } from "@/components/avatar-mark";
import { KeioBadge } from "@/components/keio-badge";
import { getExploreData } from "@/lib/data";

export const metadata = {
  title: "Explore | Commune",
  description: "Browse creators, researchers, freelancers, and public posts."
};

export const revalidate = 0;

export default async function ExplorePage({ searchParams }) {
  const query = typeof searchParams?.q === "string" ? searchParams.q : "";
  const sort = searchParams?.sort === "popular" ? "popular" : "newest";
  const { profiles, posts, recommendations, tags } = await getExploreData({ query, sort });

  return (
    <main className="shell">
      <section className="section-grid section-head">
        <div className="section-copy">
          <h1 className="page-title">ユーザーと記事を探す</h1>
          <p>
            名刺代わりのプロフィール、公開記事、タグからコミュニティ全体を辿れます。
          </p>
        </div>
        <form className="surface search-panel" action="/explore">
          <label className="field">
            <span>検索</span>
            <input name="q" defaultValue={query} placeholder="名前、肩書き、記事タイトル、タグ" />
          </label>
          <div className="hero-actions">
            <button type="submit" className="button button-primary">
              検索
            </button>
            <Link href={`/explore?sort=${sort === "popular" ? "newest" : "popular"}`} className="button button-secondary">
              {sort === "popular" ? "新着順へ" : "人気順へ"}
            </Link>
          </div>
        </form>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <h2>おすすめユーザー</h2>
        </div>

        <div className="card-grid">
          {recommendations.map((profile) => (
            <Link
              key={profile.id}
              href={`/@${profile.username}`}
              className="surface card profile-card"
              data-profile-id={profile.id}
            >
              <AvatarMark profile={profile} size="md" />
              <div>
                <h3>{profile.display_name || profile.username}</h3>
                <p className="muted">@{profile.username}</p>
              </div>
              <KeioBadge profile={profile} compact />
              <p>{profile.headline || "プロフィールを準備中です。"}</p>
              <div className="inline-meta">
                <span>{profile.stats.follower_count} followers</span>
                <span>{profile.stats.public_post_count} posts</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <h2>プロフィール一覧</h2>
        </div>

        <div className="card-grid">
          {profiles.length ? (
            profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/@${profile.username}`}
                className="surface card profile-card"
                data-profile-id={profile.id}
              >
                <AvatarMark profile={profile} size="md" />
                <div>
                  <h3>{profile.display_name || profile.username}</h3>
                  <p className="muted">@{profile.username}</p>
                </div>
                <KeioBadge profile={profile} compact />
                <p>{profile.headline || "プロフィールを準備中です。"}</p>
                {profile.location ? <span className="muted">{profile.location}</span> : null}
                <div className="inline-meta">
                  <span>{profile.stats.follower_count} followers</span>
                  <span>{profile.stats.public_post_count} posts</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="surface empty-state">
              <h3>まだユーザーがいません</h3>
              <p>最初のユーザー登録でこの一覧が動き始めます。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <h2>公開記事一覧</h2>
        </div>

        <div className="stack-list">
          {posts.length ? (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/@${post.profiles.username}/${post.slug}`}
                className="surface post-card"
                data-author-id={post.profiles.id}
              >
                <div className="post-card-head">
                  <span>@{post.profiles.username}</span>
                  <span>{formatDate(post.published_at || post.updated_at)}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt || "要約はまだありません。"}</p>
                <div className="inline-meta">
                  <span>{post.stats.like_count} likes</span>
                  <span>{post.stats.comment_count} comments</span>
                </div>
                {post.tags.length ? (
                  <div className="tag-row">
                    {post.tags.map((tag) => (
                      <span key={`${post.id}-${tag}`} className="tag-chip">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            ))
          ) : (
            <div className="surface empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>記事が公開されると、ここに流れてきます。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <h2>人気タグ</h2>
        </div>

        <div className="surface tag-cloud">
          {tags.length ? (
            tags.map((tag) => (
              <Link key={tag.tag} href={`/explore?q=${encodeURIComponent(tag.tag)}`} className="tag-chip large">
                #{tag.tag} <span>{tag.use_count}</span>
              </Link>
            ))
          ) : (
            <div className="empty-inline">タグはまだありません。</div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

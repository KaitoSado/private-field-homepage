import Link from "next/link";
import { AvatarMark } from "@/components/avatar-mark";
import { getCommunityFeed } from "@/lib/data";

export const revalidate = 0;

export default async function HomePage() {
  const { profiles, posts, tags } = await getCommunityFeed();
  const stats = [
    { label: "プロフィール作成", value: "1 URL" },
    { label: "記事投稿", value: "画像 / 動画" },
    { label: "導入難度", value: "低め" }
  ];

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">FieldCard Social</p>
          <h1>誰でも、自分の肩書きと発信を1ページで持てる。</h1>
          <p className="hero-lead">
            プロフィール、ブログ、リンク集をひとつにまとめたSNSです。アカウントを作ると、
            自分専用の公開ページと投稿管理画面をすぐ使えます。
          </p>
          <div className="hero-actions">
            <Link href="/auth" className="button button-primary">
              無料ではじめる
            </Link>
            <Link href="/dashboard" className="button button-secondary">
              ダッシュボードへ
            </Link>
          </div>
        </div>

        <div className="hero-panel surface">
          <p className="panel-label">できること</p>
          <ul className="check-list">
            <li>プロフィールページを公開</li>
            <li>ブログ記事を投稿</li>
            <li>フォロー、いいね、コメントで反応</li>
            <li>SNS やポートフォリオへのリンク集を掲載</li>
            <li>タグと検索で新しい人を見つける</li>
          </ul>
          <div className="stats-grid">
            {stats.map((item) => (
              <div key={item.label} className="stat-tile">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <article className="surface feature-card">
          <p className="eyebrow">For individuals</p>
          <h2>ポートフォリオより軽く、SNSより整理されている。</h2>
          <p>フリーランス、研究者、学生、制作者が自分の現在地を1ページで伝えられます。</p>
        </article>
        <article className="surface feature-card">
          <p className="eyebrow">For sharing</p>
          <h2>URLひとつで自己紹介が終わる。</h2>
          <p>プロフィール、最近の投稿、外部リンクをまとめて見せられるので、名刺交換の代わりに使えます。</p>
        </article>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <p className="eyebrow">Profiles</p>
          <h2>最近のユーザー</h2>
          <p>プロフィールは `/@username` で公開されます。</p>
          <Link href="/explore" className="button button-secondary">
            全体を見る
          </Link>
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
                <p>{profile.headline || "プロフィールを準備中です。"}</p>
                <div className="inline-meta">
                  <span>{profile.stats.follower_count} followers</span>
                  <span>{profile.stats.public_post_count} posts</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="surface empty-state">
              <h3>まだプロフィールがありません</h3>
              <p>最初のアカウントを作成すると、ここに表示されます。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <p className="eyebrow">Posts</p>
          <h2>公開された記事</h2>
          <p>公開設定にした記事はトップにも並びます。</p>
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
            <div className="surface empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>記事を公開すると、この一覧に表示されます。</p>
            </div>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="section-copy">
          <p className="eyebrow">Discovery</p>
          <h2>注目タグ</h2>
          <p>人気のタグから、いま動いているテーマを辿れます。</p>
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

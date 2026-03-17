import Link from "next/link";
import { AvatarMark } from "@/components/avatar-mark";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { sanitizeExternalUrl } from "@/lib/url";

export function SignatureProfilePage({ profile, posts }) {
  const featuredPosts = posts.slice(0, 3);
  const recentPosts = posts.slice(0, 4);
  const links = [
    { label: "Website", href: sanitizeExternalUrl(profile.website_url) },
    { label: "X", href: sanitizeExternalUrl(profile.x_url) },
    { label: "GitHub", href: sanitizeExternalUrl(profile.github_url) },
    { label: "note", href: sanitizeExternalUrl(profile.note_url) }
  ].filter((item) => item.href);

  return (
    <main className="signature-page">
      <div className="signature-noise" aria-hidden="true" />

      <section className="signature-hero">
        <div className="signature-hero-copy">
          <p className="signature-kicker">Personal Field</p>
          <AvatarMark profile={profile} size="lg" />
          <h1>{profile.display_name || profile.username}</h1>
          <p className="signature-lead">{profile.headline || "肩書きはまだ未設定です。"}</p>
          <p className="signature-body">{profile.bio || "このページはまだ準備中です。"}</p>

          <div className="hero-actions">
            <a className="button button-primary" href="#signature-posts">
              投稿を見る
            </a>
            <Link className="button button-secondary" href="/dashboard">
              管理画面
            </Link>
          </div>
        </div>

        <aside className="signature-panel">
          <p className="eyebrow">Current Coordinates</p>
          <dl className="signature-coordinates">
            <div>
              <dt>Affiliation</dt>
              <dd>{profile.affiliation || "Not set"}</dd>
            </div>
            <div>
              <dt>Handle</dt>
              <dd>@{profile.username}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{profile.focus_area || "Not set"}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <ProfileSocialActions
        profileId={profile.id}
        username={profile.username}
        initialStats={profile.stats || { follower_count: 0, following_count: 0, public_post_count: posts.length }}
      />
      <ReportAction targetProfileId={profile.id} label="プロフィールを通報" />

      <section className="signature-section">
        <div className="signature-section-head">
          <p className="eyebrow">About</p>
          <h2>概要</h2>
        </div>
        <div className="signature-about-grid">
          <article className="signature-info-card">
            <p className="eyebrow">Base</p>
            <h3>{profile.location || "Location not set"}</h3>
            <p>{profile.focus_area || "関心領域を追加するとここに表示されます。"}</p>
          </article>
          <article className="signature-info-card">
            <p className="eyebrow">Open to</p>
            <h3>相談歓迎</h3>
            <p>{profile.open_to || "募集内容や受けたい相談を書くと、ここに表示されます。"}</p>
          </article>
        </div>
      </section>

      <section className="signature-section">
        <div className="signature-section-head">
          <p className="eyebrow">Works</p>
          <h2>注目記事</h2>
        </div>
        <div className="signature-post-grid">
          {featuredPosts.length ? (
            featuredPosts.map((post) => (
              <Link key={post.id} href={`/@${profile.username}/${post.slug}`} className="signature-post-card">
                <div className="post-card-head">
                  <span>{formatDate(post.published_at || post.updated_at)}</span>
                  <span>{post.stats.like_count} likes</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.excerpt || "本文から紹介文を追加してください。"}</p>
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
              <h3>まだ記事がありません</h3>
              <p>最初の公開記事を追加するとここに出ます。</p>
            </div>
          )}
        </div>
      </section>

      {links.length ? (
        <section className="signature-section">
          <div className="signature-section-head">
            <p className="eyebrow">Links</p>
            <h2>外部リンク</h2>
          </div>
          <div className="link-list">
            {links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-secondary">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="signature-section" id="signature-posts">
        <div className="signature-section-head">
          <p className="eyebrow">Signals</p>
          <h2>最近の更新</h2>
        </div>

        <div className="signature-signals">
          {recentPosts.length ? (
            recentPosts.map((post) => (
              <Link key={post.id} href={`/@${profile.username}/${post.slug}`} className="signature-signal-line">
                <span className="signature-signal-date">{formatDate(post.published_at || post.updated_at)}</span>
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.excerpt || "本文から紹介文を追加してください。"}</p>
                  {post.tags.length ? (
                    <div className="tag-row">
                      {post.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))
          ) : (
            <div className="signature-post-card empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>ここには最新の公開更新が並びます。</p>
            </div>
          )}
        </div>
      </section>

      <section className="signature-section">
        <div className="signature-section-head">
          <p className="eyebrow">Contact</p>
          <h2>連絡</h2>
        </div>
        <div className="signature-contact-card">
          <p>{profile.open_to || "相談歓迎の内容を入れると、ここが連絡導線になります。"}</p>
          <div className="link-list">
            {links.length ? (
              links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-primary">
                  {link.label}
                </a>
              ))
            ) : (
              <Link href="/dashboard" className="button button-secondary">
                リンクを設定する
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
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

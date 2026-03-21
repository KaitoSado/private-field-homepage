import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarMark } from "@/components/avatar-mark";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { SignatureProfilePage } from "@/components/signature-profile-page";
import { BRAND_NAME } from "@/lib/brand";
import { getProfileByUsername, getPublishedPostsByUsername } from "@/lib/data";
import { sanitizeExternalUrl } from "@/lib/url";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const profile = username ? await getProfileByUsername(username) : null;

  if (!profile) {
    return { title: `ユーザーが見つかりません | ${BRAND_NAME}` };
  }

  const title = `${profile.display_name || profile.username}`;
  const description = profile.bio || profile.headline || `${BRAND_NAME} profile`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: ["/opengraph-image"]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"]
    }
  };
}

export default async function ProfilePage({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const profile = username ? await getProfileByUsername(username) : null;

  if (!profile) {
    notFound();
  }

  const posts = await getPublishedPostsByUsername(profile.username);

  if (profile.page_theme === "signature") {
    return <SignatureProfilePage profile={profile} posts={posts} />;
  }

  const links = [
    { label: "Website", href: sanitizeExternalUrl(profile.website_url) },
    { label: "X", href: sanitizeExternalUrl(profile.x_url) },
    { label: "GitHub", href: sanitizeExternalUrl(profile.github_url) },
    { label: "note", href: sanitizeExternalUrl(profile.note_url) }
  ].filter((item) => item.href);

  return (
    <main className="shell narrow-shell">
      <Link href="/" className="back-link">
        ← ホームへ戻る
      </Link>

      <section className="surface profile-hero">
        <AvatarMark profile={profile} size="lg" />
        <div className="profile-hero-copy">
          <p className="eyebrow">@{profile.username}</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p className="headline">{profile.headline || "肩書きはまだ未設定です。"}</p>
          <p>{profile.bio || "自己紹介はまだありません。"}</p>
          <div className="profile-meta">
            {profile.location ? <span>{profile.location}</span> : <span>Location not set</span>}
          </div>
          {links.length ? (
            <div className="link-list">
              {links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-secondary">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <ProfileSocialActions
        profileId={profile.id}
        username={profile.username}
        initialStats={profile.stats || { follower_count: 0, following_count: 0, public_post_count: posts.length }}
      />
      <ReportAction targetProfileId={profile.id} label="プロフィールを通報" />

      <section className="section-grid single-column">
        <div className="section-copy">
          <p className="eyebrow">Posts</p>
          <h2>公開記事</h2>
        </div>

        <div className="stack-list">
          {posts.length ? (
            posts.map((post) => (
              <Link key={post.id} href={`/@${profile.username}/${post.slug}`} className="surface post-card">
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
            <div className="surface empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>このユーザーはまだ公開記事を投稿していません。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function normalizeHandle(handle) {
  if (!handle) return null;
  const decoded = decodeURIComponent(handle).trim();
  const normalized = decoded.startsWith("@") ? decoded.slice(1) : decoded;
  return normalized || null;
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

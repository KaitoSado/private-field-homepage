import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEngagementPanel } from "@/components/post-engagement-panel";
import { PostMediaGallery } from "@/components/post-media-gallery";
import { ReportAction } from "@/components/report-action";
import { BRAND_NAME } from "@/lib/brand";
import { getCommentsByPostId, getPostByUsernameAndSlug } from "@/lib/data";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const username = normalizeHandle(params.handle);
  const post = username ? await getPostByUsernameAndSlug(username, params.slug) : null;

  if (!post) {
    return { title: `記事が見つかりません | ${BRAND_NAME}` };
  }

  const title = `${post.title} | ${post.profiles.display_name || post.profiles.username}`;
  const description = post.excerpt || `${BRAND_NAME} post`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
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

export default async function PostPage({ params }) {
  const username = normalizeHandle(params.handle);
  const post = username ? await getPostByUsernameAndSlug(username, params.slug) : null;

  if (!post) {
    notFound();
  }

  const comments = await getCommentsByPostId(post.id);

  return (
    <main className="shell narrow-shell">
      <Link href={`/@${post.profiles.username}`} className="back-link">
        ← @{post.profiles.username} に戻る
      </Link>

      <article className="surface article-card">
        <div className="post-card-head">
          <span>@{post.profiles.username}</span>
          <span>{formatDate(post.published_at || post.updated_at)}</span>
        </div>
        <h1>{post.title}</h1>
        {post.excerpt ? <p className="headline">{post.excerpt}</p> : null}
        {post.tags.length ? (
          <div className="tag-row">
            {post.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <PostMediaGallery mediaItems={post.media_items} coverImageUrl={post.cover_image_url} title={post.title} />
        <div className="article-body">
          {renderParagraphs(post.body)}
        </div>
      </article>

      <PostEngagementPanel
        postId={post.id}
        authorId={post.author_id}
        allowComments={post.allow_comments}
        initialStats={post.stats || { like_count: 0, repost_count: 0, comment_count: comments.length }}
        initialComments={comments}
      />
      <ReportAction targetPostId={post.id} label="投稿を通報" />
    </main>
  );
}

function renderParagraphs(body) {
  if (!body) {
    return <p>本文はまだありません。</p>;
  }

  return body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>);
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function normalizeHandle(handle) {
  if (!handle?.startsWith("@")) return null;
  return handle.slice(1);
}

import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";
import { SpecialArticleGate } from "@/components/special-article-gate";
import { getSpecialArticleByUsernameAndId } from "@/lib/data";
import {
  getSpecialArticleAccessCookieName,
  requiresSpecialArticlePassword
} from "@/lib/special-article-access";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const article = username ? await getSpecialArticleByUsernameAndId(username, resolvedParams.id) : null;

  if (!article) {
    return { title: `特別記事が見つかりません | ${BRAND_NAME}` };
  }

  return {
    title: `${article.title} | 特別記事 | ${BRAND_NAME}`,
    description: article.excerpt || article.body.slice(0, 140)
  };
}

export default async function ProfileSpecialArticleDetailPage({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const article = username ? await getSpecialArticleByUsernameAndId(username, resolvedParams.id) : null;

  if (!article) {
    notFound();
  }

  const cookieStore = await cookies();
  const unlocked = cookieStore.get(getSpecialArticleAccessCookieName(article.id))?.value === "granted";
  const needsPassword = requiresSpecialArticlePassword(article);

  return (
    <main className="shell narrow-shell">
      <article className="surface article-card special-article-detail">
        <div className="post-card-head">
          <span>{formatDate(article.updated_at || article.created_at)}</span>
          <span>{article.price_label || "Long-form"}</span>
        </div>
        <h1>{article.title}</h1>
        {article.excerpt ? <p className="hero-lead">{article.excerpt}</p> : null}
        <div className="inline-meta">
          <span>@{article.profiles?.username || article.profiles?.display_name || "author"}</span>
        </div>
        {needsPassword && !unlocked ? <SpecialArticleGate articleId={article.id} /> : <div className="special-article-body">{article.body}</div>}
        <div className="hero-actions">
          <Link href={`/@${article.profiles?.username || username}/special-articles`} className="button button-secondary">
            特別記事一覧へ戻る
          </Link>
        </div>
      </article>
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
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

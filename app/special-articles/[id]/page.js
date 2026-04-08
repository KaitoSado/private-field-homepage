import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SpecialArticleGate } from "@/components/special-article-gate";
import { ExpandableArticleBody } from "@/components/expandable-article-body";
import { getSpecialArticleById } from "@/lib/data";
import {
  getSpecialArticleAccessCookieName,
  requiresSpecialArticlePassword
} from "@/lib/special-article-access";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const article = await getSpecialArticleById(id);

  if (!article) {
    return {
      title: "特別記事が見つかりません | New Commune"
    };
  }

  return {
    title: `${article.title} | 特別記事 | New Commune`,
    description: article.excerpt || article.body.slice(0, 140)
  };
}

export default async function SpecialArticleDetailPage({ params }) {
  const { id } = await params;
  const article = await getSpecialArticleById(id);

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
        {needsPassword && !unlocked ? (
          <SpecialArticleGate articleId={article.id} />
        ) : (
          <ExpandableArticleBody body={article.body} className="article-body special-article-body" />
        )}
        <div className="hero-actions">
          <Link href="/special-articles" className="button button-secondary">
            特別記事一覧へ戻る
          </Link>
        </div>
      </article>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

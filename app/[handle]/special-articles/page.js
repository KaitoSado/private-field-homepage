import { notFound } from "next/navigation";
import { SpecialArticlesPanel } from "@/components/special-articles-panel";
import { BRAND_NAME } from "@/lib/brand";
import { getProfileByUsername, getSpecialArticlesByUsername } from "@/lib/data";

export const revalidate = 0;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const profile = username ? await getProfileByUsername(username) : null;

  if (!profile) {
    return { title: `ユーザーが見つかりません | ${BRAND_NAME}` };
  }

  return {
    title: `${profile.display_name || profile.username} の特別記事 | ${BRAND_NAME}`,
    description: `${profile.display_name || profile.username} の特別記事一覧`
  };
}

export default async function ProfileSpecialArticlesPage({ params }) {
  const resolvedParams = await params;
  const username = normalizeHandle(resolvedParams.handle);
  const profile = username ? await getProfileByUsername(username) : null;

  if (!profile) {
    notFound();
  }

  const items = await getSpecialArticlesByUsername(profile.username);

  return (
    <main className="shell">
      <SpecialArticlesPanel
        initialItems={items}
        ownerProfile={profile}
        backHref={`/@${profile.username}`}
        detailHrefBase={`/@${profile.username}/special-articles`}
      />
    </main>
  );
}

function normalizeHandle(handle) {
  if (!handle) return null;
  const decoded = decodeURIComponent(handle).trim();
  const normalized = decoded.startsWith("@") ? decoded.slice(1) : decoded;
  return normalized || null;
}

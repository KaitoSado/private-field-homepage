import { notFound } from "next/navigation";
import { PublicProfilePage } from "@/components/public-profile-page";
import { SignatureProfilePage } from "@/components/signature-profile-page";
import { BRAND_NAME } from "@/lib/brand";
import { getProfileByUsername, getPublishedPostsByUsername } from "@/lib/data";

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

  return <PublicProfilePage profile={profile} posts={posts} />;
}

function normalizeHandle(handle) {
  if (!handle) return null;
  const decoded = decodeURIComponent(handle).trim();
  const normalized = decoded.startsWith("@") ? decoded.slice(1) : decoded;
  return normalized || null;
}

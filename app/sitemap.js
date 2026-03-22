import { getSiteUrl } from "@/lib/brand";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export default async function sitemap() {
  const baseUrl = getSiteUrl();
  const staticRoutes = [
    "/",
    "/explore",
    "/auth",
    "/notifications",
    "/settings",
    "/contact",
    "/privacy",
    "/terms",
    "/retention",
    "/changelog"
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date()
  }));

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return staticRoutes;
  }

  const [{ data: profiles }, { data: posts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, updated_at")
      .eq("account_status", "active")
      .eq("discoverable", true)
      .not("username", "is", null)
      .limit(200),
    supabase
      .from("posts")
      .select("slug, updated_at, profiles!inner(username)")
      .eq("published", true)
      .eq("visibility", "public")
      .limit(500)
  ]);

  return [
    ...staticRoutes,
    ...(profiles || [])
      .filter((profile) => `${profile.username || ""}`.trim())
      .map((profile) => ({
        url: `${baseUrl}/@${profile.username}`,
        lastModified: profile.updated_at || new Date()
      })),
    ...(posts || [])
      .filter((post) => `${post.profiles?.username || ""}`.trim())
      .map((post) => ({
        url: `${baseUrl}/@${post.profiles.username}/${post.slug}`,
        lastModified: post.updated_at || new Date()
      }))
  ];
}

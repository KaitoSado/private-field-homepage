import { getSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_PROFILE_STATS = {
  follower_count: 0,
  following_count: 0,
  public_post_count: 0
};

const DEFAULT_POST_STATS = {
  like_count: 0,
  repost_count: 0,
  comment_count: 0
};

export async function getCommunityFeed() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { profiles: [], posts: [], tags: [] };
  }

  const [{ data: profileRows }, { data: postRows }, { data: tagRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, headline, avatar_url, updated_at, account_status, discoverable")
      .not("username", "is", null)
      .eq("account_status", "active")
      .eq("discoverable", true)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("posts")
      .select(
        "id, slug, title, excerpt, published, visibility, scheduled_for, published_at, updated_at, tags, cover_image_url, profiles!posts_author_id_fkey(id, username, display_name, avatar_url, account_status, discoverable)"
      )
      .eq("published", true)
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(20),
    supabase.from("tag_stats").select("tag, use_count").order("use_count", { ascending: false }).limit(8)
  ]);

  const profiles = await attachProfileStats(supabase, profileRows || []);
  const posts = await attachPostStats(supabase, filterDiscoverableFeedPosts(postRows || [], ["public"]).slice(0, 8));

  return {
    profiles: profiles.filter(hasPublicUsername).slice(0, 6),
    posts,
    tags: tagRows || []
  };
}

export async function getExploreData({ query = "", sort = "newest" } = {}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return { profiles: [], posts: [], recommendations: [], tags: [], query, sort };
  }

  const trimmedQuery = query.trim();
  const profileQuery = supabase
    .from("profiles")
    .select("id, username, display_name, headline, location, avatar_url, updated_at, account_status, discoverable")
    .not("username", "is", null)
    .eq("account_status", "active")
    .eq("discoverable", true)
    .limit(60);

  if (trimmedQuery) {
    profileQuery.or(
      `username.ilike.%${escapeLike(trimmedQuery)}%,display_name.ilike.%${escapeLike(trimmedQuery)}%,headline.ilike.%${escapeLike(trimmedQuery)}%`
    );
  } else {
    profileQuery.order("updated_at", { ascending: false });
  }

  const postQuery = supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, published, visibility, scheduled_for, published_at, updated_at, tags, cover_image_url, profiles!posts_author_id_fkey(id, username, display_name, avatar_url, account_status, discoverable)"
    )
    .eq("published", true)
    .eq("visibility", "public")
    .limit(80);

  if (trimmedQuery) {
    postQuery.or(`title.ilike.%${escapeLike(trimmedQuery)}%,excerpt.ilike.%${escapeLike(trimmedQuery)}%`);
  } else {
    postQuery.order("published_at", { ascending: false });
  }

  const [{ data: rawProfiles }, { data: rawPosts }, { data: rawTags }] = await Promise.all([
    profileQuery,
    postQuery,
    supabase.from("tag_stats").select("tag, use_count").order("use_count", { ascending: false }).limit(16)
  ]);

  const profiles = await attachProfileStats(supabase, rawProfiles || []);
  const posts = await attachPostStats(supabase, filterDiscoverableFeedPosts(rawPosts || [], ["public"]));
  const publicProfiles = profiles.filter(hasPublicUsername);

  const sortedProfiles =
    sort === "popular"
      ? [...publicProfiles].sort((left, right) => {
          const rightScore = right.stats.follower_count * 3 + right.stats.public_post_count;
          const leftScore = left.stats.follower_count * 3 + left.stats.public_post_count;
          return rightScore - leftScore;
        })
      : [...publicProfiles].sort((left, right) => compareDates(right.updated_at, left.updated_at));

  const sortedPosts =
    sort === "popular"
      ? [...posts].sort((left, right) => engagementScore(right.stats) - engagementScore(left.stats))
      : [...posts].sort((left, right) => compareDates(right.published_at || right.updated_at, left.published_at || left.updated_at));

  const recommendations = [...publicProfiles]
    .sort((left, right) => {
      const rightScore = right.stats.follower_count * 2 + right.stats.public_post_count;
      const leftScore = left.stats.follower_count * 2 + left.stats.public_post_count;
      return rightScore - leftScore;
    })
    .slice(0, 4);

  const tags = (rawTags || [])
    .filter((tag) => (!trimmedQuery ? true : tag.tag.includes(trimmedQuery.toLowerCase())))
    .slice(0, 10);

  return {
    profiles: sortedProfiles.slice(0, 24),
    posts: sortedPosts.slice(0, 24),
    recommendations,
    tags,
    query: trimmedQuery,
    sort
  };
}

export async function getProfileByUsername(username) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("account_status", "active")
    .maybeSingle();
  if (!data) return null;

  const [profile] = await attachProfileStats(supabase, [data]);
  return profile || null;
}

export async function getPublishedPostsByUsername(username) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const profile = await getProfileByUsername(username);
  if (!profile) return [];

  const { data } = await supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, body, published, tags, media_items, cover_image_url, published_at, updated_at, visibility, scheduled_for, allow_comments"
    )
    .eq("author_id", profile.id)
    .eq("published", true)
    .eq("visibility", "public")
    .order("published_at", { ascending: false });

  return attachPostStats(supabase, filterVisiblePosts(data || [], ["public"]));
}

export async function getPostByUsernameAndSlug(username, slug) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const profile = await getProfileByUsername(username);
  if (!profile) return null;

  const { data } = await supabase
    .from("posts")
    .select(
      "id, slug, title, excerpt, body, published, tags, media_items, cover_image_url, allow_comments, published_at, updated_at, visibility, scheduled_for, author_id, profiles!posts_author_id_fkey(id, username, display_name, avatar_url, account_status, discoverable)"
    )
    .eq("author_id", profile.id)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data || !isVisiblePost(data, ["public", "unlisted"])) {
    return null;
  }

  const [post] = await attachPostStats(supabase, [data]);
  return post || null;
}

export async function getCommentsByPostId(postId) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("post_comments")
    .select("id, body, created_at, updated_at, profiles!inner(id, username, display_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  return data || [];
}

async function attachProfileStats(supabase, profiles) {
  if (!profiles.length) return [];

  const ids = profiles.map((profile) => profile.id).filter(Boolean);
  const { data } = await supabase.from("profile_stats").select("*").in("profile_id", ids);
  const statsMap = new Map((data || []).map((row) => [row.profile_id, row]));

  return profiles.map((profile) => ({
    ...profile,
    stats: statsMap.get(profile.id) || DEFAULT_PROFILE_STATS
  }));
}

async function attachPostStats(supabase, posts) {
  if (!posts.length) return [];

  const ids = posts.map((post) => post.id).filter(Boolean);
  const { data } = await supabase.from("post_stats").select("*").in("post_id", ids);
  const statsMap = new Map((data || []).map((row) => [row.post_id, row]));

  return posts.map((post) => ({
    ...post,
    tags: normalizeTags(post.tags),
    media_items: normalizeMediaItems(post.media_items),
    stats: statsMap.get(post.id) || DEFAULT_POST_STATS
  }));
}

function filterVisiblePosts(posts, allowedVisibilities) {
  return posts.filter((post) => isVisiblePost(post, allowedVisibilities));
}

function filterDiscoverableFeedPosts(posts, allowedVisibilities) {
  return posts.filter(
    (post) => isVisiblePost(post, allowedVisibilities) && (!post.profiles || isDiscoverableAuthor(post.profiles))
  );
}

function isVisiblePost(post, allowedVisibilities) {
  if (!post?.published) return false;
  if (!allowedVisibilities.includes(post.visibility || "public")) return false;
  if (post.profiles && !isVisibleAuthor(post.profiles)) return false;
  if (!post.scheduled_for) return true;
  return new Date(post.scheduled_for).getTime() <= Date.now();
}

function isVisibleAuthor(profile) {
  return profile.account_status === "active";
}

function isDiscoverableAuthor(profile) {
  return isVisibleAuthor(profile) && profile.discoverable !== false && hasPublicUsername(profile);
}

function hasPublicUsername(profile) {
  const username = `${profile?.username || ""}`.trim();
  return Boolean(username);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => `${tag}`.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeMediaItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      kind: item?.kind === "video" ? "video" : "image",
      url: `${item?.url || ""}`.trim(),
      alt: `${item?.alt || ""}`.trim()
    }))
    .filter((item) => item.url);
}

function escapeLike(value) {
  return value.replace(/[%_,]/g, "");
}

function compareDates(left, right) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

function engagementScore(stats) {
  return stats.like_count + stats.comment_count * 2 + stats.repost_count * 3;
}

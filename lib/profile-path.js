export function normalizeUsername(value) {
  return `${value || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function buildUsernameFallback(email) {
  if (!email) return "";
  return normalizeUsername(email.split("@")[0] || "user");
}

export function resolveUsername(value, email = "", userId = "") {
  const normalized = normalizeUsername(value || "");
  if (normalized) return normalized;

  const fallbackFromEmail = buildUsernameFallback(email || "");
  if (fallbackFromEmail) return fallbackFromEmail;

  const suffix = `${userId || ""}`.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase();
  return suffix ? `user-${suffix}` : "user";
}

export function buildPublicProfilePath(username) {
  const resolved = normalizeUsername(username);
  return resolved ? `/@${resolved}` : "/settings";
}

export async function fetchOwnProfileMeta(supabase, user) {
  if (!supabase || !user) return "/auth";

  const { data } = await supabase.from("profiles").select("username, role").eq("id", user.id).maybeSingle();
  const username = resolveUsername(data?.username, user.email || "", user.id);

  return {
    path: buildPublicProfilePath(username),
    role: data?.role || "user"
  };
}

export async function fetchOwnProfilePath(supabase, user) {
  const meta = await fetchOwnProfileMeta(supabase, user);
  return typeof meta === "string" ? meta : meta.path;
}

export const BRAND_NAME = "Commune";
export const BRAND_DESCRIPTION = "Public profiles, posts, and shared campus apps in one place.";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

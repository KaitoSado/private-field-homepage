export const BRAND_NAME = "FieldCard Social";
export const BRAND_TAGLINE = "profile + blog + social card";
export const BRAND_DESCRIPTION =
  "Create a public profile, blog, and social card in one place with discovery, moderation, and creator tools.";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

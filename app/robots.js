import { getSiteUrl } from "@/lib/brand";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/me", "/settings", "/ops"]
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`
  };
}

import { getSiteUrl } from "@/lib/brand";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/settings", "/ops"]
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`
  };
}

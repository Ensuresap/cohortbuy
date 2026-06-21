import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the authenticated app out of the index; let marketing pages in.
      disallow: ["/dashboard", "/account", "/admin", "/requests/", "/onboarding", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

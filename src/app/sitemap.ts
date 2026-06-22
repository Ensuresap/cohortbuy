import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { listPublicGuides } from "@/core/guides/services/guideService";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/vendors", "/guides"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let guideRoutes: MetadataRoute.Sitemap = [];
  try {
    const guides = await listPublicGuides({ db: await createClient(), actor: undefined });
    guideRoutes = guides.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    /* sitemap should still render the static routes if the DB is unavailable */
  }

  return [...staticRoutes, ...guideRoutes];
}

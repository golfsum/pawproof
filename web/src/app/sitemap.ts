import type { MetadataRoute } from "next";
import { SEO_PAGE_SLUGS } from "@/lib/seo-pages";
import { SITE_URL } from "@/lib/site";

// Public, indexable routes. Admin/dashboard/api/auth are intentionally left
// out (also blocked in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = [
    "",
    "/dog-vaccine-records",
    "/cat-vaccine-records",
    "/pet-vaccine-reminders",
    "/pet-medical-records",
    "/multiple-pets",
    "/pet-emergency-card",
    "/contact",
    "/privacy",
    "/terms",
    ...SEO_PAGE_SLUGS.map((slug) => `/${slug}`),
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}

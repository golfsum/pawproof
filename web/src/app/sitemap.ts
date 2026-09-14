import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blog";
import { SEO_PAGE_SLUGS } from "@/lib/seo-pages";
import { SITE_URL } from "@/lib/site";

// Public, indexable routes. Admin/dashboard/api/auth and Lost & Found search
// filters are intentionally omitted. Individual report pages are added only
// once their publication/indexing consent pipeline is enabled.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const posts = getBlogPosts();
  const paths = [
    "",
    "/blog",
    "/lost-and-found",
    "/lost-and-found/how-it-works",
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
  const staticEntries: MetadataRoute.Sitemap = paths.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/lost-and-found" ? ("weekly" as const) : ("monthly" as const),
    priority: p === "" ? 1 : p === "/lost-and-found" ? 0.9 : 0.7,
  }));
  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(`${post.updatedAt ?? post.publishedAt}T12:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));
  return staticEntries.concat(postEntries);
}

import type { MetadataRoute } from "next";
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
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}

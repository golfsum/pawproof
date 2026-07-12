#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node syndicate.mjs <web/content/blog/article.md>");
  process.exit(2);
}

const source = fs.readFileSync(file, "utf8");
const metadata = source.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
const value = (key) => metadata.match(new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, "m"))?.[1]?.trim();
const slug = path.basename(file, ".md");
const title = value("title");
const description = value("description");
const publishedAt = value("publishedAt");
if (!title || !description || !publishedAt) throw new Error("Article is missing title, description, or publishedAt.");

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pawproof.app").replace(/\/$/, "");
const payload = {
  event: "pawproof.article.published",
  title,
  description,
  publishedAt,
  url: `${siteUrl}/blog/${slug}`,
  rss: `${siteUrl}/feed.xml`,
  social: {
    short: `${title}\n\n${description}\n\n${siteUrl}/blog/${slug}`,
    googleBusinessProfile: `${description}\n\nRead the full PawProof guide: ${siteUrl}/blog/${slug}`,
  },
};

const webhook = process.env.SEO_SYNDICATION_WEBHOOK_URL;
if (webhook) {
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Syndication webhook failed with HTTP ${response.status}.`);
  console.log(`Sent syndication payload for ${slug}.`);
} else {
  const outputDir = path.resolve(".seo-findings", "syndication");
  fs.mkdirSync(outputDir, { recursive: true });
  const output = path.join(outputDir, `${slug}.json`);
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`SEO_SYNDICATION_WEBHOOK_URL is unset; wrote preview to ${output}.`);
}

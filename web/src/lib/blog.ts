import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const frontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).max(180),
  publishedAt: z.string().date(),
  updatedAt: z.string().date().optional(),
  author: z.string().default("PawProof Team"),
  targetKeyword: z.string().min(1),
  relatedLinks: z.array(z.string().startsWith("/")).default([]),
  draft: z.boolean().default(false),
});

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  targetKeyword: string;
  relatedLinks: string[];
  content: string;
}

function readPost(fileName: string): BlogPost | null {
  const source = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf8");
  const parsed = matter(source);
  const metadata = frontmatterSchema.parse(parsed.data);
  if (metadata.draft) return null;

  return {
    slug: fileName.replace(/\.md$/, ""),
    ...metadata,
    content: parsed.content.trim(),
  };
}

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map(readPost)
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}

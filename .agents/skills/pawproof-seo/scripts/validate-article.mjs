#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node validate-article.mjs <web/content/blog/article.md>");
  process.exit(2);
}

const source = fs.readFileSync(file, "utf8");
const normalized = file.replaceAll("\\", "/");
const errors = [];
const warnings = [];
const frontmatterMatch = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

if (source.includes("\u2014")) {
  errors.push("Replace every Unicode em dash (U+2014) with punctuation that matches the sentence.");
}
if (!normalized.includes("/web/content/blog/") && !normalized.startsWith("web/content/blog/")) {
  errors.push("Article must live in web/content/blog.");
}
if (!frontmatterMatch) {
  errors.push("Missing YAML frontmatter.");
} else {
  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];
  for (const key of ["title", "description", "publishedAt", "author", "targetKeyword", "relatedLinks"]) {
    if (!new RegExp(`^${key}:`, "m").test(frontmatter)) errors.push(`Missing frontmatter field: ${key}.`);
  }
  const description = frontmatter.match(/^description:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? "";
  if (description.length > 160) errors.push(`Description is ${description.length} characters; keep it at 160 or fewer.`);
  if (/^#\s+/m.test(body)) errors.push("Body must not contain an H1; the title supplies it.");
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  if (h2s.length < 2) errors.push("Add at least two H2 sections.");
  if (!h2s.some((heading) => heading.toLowerCase() === "frequently asked questions")) {
    errors.push('Add an H2 named "Frequently asked questions".');
  }
  const faqQuestions = [...body.matchAll(/^###\s+(.+\?)\s*$/gm)];
  if (faqQuestions.length < 2) errors.push("Add at least two question-shaped H3 FAQ entries.");
  const internalLinks = new Set([...body.matchAll(/\]\((\/[a-z0-9][^)#?]*)\)/gi)].map((match) => match[1]));
  if (internalLinks.size < 2) errors.push("Add at least two distinct contextual internal links.");
  const words = body.replace(/[`*_>#\[\]()!-]/g, " ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 500) warnings.push(`Article is only ${words} words; confirm the query is fully answered.`);
  if (words > 2200) warnings.push(`Article is ${words} words; trim sections that do not serve the intent.`);
  if (/\bguarantee(?:d|s)?\b|\bnumber one\b|\bbest app\b/i.test(body)) warnings.push("Review unsupported promotional superlatives.");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`Validated ${path.basename(file)} with ${warnings.length} warning(s).`);

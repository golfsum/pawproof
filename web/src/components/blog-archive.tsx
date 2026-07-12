"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface BlogArchivePost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  targetKeyword: string;
}

const PAGE_SIZE = 6;

export function BlogArchive({ posts }: { posts: BlogArchivePost[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPosts = useMemo(
    () =>
      posts.filter((post) =>
        [post.title, post.description, post.targetKeyword].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
      ),
    [normalizedQuery, posts],
  );
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagePosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="mt-12" aria-labelledby="guide-archive-heading">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="guide-archive-heading" className="text-xl font-bold tracking-tight">
            Browse pet care guides
          </h2>
          <p className="mt-1 text-sm text-muted">
            Search by task or topic. Six guides appear at a time so the archive stays easy to scan.
          </p>
        </div>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Search pet care guides</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search guides"
            className="h-11 w-full rounded-xl border border-border-strong bg-background px-4 text-sm outline-none transition placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary-soft"
          />
        </label>
      </div>

      {pagePosts.length ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {pagePosts.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <time className="text-sm text-faint" dateTime={post.publishedAt}>
                {new Date(`${post.publishedAt}T12:00:00Z`).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time>
              <h3 className="mt-3 text-2xl font-bold tracking-tight">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                  {post.title}
                </Link>
              </h3>
              <p className="mt-3 leading-7 text-muted">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex font-semibold text-primary hover:text-primary-dark">
                Read guide <span aria-hidden="true">&nbsp;→</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-muted">
          No guides match that search yet. Try a broader phrase such as records, medications, or emergency.
        </div>
      )}

      {filteredPosts.length > PAGE_SIZE ? (
        <nav className="mt-8 flex items-center justify-between border-t border-border pt-6" aria-label="Blog archive pages">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}

      <noscript>
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <a href={`/blog/${post.slug}`}>{post.title}</a>
            </li>
          ))}
        </ul>
      </noscript>
    </section>
  );
}

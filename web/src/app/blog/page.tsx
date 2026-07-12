import type { Metadata } from "next";
import { BlogArchive } from "@/components/blog-archive";
import { getBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Pet Care Guides | PawProof",
  description: "Practical guides for organizing pet health records, vaccines, medications, reminders, and care handoffs.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getBlogPosts();

  return (
    <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-16">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">PawProof guides</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Clearer pet care starts with better records</h1>
        <p className="mt-5 text-lg leading-8 text-muted">
          Practical, plain-language help for keeping vaccines, medications, documents, and care routines organized.
        </p>
      </div>

      {posts.length ? (
        <BlogArchive
          posts={posts.map(({ slug, title, description, publishedAt, targetKeyword }) => ({
            slug,
            title,
            description,
            publishedAt,
            targetKeyword,
          }))}
        />
      ) : (
        <div className="mt-12 rounded-2xl border border-border bg-surface p-8 text-muted">
          The first PawProof guide is being prepared. Check back soon.
        </div>
      )}
    </main>
  );
}

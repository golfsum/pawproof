import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getBlogPost, getBlogPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | PawProof`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "PawProof", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Link href="/blog" className="text-sm font-semibold text-primary hover:text-primary-dark">← All guides</Link>
      <article className="mt-8">
        <header className="border-b border-border pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pet care guide</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-xl leading-8 text-muted">{post.description}</p>
          <div className="mt-5 text-sm text-faint">
            By {post.author} · <time dateTime={post.publishedAt}>{post.publishedAt}</time>
          </div>
        </header>

        <div className="prose-pawproof mt-9">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2 className="mb-4 mt-10 text-3xl font-bold tracking-tight">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-3 mt-8 text-2xl font-bold tracking-tight">{children}</h3>,
              p: ({ children }) => <p className="my-4 leading-8 text-muted">{children}</p>,
              ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 text-muted">{children}</ul>,
              ol: ({ children }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-muted">{children}</ol>,
              a: ({ href, children }) => <Link href={href ?? "/"} className="font-medium text-primary underline underline-offset-4">{children}</Link>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}

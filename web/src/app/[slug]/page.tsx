import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { SEO_PAGE_SLUGS, getSeoPage, getSeoPageMetadata } from "@/lib/seo-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  return getSeoPageMetadata(page);
}

export default async function SeoLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  return (
    <LandingPage
      h1={page.h1}
      lede={page.lede}
      intro={page.intro}
      bullets={page.bullets}
      sections={page.sections}
      faqs={page.faqs}
      heroImage={page.heroImage}
      heroAlt={page.heroAlt}
      relatedLinks={page.relatedLinks}
      sourceLinks={page.sourceLinks}
    />
  );
}

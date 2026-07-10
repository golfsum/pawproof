import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { SEO_PAGE_SLUGS, getSeoPage, getSeoPageMetadata } from "@/lib/seo-pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getSeoPage(params.slug);
  if (!page) return {};
  return getSeoPageMetadata(page);
}

export default function SeoLandingPage({ params }: { params: { slug: string } }) {
  const page = getSeoPage(params.slug);
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
    />
  );
}

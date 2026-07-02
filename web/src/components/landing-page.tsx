import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { PhoneFrame } from "@/components/phone-frame";
import { APP_STORE_URL } from "@/lib/site";

// Reusable SEO landing page. Each marketing/use-case page passes its own
// keyword-focused copy; the layout, App Store CTA, QR, and structured data
// (SoftwareApplication + FAQ rich results) are shared so every page is
// consistent and search-friendly.

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingSection {
  heading: string;
  body: string;
}

export interface LandingProps {
  h1: string;
  lede: string;
  intro: string;
  bullets?: string[];
  sections?: LandingSection[];
  faqs?: LandingFaq[];
  heroImage?: string;
  heroAlt?: string;
}

function AppStoreCta() {
  return (
    <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row lg:items-start">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download PawProof on the App Store"
        className="transition-transform hover:scale-[1.03]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-14 w-auto" />
      </a>
      <div className="hidden lg:flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/appstore-qr.svg"
          alt="QR code to download PawProof on the App Store"
          className="h-24 w-24 rounded-xl border border-border bg-white p-2"
        />
        <span className="text-sm text-muted max-w-[160px]">
          Scan with your iPhone camera to download.
        </span>
      </div>
    </div>
  );
}

export function LandingPage({
  h1,
  lede,
  intro,
  bullets,
  sections,
  faqs,
  heroImage = "/screenshots/home.png",
  heroAlt = "PawProof home screen showing today's pet care and reminders",
}: LandingProps) {
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PawProof",
    operatingSystem: "iOS",
    applicationCategory: "LifestyleApplication",
    description: lede,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: APP_STORE_URL,
  };
  const faqLd = faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 md:pt-20 md:pb-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                  {h1}
                </h1>
                <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg text-muted">{lede}</p>
                <AppStoreCta />
              </div>
              <div className="relative flex justify-center">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 mx-auto h-72 w-72 self-center rounded-full bg-primary/15 blur-3xl"
                />
                <PhoneFrame src={heroImage} alt={heroAlt} priority className="max-w-[260px] sm:max-w-[300px]" />
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="border-t border-border bg-surface-elevated">
          <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
            <p className="text-lg text-foreground leading-relaxed">{intro}</p>

            {bullets?.length ? (
              <ul className="mt-8 space-y-3">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs">
                      ✓
                    </span>
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {sections?.map((s) => (
              <div key={s.heading} className="mt-10">
                <h2 className="text-2xl font-bold tracking-tight">{s.heading}</h2>
                <p className="mt-3 text-muted leading-relaxed">{s.body}</p>
              </div>
            ))}

            {faqs?.length ? (
              <div className="mt-14">
                <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
                <dl className="mt-6 space-y-6">
                  {faqs.map((f) => (
                    <div key={f.q}>
                      <dt className="font-semibold text-foreground">{f.q}</dt>
                      <dd className="mt-1 text-muted leading-relaxed">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Get every pet organized today</h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">
              Free to start, no account needed to look around. Download PawProof and take
              the paperwork off your plate.
            </p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download PawProof on the App Store"
              className="mt-8 inline-block transition-transform hover:scale-[1.03]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-14 w-auto" />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      {faqLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      ) : null}
    </>
  );
}

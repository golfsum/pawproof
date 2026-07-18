import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { PhoneFrame } from "@/components/phone-frame";
import { APP_STORE_URL } from "@/lib/site";

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingSection {
  heading: string;
  body: string;
}

export interface LandingLink {
  href: string;
  label: string;
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
  relatedLinks?: LandingLink[];
  sourceLinks?: LandingLink[];
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
      <div className="hidden items-center gap-3 lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/appstore-qr.svg"
          alt="QR code to download PawProof on the App Store"
          className="h-24 w-24 rounded-xl border border-border bg-white p-2"
        />
        <span className="max-w-[160px] text-sm text-muted">
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
  relatedLinks,
  sourceLinks,
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
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-24 md:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                  {h1}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-lg text-muted lg:mx-0">{lede}</p>
                <AppStoreCta />
              </div>
              <div className="relative flex justify-center">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 mx-auto h-72 w-72 self-center rounded-full bg-primary/15 blur-3xl"
                />
                <PhoneFrame
                  src={heroImage}
                  alt={heroAlt}
                  priority
                  className="max-w-[260px] sm:max-w-[300px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface-elevated">
          <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
            <p className="text-lg leading-relaxed text-foreground">{intro}</p>

            {bullets?.length ? (
              <ul className="mt-8 space-y-3">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      +
                    </span>
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {sections?.map((s) => (
              <div key={s.heading} className="mt-10">
                <h2 className="text-2xl font-bold tracking-tight">{s.heading}</h2>
                <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}

            {sourceLinks?.length ? (
              <div className="mt-10 rounded-2xl border border-border bg-background px-5 py-5">
                <h2 className="text-xl font-bold tracking-tight">Authoritative vaccine guidance</h2>
                <p className="mt-2 leading-relaxed text-muted">
                  Use current veterinary guidance and your veterinarian&apos;s recommendations for
                  medical decisions. PawProof only organizes the schedule and records you save.
                </p>
                <ul className="mt-4 space-y-2">
                  {sourceLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {faqs?.length ? (
              <div className="mt-14">
                <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
                <dl className="mt-6 space-y-6">
                  {faqs.map((f) => (
                    <div key={f.q}>
                      <dt className="font-semibold text-foreground">{f.q}</dt>
                      <dd className="mt-1 leading-relaxed text-muted">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {relatedLinks?.length ? (
              <div className="mt-14">
                <h2 className="text-2xl font-bold tracking-tight">More help for pet paperwork</h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {relatedLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="block rounded-2xl border border-border bg-background px-4 py-4 text-foreground transition hover:border-primary hover:bg-primary-soft/20"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">Get every pet organized today</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
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

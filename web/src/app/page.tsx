import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/phone-frame";

const APP_STORE_URL = "https://apps.apple.com/us/app/pawproof-app/id6775067128";

const SHOWCASE = [
  {
    src: "/screenshots/reminders.png",
    alt: "PawProof reminders screen grouped by pet",
    eyebrow: "Reminders",
    title: "Never miss a booster again",
    body: "Vaccine expirations, meds, heartworm, flea & tick, grouped by pet with one-tap renew. Overdue items surface in red so nothing slips.",
  },
  {
    src: "/screenshots/records.png",
    alt: "PawProof records screen with vaccines and documents",
    eyebrow: "Records & Smart Scan",
    title: "Every vaccine and document, organized",
    body: "Scan a vaccine card or vet invoice and PawProof reads the dates for you. Search across every record and export a vet-ready PDF.",
  },
  {
    src: "/screenshots/emergency.png",
    alt: "PawProof emergency card for a dog",
    eyebrow: "Emergency card",
    title: "The info a vet or sitter needs, instantly",
    body: "Owner and vet contacts, allergies, medications, microchip, and vaccine status on one screen. Share it by text, email, or PDF in seconds.",
  },
  {
    src: "/screenshots/pets.png",
    alt: "PawProof My Pets list with three dogs",
    eyebrow: "Multi-pet households",
    title: "One home for the whole crew",
    body: "Manage every pet in one place. Each card shows the next thing due, so you always know whose turn it is for what.",
  },
];

const FEATURES = [
  {
    title: "Smart Scan vaccine records",
    body: "Snap a photo of a vaccine card or vet invoice. PawProof reads it, fills in dates, expirations, and lot numbers, and adds reminders for the next renewal.",
    icon: "scan",
  },
  {
    title: "Reminders that actually fire",
    body: "Daily, weekly, monthly, yearly, or every-N-days. Push notifications on iOS so you never miss heartworm, flea, or that annual rabies booster.",
    icon: "bell",
  },
  {
    title: "Emergency cards",
    body: "One-tap access to vet contacts, allergies, medications, and microchip number. Share via PDF with a pet sitter, boarding, or the ER.",
    icon: "heart",
  },
  {
    title: "Records that travel",
    body: "Every vaccine, vet visit, and document organized by pet. Search across everything. Export PDFs that match what your vet expects.",
    icon: "folder",
  },
  {
    title: "Daily journal",
    body: "Log meals, walks, meds, symptoms, training, and grooming in two taps. Patterns show up automatically as your pet's history fills in.",
    icon: "book",
  },
  {
    title: "Multi-pet households",
    body: "Manage every pet in one place. Pet-grouped reminders and records mean you always know whose turn it is for what.",
    icon: "users",
  },
];

const FREE_FEATURES = [
  "Up to 2 pets",
  "3 documents",
  "1 free Smart Scan trial",
  "Unlimited manual vaccine records",
  "Unlimited reminders + Quick Logs",
  "Search across records",
  "Emergency card (in-app)",
];

const PLUS_FEATURES = [
  "Unlimited pets",
  "Unlimited document storage",
  "Smart Scan for vaccine records and documents",
  "PDF exports for vets, sitters, boarding, emergencies",
  "Advanced reminder schedules",
  "Family & caregiver sharing (coming soon)",
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-primary-dark">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                  Free for 2 pets, no card required
                </span>
                <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
                  Every pet&apos;s care,
                  <br />
                  <span className="text-primary">in one place.</span>
                </h1>
                <p className="mt-5 max-w-xl mx-auto lg:mx-0 text-lg text-muted">
                  PawProof is the journal, vaccine tracker, and reminder app for
                  households with one pet or six. Smart Scan reads vaccine cards
                  and invoices so you don&apos;t have to.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
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
                  <Link href="/#features">
                    <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                      See features
                    </Button>
                  </Link>
                </div>
                <p className="mt-4 text-xs text-faint">
                  Free on iPhone. Free tier covers 2 pets, 3 documents, and your
                  first Smart Scan.
                </p>

                <div className="mt-6 hidden lg:flex items-center gap-4">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/appstore-qr.svg"
                      alt="QR code to download PawProof on the App Store"
                      className="h-28 w-28 rounded-xl border border-border bg-white p-2"
                    />
                  </a>
                  <div className="text-sm text-muted max-w-[200px]">
                    <div className="font-semibold text-foreground">Scan to download</div>
                    Point your iPhone&apos;s camera at the code to open PawProof in
                    the App Store.
                  </div>
                </div>
              </div>

              <div className="relative flex justify-center">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 mx-auto h-72 w-72 self-center rounded-full bg-primary/15 blur-3xl"
                />
                <PhoneFrame
                  src="/screenshots/home.png"
                  alt="PawProof home dashboard showing today's care and reminders"
                  priority
                  className="max-w-[260px] sm:max-w-[300px]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-primary-soft/40">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  New · Free Lost &amp; Found
                </span>
                <h2 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
                  Lost a pet or found one? Start with PawProof.
                </h2>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
                  Create a free lost or found pet report, search public reports in your area,
                  and share a PawProof link with your community. Lost &amp; Found is free and
                  separate from PawProof Plus.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/lost-and-found/report">
                    <Button size="lg" className="w-full sm:w-auto">Report a lost or found pet</Button>
                  </Link>
                  <Link href="/lost-and-found">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">Search lost &amp; found pets</Button>
                  </Link>
                  <Link href="/lost-and-found/how-it-works" className="self-center text-sm font-semibold text-primary hover:underline">
                    How it works →
                  </Link>
                </div>
                <p className="mt-5 text-sm text-muted">
                  No app install is required to browse public Lost &amp; Found reports.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Be ready before an emergency</div>
                <h3 className="mt-2 text-2xl font-bold">Keep the everyday pet details in your pocket.</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Use the PawProof iPhone app for vaccine records, reminders, documents,
                  emergency info, and daily pet care. If you ever need Lost &amp; Found, the
                  website is one tap away.
                </p>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download PawProof on the App Store"
                  className="mt-6 inline-flex transition-transform hover:scale-[1.03]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/app-store-badge.svg" alt="Download on the App Store" className="h-12 w-auto" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-surface-elevated border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Everything a pet&apos;s care needs.
              </h2>
              <p className="mt-3 text-muted">
                Built for people who actually keep records, not just promise
                themselves they will.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border bg-surface p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary text-lg font-bold">
                    {f.icon === "scan" && "⌖"}
                    {f.icon === "bell" && "🔔"}
                    {f.icon === "heart" && "♥"}
                    {f.icon === "folder" && "📂"}
                    {f.icon === "book" && "📓"}
                    {f.icon === "users" && "👥"}
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                See it in action.
              </h2>
              <p className="mt-3 text-muted">
                A quick look at the screens you&apos;ll use every day.
              </p>
            </div>
            <div className="mt-12 flex flex-col gap-16 md:gap-24">
              {SHOWCASE.map((s, i) => (
                <div
                  key={s.src}
                  className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
                >
                  <div
                    className={
                      i % 2 === 1 ? "md:order-2 flex justify-center" : "flex justify-center"
                    }
                  >
                    <PhoneFrame src={s.src} alt={s.alt} className="max-w-[240px]" />
                  </div>
                  <div className={i % 2 === 1 ? "md:order-1" : ""}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {s.eyebrow}
                    </div>
                    <h3 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-muted leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Generous free tier. Pay for the magic.
              </h2>
              <p className="mt-3 text-muted">
                Start free with up to 2 pets, 3 documents, and your first
                Smart Scan. Upgrade to Plus when you want unlimited records,
                unlimited OCR, and PDF exports.
              </p>
            </div>

            <div className="mt-12 rounded-2xl border border-border bg-surface p-6 max-w-4xl">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-xl">PawProof Plus includes</h3>
                <Link href="/sign-in?mode=signup" className="text-sm font-semibold text-primary hover:underline">
                  Start free trial →
                </Link>
              </div>
              <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                {PLUS_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2 max-w-2xl">
              <div className="relative rounded-2xl border-2 border-primary bg-primary-soft/40 p-6 lg:order-1">
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                  Best value · Save 33%
                </span>
                <h3 className="font-bold text-lg">Yearly</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$39.99</span>
                  <span className="text-sm text-muted">/year</span>
                </div>
                <div className="text-sm text-muted mt-1">$3.33/month, billed yearly</div>
                <Link href="/sign-in?mode=signup" className="mt-6 block">
                  <Button className="w-full">Start 7-day free trial</Button>
                </Link>
                <p className="mt-2 text-center text-xs text-muted">
                  Then $39.99/year. Cancel anytime.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 lg:order-2">
                <h3 className="font-bold text-lg">Monthly</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$4.99</span>
                  <span className="text-sm text-muted">/month</span>
                </div>
                <div className="text-sm text-muted mt-1">Try it month to month</div>
                <Link href="/sign-in?mode=signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">
                    Start 7-day free trial
                  </Button>
                </Link>
                <p className="mt-2 text-center text-xs text-muted">
                  Then $4.99/month. Cancel anytime.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface p-6 max-w-4xl flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="font-bold text-lg">Free</h3>
                  <span className="text-sm text-muted">No card required</span>
                </div>
                <ul className="mt-3 text-sm text-muted flex flex-wrap gap-x-4 gap-y-1">
                  {FREE_FEATURES.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
              <Link href="/sign-in?mode=signup" className="shrink-0">
                <Button variant="ghost">Start free</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Your pet deserves better than a shoebox of receipts.
            </h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">
              Download free, scan your first vaccine record, and let PawProof
              take it from there.
            </p>
            <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
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
              <div className="hidden sm:flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/appstore-qr.svg"
                  alt="QR code to download PawProof on the App Store"
                  className="h-20 w-20 rounded-lg bg-white p-1.5"
                />
                <span className="text-sm text-white/85 text-left max-w-[140px]">
                  Scan with your iPhone camera
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

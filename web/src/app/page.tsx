import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

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
  "Unlimited document uploads",
  "Unlimited Smart Scan / OCR",
  "PDF exports for vets, sitters, boarding, emergencies",
  "Advanced reminder schedules",
  "Family & caregiver sharing (coming soon)",
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-primary-dark">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
              Free for 2 pets, no card required
            </span>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
              Every pet&apos;s care,
              <br />
              <span className="text-primary">in one place.</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-lg text-muted">
              PawProof is the journal, vaccine tracker, and reminder app for
              households with one pet or six. Smart Scan reads vaccine cards
              and invoices so you don&apos;t have to.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/sign-in?mode=signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get started free
                </Button>
              </Link>
              <Link href="/#features">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto">
                  See features
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-faint">
              iOS app + web dashboard. Free tier covers 2 pets, 3 documents,
              and your first Smart Scan.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-surface-elevated border-y border-border">
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

        {/* Pricing */}
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

            <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-xl">Free</h3>
                  <span className="text-sm text-muted">$0</span>
                </div>
                <p className="text-sm text-muted mt-1">
                  Real value with no card on file.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-in?mode=signup" className="mt-8 block">
                  <Button variant="outline" className="w-full">
                    Start free
                  </Button>
                </Link>
              </div>

              <div className="rounded-2xl border-2 border-primary bg-primary-soft/40 p-6 relative">
                <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </span>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-xl">PawProof Plus</h3>
                  <span className="text-sm text-muted">
                    <span className="text-foreground font-semibold">$4.99</span> / mo
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  Keep every pet&apos;s care organized without the manual
                  work.
                </p>
                <ul className="mt-6 space-y-2 text-sm">
                  {PLUS_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-in?mode=signup" className="mt-8 block">
                  <Button className="w-full">Start PawProof Plus</Button>
                </Link>
                <p className="mt-3 text-center text-xs text-muted">
                  7-day free trial. Cancel anytime. $39.99/yr available (save 33%).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20 text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Your pet deserves better than a shoebox of receipts.
            </h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">
              Sign up free, scan your first vaccine record, and let PawProof
              take it from there.
            </p>
            <Link href="/sign-in?mode=signup" className="mt-6 inline-block">
              <Button variant="secondary" size="lg" className="bg-white text-primary-dark hover:bg-white/90">
                Get started free
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

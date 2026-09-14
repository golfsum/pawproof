import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, MessageCircle, FileText, Bell, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Lost & Found Pets | PawProof",
  description:
    "Search lost and found pet reports, create a free report, share sightings, and contact owners or finders privately through PawProof.",
  alternates: { canonical: "/lost-and-found" },
};

const STEPS = [
  { icon: FileText, title: "Create a free report", body: "Report a missing pet or a pet you found. Found pets do not need to be added as your own pet." },
  { icon: Search, title: "Search nearby", body: "Browse recent reports around a city or ZIP code and expand the search radius when needed." },
  { icon: MessageCircle, title: "Share sightings privately", body: "Send a sighting or contact an owner or finder without putting personal contact details on the public page." },
];

const BENEFITS = [
  [MapPin, "Approximate public locations", "Precise private locations stay private. Public reports show only the area needed to help people search."],
  [Bell, "Optional nearby alerts", "Choose your area, radius, species, and notification channel. Existing users are never subscribed automatically."],
  [ShieldCheck, "Private contact by default", "PawProof keeps email addresses, account IDs, microchip numbers, and private pet records off public report pages."],
] as const;

export default function LostAndFoundPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-background">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-dark">
                Free Lost & Found
              </span>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight md:text-6xl">
                Lost pets. Found pets. <span className="text-primary">One place to help them get home.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                Create a free report, search nearby pets, share sightings, and contact owners or finders privately. No PawProof subscription is required.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/lost-and-found/report?type=lost"><Button size="lg">I lost a pet</Button></Link>
                <Link href="/lost-and-found/report?type=found"><Button size="lg" variant="outline">I found a pet</Button></Link>
                <a href="#search"><Button size="lg" variant="ghost">Search nearby pets</Button></a>
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground">
                Lost and found is free. No payment to contact an owner or finder.
              </p>
            </div>
          </div>
        </section>

        <section id="search" className="border-b border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm md:p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Search Lost & Found reports</h2>
                  <p className="mt-2 text-sm text-muted">Enter a city or ZIP code. PawProof searches by distance, not exact city-name matches.</p>
                  <form action="/lost-and-found/search" className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_140px]">
                    <label className="text-sm font-medium">
                      City or ZIP
                      <input name="location" required placeholder="Tucson, AZ or 85701" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-primary" />
                    </label>
                    <label className="text-sm font-medium">
                      Distance
                      <select name="distance" defaultValue="25" className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3">
                        <option value="5">5 miles</option><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option>
                      </select>
                    </label>
                    <Button type="submit" className="mt-auto h-11"><Search className="mr-2 h-4 w-4" />Search</Button>
                  </form>
                </div>
                <Link href="/lost-and-found/how-it-works" className="text-sm font-semibold text-primary hover:underline">How it works →</Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">A simple way to get useful information in front of the right people.</h2>
              <p className="mt-3 text-muted">No app install is required to open a public report or help with a sighting.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <div key={title} className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
                  <div className="mt-4 text-xs font-bold uppercase tracking-wider text-faint">Step {i + 1}</div>
                  <h3 className="mt-1 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface-elevated">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Already use PawProof?</div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Your pet's information can be ready when you need it most.</h2>
                <p className="mt-4 leading-relaxed text-muted">
                  If your pet goes missing, PawProof can let you review and reuse selected profile information in a report. Nothing from a private pet profile becomes public unless you explicitly choose to publish it.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted">
                  <li>✓ Reuse selected photos and identifying details after review</li>
                  <li>✓ Keep microchip numbers, records, documents, and account details private</li>
                  <li>✓ Share one public report link and printable flyer</li>
                  <li>✓ Manage sightings and messages from your PawProof dashboard</li>
                </ul>
              </div>
              <div className="grid gap-4">
                {BENEFITS.map(([Icon, title, body]) => (
                  <div key={title} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex gap-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted">{body}</p></div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
            <h2 className="text-3xl font-bold tracking-tight">Help a pet get home.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Posting, searching, contacting, sightings, sharing, and flyers are free.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/lost-and-found/report"><Button size="lg">Create a free report</Button></Link>
              <Link href="/lost-and-found/how-it-works"><Button size="lg" variant="outline">Learn how it works</Button></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How PawProof Lost & Found Works",
  description: "How to report a missing pet, post a found pet, search nearby reports, share sightings, and contact people privately through PawProof.",
  alternates: { canonical: "/lost-and-found/how-it-works" },
};

const LOST = ["Create a free missing-pet report.", "Add identifying details and an approximate last-seen area.", "Share the public PawProof report link with your community.", "Receive private sightings and messages.", "Mark the report reunited when your pet is home."];
const FOUND = ["Search nearby reports first.", "Send a sighting if you recognize the pet.", "Create a free found-pet report when there is no clear match.", "Communicate privately with a possible owner.", "Close the report with the correct resolution when the pet is transferred or reunited."];

export default function HowItWorksPage() {
  return <><SiteHeader /><main>
    <section className="border-b border-border bg-surface-elevated"><div className="mx-auto max-w-5xl px-4 py-16 md:py-20"><div className="text-xs font-bold uppercase tracking-wider text-primary">PawProof Lost & Found</div><h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">How it works</h1><p className="mt-4 max-w-2xl text-lg text-muted">A public report is easy to share, while personal account details stay private. You do not need PawProof Plus to use Lost & Found.</p></div></section>
    <section><div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2 md:py-20">
      <Steps title="If your pet is missing" items={LOST} /><Steps title="If you find a pet" items={FOUND} />
    </div></section>
    <section className="border-y border-border bg-surface-elevated"><div className="mx-auto max-w-5xl px-4 py-14"><h2 className="text-2xl font-bold">What stays private</h2><p className="mt-3 max-w-3xl text-muted">PawProof public report pages are designed not to expose account IDs, private email addresses, full microchip numbers, medical records, ownership documents, or precise private coordinates. Only information selected for the report should become public.</p><p className="mt-4 text-sm text-muted">PawProof does not verify legal ownership and does not promise GPS tracking, automatic shelter notifications, or distribution to third-party social networks.</p></div></section>
    <section><div className="mx-auto max-w-5xl px-4 py-14 text-center md:py-20"><h2 className="text-3xl font-bold">Lost and found is free.</h2><p className="mt-3 text-muted">No payment to post, search, send a sighting, or contact an owner or finder.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/lost-and-found/report?type=lost"><Button size="lg">Report a lost pet</Button></Link><Link href="/lost-and-found/report?type=found"><Button size="lg" variant="outline">Report a found pet</Button></Link></div></div></section>
  </main><SiteFooter /></>;
}

function Steps({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-border bg-surface p-6"><h2 className="text-xl font-bold">{title}</h2><ol className="mt-5 space-y-4">{items.map((item, i) => <li key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-dark">{i + 1}</span><span className="pt-1 text-sm text-muted">{item}</span></li>)}</ol></div>;
}

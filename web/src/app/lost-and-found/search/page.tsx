import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Search Lost & Found Pets", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const location = typeof params.location === "string" ? params.location.trim() : "";
  const distance = typeof params.distance === "string" ? params.distance : "25";
  const type = typeof params.type === "string" ? params.type : "both";
  const species = typeof params.species === "string" ? params.species.trim().toLowerCase() : "";

  const snap = await adminDb().collection("publicPetReports").orderBy("createdAt", "desc").limit(100).get();
  const queryText = location.toLowerCase();
  const reports = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any)).filter((r) => {
    if (r.lifecycleStatus !== "active" && r.lifecycleStatus !== "reunited") return false;
    if (type !== "both" && r.reportType !== type) return false;
    if (species && String(r.species || "").toLowerCase() !== species) return false;
    if (!queryText) return true;
    const haystack = [r.approximateLocation, r.city, r.region, r.postalCode].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(queryText) || queryText.split(/[ ,]+/).some((part) => part.length > 2 && haystack.includes(part));
  });

  return <><SiteHeader /><main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
    <Link href="/lost-and-found" className="text-sm font-semibold text-primary hover:underline">← Lost & Found</Link>
    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Lost & Found reports{location ? ` near ${location}` : ""}</h1><p className="mt-2 text-sm text-muted">Showing recent public reports. Selected radius: {distance} miles.</p></div><Link href="/lost-and-found/report"><Button>Create free report</Button></Link></div>
    <form className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_140px_140px_120px]">
      <input name="location" defaultValue={location} placeholder="City or ZIP" className="h-11 rounded-xl border border-border bg-background px-3" />
      <select name="distance" defaultValue={distance} className="h-11 rounded-xl border border-border bg-background px-3"><option value="5">5 miles</option><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option></select>
      <select name="type" defaultValue={type} className="h-11 rounded-xl border border-border bg-background px-3"><option value="both">Lost & found</option><option value="lost">Lost only</option><option value="found">Found only</option></select>
      <Button type="submit">Search</Button>
    </form>
    {reports.length ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{reports.map((r) => <Link key={r.id} href={`/lost-and-found/pets/${r.id}`} className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex aspect-[4/3] items-center justify-center bg-surface-elevated text-5xl">🐾</div><div className="p-5"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${r.reportType === "lost" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{r.reportType}</span>{r.lifecycleStatus === "reunited" ? <span className="rounded-full bg-green-50 px-2 py-1 text-[11px] font-bold uppercase text-green-700">Reunited</span> : null}</div><h2 className="mt-3 text-lg font-bold">{r.petName || `Unknown ${r.species}`}</h2><p className="mt-1 text-sm text-muted">{r.breed || r.species}</p><p className="mt-3 text-sm text-muted">{r.approximateLocation}</p></div></Link>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-xl font-bold">No active reports found nearby.</h2><p className="mt-2 text-sm text-muted">Try another city or ZIP, expand your search, or create a report if a pet is missing or found.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/lost-and-found/report?type=lost"><Button>I lost a pet</Button></Link><Link href="/lost-and-found/report?type=found"><Button variant="outline">I found a pet</Button></Link></div></div>}
    <p className="mt-6 text-xs text-faint">Current search matching uses public report area text. Exact geographic-radius filtering will activate once report coordinates and the geospatial index are enabled.</p>
  </main><SiteFooter /></>;
}

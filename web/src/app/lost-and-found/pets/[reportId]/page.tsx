import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, CalendarDays, Share2, MessageCircle, Eye } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import { SITE_URL } from "@/lib/site";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

async function getReport(id: string) {
  const snap = await adminDb().collection("publicPetReports").doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function generateMetadata({ params }: { params: Promise<{ reportId: string }> }): Promise<Metadata> {
  const { reportId } = await params;
  const report = await getReport(reportId);
  if (!report) return { title: "Report unavailable", robots: { index: false, follow: false } };
  const label = report.reportType === "lost" ? "Lost" : "Found";
  const pet = report.petName || report.species || "Pet";
  const place = [report.city, report.region].filter(Boolean).join(", ");
  return {
    title: `${label} ${pet}${place ? ` in ${place}` : ""} | PawProof`,
    description: `${pet} was ${report.reportType === "lost" ? "last seen" : "reported found"} near ${report.approximateLocation}. View details or help through PawProof.`,
    alternates: { canonical: `/lost-and-found/pets/${reportId}` },
    robots: report.lifecycleStatus === "active" || report.lifecycleStatus === "reunited" ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PublicReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await getReport(reportId);
  if (!report) notFound();
  const lost = report.reportType === "lost";
  const reunited = report.lifecycleStatus === "reunited";
  const eventDate = report.eventAt ? new Date(report.eventAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Not provided";
  const shareUrl = `${SITE_URL}/lost-and-found/pets/${reportId}`;

  return <><SiteHeader /><main>
    <section className="border-b border-border bg-surface-elevated"><div className="mx-auto max-w-5xl px-4 py-10 md:py-14"><Link href="/lost-and-found" className="text-sm font-semibold text-primary hover:underline">← Lost & Found</Link><div className="mt-5 flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${lost ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{lost ? "Lost" : "Found"}</span>{reunited ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold uppercase text-green-700">Reunited</span> : null}</div><h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">{reunited ? `${report.petName || report.species} is home!` : report.petName || `Unknown ${report.species}`}</h1><p className="mt-3 text-lg text-muted">{report.breed || report.species}</p></div></section>
    <section><div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1.1fr_.9fr] lg:py-14">
      <div><div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface-elevated">{report.photoUrls?.[0] ? <img src={report.photoUrls[0]} alt={`${report.petName || report.species} report photo`} className="h-full w-full object-cover" /> : <div className="text-center"><div className="text-7xl">🐾</div><div className="mt-3 text-sm text-muted">No public photo available</div></div>}</div></div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="font-bold">Approximate area</div><div className="mt-1 text-sm text-muted">{report.approximateLocation}</div><div className="mt-1 text-xs text-faint">Public locations are intentionally approximate.</div></div></div></div>
        <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="font-bold">{lost ? "Last seen" : "Found / seen"}</div><div className="mt-1 text-sm text-muted">{eventDate}</div></div></div></div>
        {!reunited ? <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft/40 p-5"><h2 className="text-lg font-bold">{lost ? `Have you seen ${report.petName || "this pet"}?` : "Do you recognize this pet?"}</h2><p className="mt-2 text-sm text-muted">Sightings and private contact are being connected to PawProof's verified web-message flow. Personal email and phone details are not shown here.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button disabled><Eye className="mr-2 h-4 w-4" />Report a sighting</Button><Button variant="outline" disabled><MessageCircle className="mr-2 h-4 w-4" />Contact {lost ? "owner" : "finder"}</Button></div></div> : <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900"><div className="font-bold">Reunited with owner</div><p className="mt-1 text-sm">Thank you to everyone who looked, shared, and helped.</p></div>}
        <div className="grid gap-2 sm:grid-cols-2"><a href={`mailto:?subject=${encodeURIComponent(`${lost ? "Lost" : "Found"} pet on PawProof`)}&body=${encodeURIComponent(shareUrl)}`}><Button className="w-full" variant="outline"><Share2 className="mr-2 h-4 w-4" />Share report</Button></a><Button className="w-full" variant="ghost" disabled>Download flyer</Button></div>
      </div>
    </div></section>
    <section className="border-y border-border bg-surface-elevated"><div className="mx-auto max-w-5xl px-4 py-10"><h2 className="text-2xl font-bold">Report details</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2">{report.colors ? <Detail label="Colors" value={report.colors} /> : null}{report.size ? <Detail label="Size" value={report.size} /> : null}{report.distinguishingFeatures ? <Detail label="Distinguishing features" value={report.distinguishingFeatures} /> : null}{report.collarDescription ? <Detail label="Collar / tags" value={report.collarDescription} /> : null}{report.approachInstructions ? <Detail label="Approach instructions" value={report.approachInstructions} /> : null}</dl></div></section>
    <section><div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted">Contact is handled privately through PawProof. Public report pages do not expose account IDs, private email addresses, precise private coordinates, microchip numbers, or private pet documents.</div></section>
  </main><SiteFooter /></>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase tracking-wider text-faint">{label}</dt><dd className="mt-1 leading-relaxed text-muted">{value}</dd></div>; }

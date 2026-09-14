"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getIdToken } from "@/lib/auth-context";

type Report = { id: string; reportType: "lost" | "found"; lifecycleStatus: string; petName?: string | null; species: string; approximateLocation: string; createdAt: string };

export default function DashboardLostFoundPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/lost-and-found/my-reports", { headers: { authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(json.error || "Could not load reports.");
      else setReports(json.reports || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-primary">Lost & Found</div><h1 className="mt-1 text-3xl font-bold tracking-tight">My reports</h1><p className="mt-2 text-sm text-muted">Manage reports you have published through PawProof.</p></div><Link href="/lost-and-found/report"><Button>Create report</Button></Link></div>
    {loading ? <div className="mt-8 text-sm text-muted">Loading reports…</div> : error ? <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : reports.length ? <div className="mt-8 space-y-3">{reports.map((r) => <div key={r.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${r.reportType === "lost" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{r.reportType}</span><span className="rounded-full bg-surface-elevated px-2 py-1 text-[11px] font-bold uppercase text-muted">{r.lifecycleStatus}</span></div><h2 className="mt-3 font-bold">{r.petName || `Unknown ${r.species}`}</h2><p className="mt-1 text-sm text-muted">{r.approximateLocation}</p></div><div className="flex gap-2"><Link href={`/lost-and-found/pets/${r.id}`}><Button size="sm" variant="outline">View public page</Button></Link></div></div>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center"><h2 className="text-lg font-bold">No reports yet</h2><p className="mt-2 text-sm text-muted">If your pet goes missing or you find one, you can create a free public report.</p><Link href="/lost-and-found/report" className="mt-5 inline-block"><Button>Create a free report</Button></Link></div>}
    <div className="mt-10 grid gap-4 md:grid-cols-3"><Info title="Sightings & messages" body="Private sighting and conversation management will appear here when the verified contact flow is enabled." /><Info title="Nearby alerts" body="Choose an area, radius, species, and notification channel. PawProof will never opt you in automatically." /><Info title="Public pet profiles" body="Optional QR pet profiles will stay disabled until the public-profile controls and link rotation are ready." /></div>
  </div>;
}

function Info({ title, body }: { title: string; body: string }) { return <div className="rounded-2xl border border-border bg-surface p-5"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{body}</p></div>; }

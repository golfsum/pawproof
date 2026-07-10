import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const snap = await adminDb()
    .collection("analytics_pageviews")
    .orderBy("day", "desc")
    .limit(30)
    .get();

  const days = snap.docs.map((d) => {
    const x = d.data();
    return {
      day: (x.day as string) ?? d.id,
      total: Number(x.total ?? 0),
      entryTotal: Number(x.entryTotal ?? 0),
      paths: decodeCounterMap(x.paths),
      entryPaths: decodeCounterMap(x.entryPaths),
      sources: decodeCounterMap(x.sources),
      mediums: decodeCounterMap(x.mediums),
      referrers: decodeCounterMap(x.referrers),
      campaigns: decodeCounterMap(x.campaigns),
    };
  });

  const total30 = days.reduce((sum, day) => sum + day.total, 0);
  const last7 = days.slice(0, 7).reduce((sum, day) => sum + day.total, 0);
  const entry30 = days.reduce((sum, day) => sum + day.entryTotal, 0);

  const topPaths = topCounter(days.flatMap((d) => Object.entries(d.paths)))
    .slice(0, 10)
    .map(({ label, count }) => ({ path: label, count }));
  const topLandingPaths = topCounter(days.flatMap((d) => Object.entries(d.entryPaths)))
    .slice(0, 10)
    .map(({ label, count }) => ({ path: label, count }));
  const topSources = topCounter(days.flatMap((d) => Object.entries(d.sources))).slice(0, 8);
  const topMediums = topCounter(days.flatMap((d) => Object.entries(d.mediums))).slice(0, 8);
  const topReferrers = topCounter(days.flatMap((d) => Object.entries(d.referrers))).slice(0, 8);
  const topCampaigns = topCounter(days.flatMap((d) => Object.entries(d.campaigns))).slice(0, 8);

  const series = days
    .slice(0, 14)
    .reverse()
    .map((d) => ({ day: d.day, count: d.total }));

  return NextResponse.json({
    last7,
    total30,
    entry30,
    topPaths,
    topLandingPaths,
    topSources,
    topMediums,
    topReferrers,
    topCampaigns,
    series,
  });
}

function decodeCounterMap(value: unknown) {
  const raw = (value as Record<string, number> | undefined) ?? {};
  return Object.fromEntries(
    Object.entries(raw).map(([key, count]) => {
      try {
        return [decodeURIComponent(key), Number(count ?? 0)];
      } catch {
        return [key, Number(count ?? 0)];
      }
    }),
  );
}

function topCounter(entries: Array<[string, number]>) {
  const totals = new Map<string, number>();
  for (const [key, count] of entries) {
    totals.set(key, (totals.get(key) ?? 0) + Number(count ?? 0));
  }
  return Array.from(totals.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

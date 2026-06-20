import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Aggregated page-view stats for the admin overview. Reads the last 30 daily
// counter docs and rolls them up into totals, a top-paths list, and a short
// daily series for a sparkline.
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
      paths: (x.paths as Record<string, number>) ?? {},
    };
  });

  const sum = (arr: typeof days) => arr.reduce((a, b) => a + b.total, 0);
  const total30 = sum(days);
  const last7 = sum(days.slice(0, 7));

  // Top paths across the window (decode the safe map keys back to real paths).
  const pathTotals = new Map<string, number>();
  for (const d of days) {
    for (const [k, v] of Object.entries(d.paths)) {
      let path = k;
      try {
        path = decodeURIComponent(k);
      } catch {
        /* keep raw key */
      }
      pathTotals.set(path, (pathTotals.get(path) ?? 0) + Number(v ?? 0));
    }
  }
  const topPaths = Array.from(pathTotals.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Daily series, oldest → newest, last 14 days, for a small bar chart.
  const series = days
    .slice(0, 14)
    .reverse()
    .map((d) => ({ day: d.day, count: d.total }));

  return NextResponse.json({ last7, total30, topPaths, series });
}

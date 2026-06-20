import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// First-party page-view tracker. Records ONLY public marketing pages (admin,
// dashboard, api, and auth routes are excluded) as per-day, per-path counters
// in Firestore. No personal data is stored — just the path and a count.
//
// Self-traffic exclusion: set ANALYTICS_EXCLUDE_IPS (comma-separated) to skip
// your own / office / dev IPs so they don't inflate the numbers.

const EXCLUDED_PREFIXES = ["/admin", "/dashboard", "/api", "/sign-in"];
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebook|embedly|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|vercel|node-fetch/i;

function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

function excludedIps(): Set<string> {
  return new Set(
    (process.env.ANALYTICS_EXCLUDE_IPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function POST(req: NextRequest) {
  // Always return 204 — never reveal why a hit wasn't counted.
  const noop = new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return noop;

    const ip = clientIp(req);
    if (ip && excludedIps().has(ip)) return noop;

    const body = (await req.json().catch(() => null)) as { path?: string } | null;
    let path = body?.path;
    if (!path || typeof path !== "string" || !path.startsWith("/")) return noop;
    path = path.split(/[?#]/)[0].slice(0, 200); // strip query/hash, cap length
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return noop;

    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const key = encodeURIComponent(path); // safe Firestore map key
    await adminDb()
      .collection("analytics_pageviews")
      .doc(day)
      .set(
        {
          day,
          total: FieldValue.increment(1),
          paths: { [key]: FieldValue.increment(1) },
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    return noop;
  } catch {
    return noop;
  }
}

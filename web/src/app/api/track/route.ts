import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const EXCLUDED_PREFIXES = ["/admin", "/dashboard", "/api", "/sign-in"];
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebook|embedly|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|vercel|node-fetch/i;

type TrackBody = {
  path?: string;
  attribution?: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    term?: string | null;
    content?: string | null;
    referrer?: string | null;
  } | null;
};

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
  const noop = new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return noop;

    const ip = clientIp(req);
    if (ip && excludedIps().has(ip)) return noop;

    const body = (await req.json().catch(() => null)) as TrackBody | null;
    let path = body?.path;
    if (!path || typeof path !== "string" || !path.startsWith("/")) return noop;
    path = path.split(/[?#]/)[0].slice(0, 200);
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return noop;

    const day = new Date().toISOString().slice(0, 10);
    const pageKey = encodeURIComponent(path);
    const update: Record<string, unknown> = {
      day,
      total: FieldValue.increment(1),
      updatedAt: Date.now(),
      [`paths.${pageKey}`]: FieldValue.increment(1),
    };

    const attribution = sanitizeAttribution(body?.attribution);
    if (attribution) {
      update.entryTotal = FieldValue.increment(1);
      update[`entryPaths.${pageKey}`] = FieldValue.increment(1);
      update[`sources.${encodeURIComponent(attribution.source)}`] = FieldValue.increment(1);
      update[`mediums.${encodeURIComponent(attribution.medium)}`] = FieldValue.increment(1);
      if (attribution.referrer) {
        update[`referrers.${encodeURIComponent(attribution.referrer)}`] = FieldValue.increment(1);
      }
      if (attribution.campaign) {
        update[`campaigns.${encodeURIComponent(attribution.campaign)}`] = FieldValue.increment(1);
      }
      if (attribution.term) {
        update[`terms.${encodeURIComponent(attribution.term)}`] = FieldValue.increment(1);
      }
      if (attribution.content) {
        update[`contents.${encodeURIComponent(attribution.content)}`] = FieldValue.increment(1);
      }
    }

    await adminDb().collection("analytics_pageviews").doc(day).set(update, { merge: true });
    return noop;
  } catch {
    return noop;
  }
}

function sanitizeAttribution(raw: TrackBody["attribution"]) {
  if (!raw) return null;
  const source = sanitizeValue(raw.source) ?? "direct";
  const medium = sanitizeValue(raw.medium) ?? "direct";
  const campaign = sanitizeValue(raw.campaign);
  const term = sanitizeValue(raw.term);
  const content = sanitizeValue(raw.content);
  const referrer = sanitizeValue(raw.referrer);

  const hasSignal =
    source !== "direct" || medium !== "direct" || !!campaign || !!term || !!content || !!referrer;
  if (!hasSignal) return { source, medium, campaign, term, content, referrer };
  return { source, medium, campaign, term, content, referrer };
}

function sanitizeValue(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().slice(0, 100);
  return trimmed || null;
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { listAllIssues } from "@/lib/support-server";

export const runtime = "nodejs";

const OCR_COST_PER_USE_USD = Number(process.env.OCR_COST_PER_USE_USD ?? 0.01);

// Admin overview. Totals for the home tile row and the recent ticket
// strip. Cheap aggregate reads; for a large user base we'd switch to
// counter docs maintained by Cloud Functions.

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminDb();
  const usersSnap = await db.collection("users").get();
  const authUsers = await listAllAuthUsers();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  let totalPremium = 0;
  let recentSignups = 0;
  let totalPets = 0;
  let totalFreeOcrUses = 0;
  let premiumTrials = 0;
  let premiumRenewing = 0;
  let purchases7d = 0;
  let purchases30d = 0;
  const purchaseWeeks = buildWeeklyBuckets(12);
  const purchaseMonths = buildMonthlyBuckets(12);

  const premiumByUid = new Map<string, boolean>();

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const isPremium = data.isPremium === true;
    if (isPremium) totalPremium += 1;
    premiumByUid.set(doc.id, isPremium);
    totalFreeOcrUses += typeof data.freeOcrScansUsed === "number" ? data.freeOcrScansUsed : 0;
    if (isPremium && data.premiumPeriodType === "TRIAL") premiumTrials += 1;
    if (isPremium && data.premiumWillRenew === true) premiumRenewing += 1;

    const originalPurchaseMs = toMs(data.premiumOriginalPurchaseAt);
    if (!Number.isNaN(originalPurchaseMs)) {
      if (originalPurchaseMs >= sevenDaysAgo) purchases7d += 1;
      if (originalPurchaseMs >= thirtyDaysAgo) purchases30d += 1;
      incrementBucket(purchaseWeeks, originalPurchaseMs);
      incrementBucket(purchaseMonths, originalPurchaseMs);
    }
  }

  let activeUsers7d = 0;
  let activeUsers30d = 0;
  let activeUsers90d = 0;
  let premiumInactive30d = 0;
  let disabledUsers = 0;
  for (const u of authUsers) {
    const createdMs = u.metadata.creationTime
      ? new Date(u.metadata.creationTime).getTime()
      : Number.NaN;
    if (!Number.isNaN(createdMs) && createdMs >= sevenDaysAgo) recentSignups += 1;
    const lastSignInMs = u.metadata.lastSignInTime
      ? new Date(u.metadata.lastSignInTime).getTime()
      : Number.NaN;
    if (!Number.isNaN(lastSignInMs) && lastSignInMs >= sevenDaysAgo) activeUsers7d += 1;
    if (!Number.isNaN(lastSignInMs) && lastSignInMs >= thirtyDaysAgo) activeUsers30d += 1;
    if (!Number.isNaN(lastSignInMs) && lastSignInMs >= ninetyDaysAgo) activeUsers90d += 1;
    if (u.disabled) disabledUsers += 1;
    if (premiumByUid.get(u.uid) === true && (Number.isNaN(lastSignInMs) || lastSignInMs < thirtyDaysAgo)) {
      premiumInactive30d += 1;
    }
  }

  // Pet counts are per-user subcollections. Sum them with a parallel
  // fan-out. Keeps the request fast even with hundreds of users.
  let totalTrackedOcrUses = 0;
  let usersWithTrackedOcr = 0;
  let downgradedPetHouseholds = 0;
  await Promise.all(
    usersSnap.docs.map(async (doc) => {
      const userRef = db.collection("users").doc(doc.id);
      const [pets, ocrSnap] = await Promise.all([
        userRef.collection("pets").count().get(),
        userRef.collection("private").doc("ocr").get(),
      ]);
      totalPets += pets.data().count;
      if (doc.data().isPremium !== true && pets.data().count > 2) downgradedPetHouseholds += 1;
      const ocr = ocrSnap.data() ?? {};
      const tracked =
        typeof ocr.totalCount === "number"
          ? ocr.totalCount
          : typeof doc.data().freeOcrScansUsed === "number"
            ? doc.data().freeOcrScansUsed
            : 0;
      totalTrackedOcrUses += tracked;
      if (tracked > 0) usersWithTrackedOcr += 1;
    }),
  );

  const allTickets = await listAllIssues({ limit: 500 });
  const openTickets = allTickets.filter((t) => t.status === "open").length;
  const inReviewTickets = allTickets.filter((t) => t.status === "in_review").length;
  const recentTickets = allTickets.slice(0, 10);
  const errorTickets = allTickets.filter((t) => t.lastError != null);
  const usersWithErrors = new Set(errorTickets.map((t) => t.uid)).size;
  const billingTickets = allTickets.filter((t) => t.category === "billing_issue").length;
  const ocrTickets = allTickets.filter((t) => t.category === "ocr_issue").length;

  return NextResponse.json({
    counts: {
      totalUsers: authUsers.length,
      totalProfiles: usersSnap.size,
      usersMissingProfile: Math.max(0, authUsers.length - usersSnap.size),
      totalPremium,
      totalPets,
      openTickets,
      inReviewTickets,
      recentSignups,
      disabledUsers,
      activeUsers7d,
      activeUsers30d,
      activeUsers90d,
      totalTrackedOcrUses,
      totalFreeOcrUses,
      usersWithTrackedOcr,
      estimatedOcrCostUsd: roundMoney(totalTrackedOcrUses * OCR_COST_PER_USE_USD),
      ocrCostPerUseUsd: OCR_COST_PER_USE_USD,
      usersWithErrors,
      errorTickets: errorTickets.length,
      billingTickets,
      ocrTickets,
      downgradedPetHouseholds,
      premiumInactive30d,
      premiumTrials,
      premiumRenewing,
      purchases7d,
      purchases30d,
    },
    purchases: {
      weekly: purchaseWeeks,
      monthly: purchaseMonths,
    },
    recentTickets,
  });
}

async function listAllAuthUsers() {
  const auth = adminAuth();
  const out: Awaited<ReturnType<typeof auth.listUsers>>["users"] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    out.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return out;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function toMs(value: unknown) {
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? Number.NaN : ms;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      const ms = (value as { toDate: () => Date }).toDate().getTime();
      return Number.isNaN(ms) ? Number.NaN : ms;
    } catch {
      return Number.NaN;
    }
  }
  return Number.NaN;
}

function buildWeeklyBuckets(count: number) {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const currentWeekStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - diffToMonday,
  );
  return Array.from({ length: count }, (_, idx) => {
    const startMs = currentWeekStart - (count - 1 - idx) * 7 * 24 * 60 * 60 * 1000;
    const start = new Date(startMs);
    return {
      label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`,
      startMs,
      endMs: startMs + 7 * 24 * 60 * 60 * 1000,
      count: 0,
    };
  });
}

function buildMonthlyBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, idx) => {
    const offset = count - 1 - idx;
    const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1);
    const start = new Date(startMs);
    const endMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
    return {
      label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
      startMs,
      endMs,
      count: 0,
    };
  });
}

function incrementBucket(
  buckets: Array<{ startMs: number; endMs: number; count: number }>,
  valueMs: number,
) {
  const bucket = buckets.find((item) => valueMs >= item.startMs && valueMs < item.endMs);
  if (bucket) bucket.count += 1;
}

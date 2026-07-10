import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Admin user list. Pulls from Firebase Auth + each user's profile doc
// and counts their pets + tickets so the table view has actionable
// signal at a glance.

function toIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "toDate" in v) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminDb();

  const authUsers = await listAllAuthUsers();

  // Pre-fetch ticket counts grouped by uid in one query so we don't
  // do N round trips for N users.
  const ticketSnap = await db.collection("support_issues").get();
  const ticketByUid = new Map<string, number>();
  const errorByUid = new Map<string, number>();
  const lastErrorAtByUid = new Map<string, string>();
  for (const doc of ticketSnap.docs) {
    const data = doc.data();
    const uid = data.uid;
    if (typeof uid === "string") {
      ticketByUid.set(uid, (ticketByUid.get(uid) ?? 0) + 1);
      const lastError = data.lastError as { createdAt?: unknown } | null | undefined;
      const errorAt =
        lastError && typeof lastError.createdAt === "string" ? lastError.createdAt : null;
      if (errorAt) {
        errorByUid.set(uid, (errorByUid.get(uid) ?? 0) + 1);
        const prev = lastErrorAtByUid.get(uid);
        if (!prev || errorAt > prev) lastErrorAtByUid.set(uid, errorAt);
      }
    }
  }

  const rows = await Promise.all(
    authUsers.map(async (u) => {
      const profileSnap = await db.collection("users").doc(u.uid).get();
      const profile = profileSnap.data() ?? {};
      const userRef = db.collection("users").doc(u.uid);
      const [petsCount, ocrSnap] = await Promise.all([
        userRef.collection("pets").count().get(),
        userRef.collection("private").doc("ocr").get(),
      ]);
      const ocr = ocrSnap.data() ?? {};
      return {
        id: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? (profile.displayName as string | null) ?? null,
        isPremium: profile.isPremium === true,
        freeOcrScansUsed:
          typeof profile.freeOcrScansUsed === "number" ? profile.freeOcrScansUsed : 0,
        totalOcrCount:
          typeof ocr.totalCount === "number"
            ? ocr.totalCount
            : typeof profile.freeOcrScansUsed === "number"
              ? profile.freeOcrScansUsed
              : 0,
        lastOcrAt: toIso(ocr.lastSuccessAt) ?? toIso(ocr.updatedAt),
        petCount: petsCount.data().count,
        ticketCount: ticketByUid.get(u.uid) ?? 0,
        errorCount: errorByUid.get(u.uid) ?? 0,
        lastErrorAt: lastErrorAtByUid.get(u.uid) ?? null,
        createdAt: toIso(profile.createdAt) ?? u.metadata.creationTime ?? null,
        lastSignInAt: u.metadata.lastSignInTime ?? null,
        disabled: u.disabled,
      };
    }),
  );

  // Most-recently-active first.
  rows.sort((a, b) => {
    const aMs = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
    const bMs = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
    return bMs - aMs;
  });

  return NextResponse.json({ users: rows });
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

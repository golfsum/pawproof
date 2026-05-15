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

  const auth = adminAuth();
  const db = adminDb();

  // Page through all auth records. Fine for early-stage volume.
  // Beyond ~10k users we'd switch this to indexed Firestore reads.
  const result = await auth.listUsers(1000);

  // Pre-fetch ticket counts grouped by uid in one query so we don't
  // do N round trips for N users.
  const ticketSnap = await db.collection("support_issues").get();
  const ticketByUid = new Map<string, number>();
  for (const doc of ticketSnap.docs) {
    const uid = doc.data().uid;
    if (typeof uid === "string") {
      ticketByUid.set(uid, (ticketByUid.get(uid) ?? 0) + 1);
    }
  }

  const rows = await Promise.all(
    result.users.map(async (u) => {
      const profileSnap = await db.collection("users").doc(u.uid).get();
      const profile = profileSnap.data() ?? {};
      const petsCount = await db
        .collection("users")
        .doc(u.uid)
        .collection("pets")
        .count()
        .get();
      return {
        id: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? (profile.displayName as string | null) ?? null,
        isPremium: profile.isPremium === true,
        freeOcrScansUsed:
          typeof profile.freeOcrScansUsed === "number" ? profile.freeOcrScansUsed : 0,
        petCount: petsCount.data().count,
        ticketCount: ticketByUid.get(u.uid) ?? 0,
        createdAt: toIso(profile.createdAt) ?? u.metadata.creationTime ?? null,
        lastSignInAt: u.metadata.lastSignInTime ?? null,
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

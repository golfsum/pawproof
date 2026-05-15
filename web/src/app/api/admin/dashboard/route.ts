import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";
import { listAllIssues } from "@/lib/support-server";

export const runtime = "nodejs";

// Admin overview. Totals for the home tile row and the recent ticket
// strip. Cheap aggregate reads; for a large user base we'd switch to
// counter docs maintained by Cloud Functions.

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const db = adminDb();
  const usersSnap = await db.collection("users").get();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let totalPremium = 0;
  let recentSignups = 0;
  let totalPets = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.isPremium === true) totalPremium += 1;
    const created = data.createdAt;
    let createdMs: number | null = null;
    if (created && typeof created.toDate === "function") {
      createdMs = (created as { toDate: () => Date }).toDate().getTime();
    } else if (typeof created === "string") {
      const d = new Date(created);
      if (!Number.isNaN(d.getTime())) createdMs = d.getTime();
    }
    if (createdMs != null && createdMs >= sevenDaysAgo) recentSignups += 1;
  }

  // Pet counts are per-user subcollections. Sum them with a parallel
  // fan-out. Keeps the request fast even with hundreds of users.
  await Promise.all(
    usersSnap.docs.map(async (doc) => {
      const pets = await db
        .collection("users")
        .doc(doc.id)
        .collection("pets")
        .count()
        .get();
      totalPets += pets.data().count;
    }),
  );

  const allTickets = await listAllIssues({ limit: 500 });
  const openTickets = allTickets.filter((t) => t.status === "open").length;
  const inReviewTickets = allTickets.filter((t) => t.status === "in_review").length;
  const recentTickets = allTickets.slice(0, 10);

  return NextResponse.json({
    counts: {
      totalUsers: usersSnap.size,
      totalPremium,
      totalPets,
      openTickets,
      inReviewTickets,
      recentSignups,
    },
    recentTickets,
  });
}

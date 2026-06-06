import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { uid } = await ctx.params;

  const auth = adminAuth();
  const db = adminDb();

  let authUser;
  try {
    authUser = await auth.getUser(uid);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profileSnap = await db.collection("users").doc(uid).get();
  const profile = profileSnap.data() ?? {};

  // Subcollection counts in parallel.
  const [petsCount, vaccinesCount, documentsCount, remindersCount, entriesCount, tickets] =
    await Promise.all([
      db.collection("users").doc(uid).collection("pets").count().get(),
      db.collection("users").doc(uid).collection("vaccines").count().get(),
      db.collection("users").doc(uid).collection("documents").count().get(),
      db.collection("users").doc(uid).collection("reminders").count().get(),
      db.collection("users").doc(uid).collection("journalEntries").count().get(),
      db.collection("support_issues").where("uid", "==", uid).count().get(),
    ]);

  const userRef = db.collection("users").doc(uid);
  // Pull the actual records (capped) so admins can inspect a user's data.
  // Ordered newest-first by createdAt; docs missing createdAt are still
  // returned via a fallback sort below.
  const [petsSnap, vaccinesSnap, documentsSnap, remindersSnap, entriesSnap] =
    await Promise.all([
      userRef.collection("pets").orderBy("createdAt", "asc").limit(50).get(),
      userRef.collection("vaccines").limit(100).get(),
      userRef.collection("documents").limit(100).get(),
      userRef.collection("reminders").limit(100).get(),
      userRef.collection("journalEntries").orderBy("timestamp", "desc").limit(100).get(),
    ]);

  // Pet id → name map for labeling records by pet.
  const petName = new Map<string, string>();
  petsSnap.docs.forEach((d) => petName.set(d.id, (d.data().name as string) ?? ""));

  // Owner vs caregiver: only journal entries carry an actor stamp. A record is
  // "caregiver"-created when its actorUid is set and differs from the owner.
  const actorLabel = (data: FirebaseFirestore.DocumentData): string => {
    const actorUid = data.actorUid as string | undefined;
    const actorName = data.actorName as string | undefined;
    if (actorUid && actorUid !== uid) return `Caregiver${actorName ? ` (${actorName})` : ""}`;
    return "Owner";
  };

  const byCreatedDesc = (a: { createdAt: string | null }, b: { createdAt: string | null }) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

  const pets = petsSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: x.name ?? "",
      species: x.species ?? "other",
      breed: x.breed ?? null,
      birthday: x.birthday ?? null,
      createdAt: toIso(x.createdAt),
      createdBy: actorLabel(x),
    };
  });

  const vaccines = vaccinesSnap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        vaccineName: x.vaccineName ?? "Vaccine",
        petName: petName.get(x.petId) ?? null,
        dateGiven: x.dateGiven ?? null,
        createdAt: toIso(x.createdAt),
        createdBy: actorLabel(x),
      };
    })
    .sort(byCreatedDesc);

  const documents = documentsSnap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        title: x.title ?? "Document",
        kind: x.kind ?? null,
        petName: petName.get(x.petId) ?? null,
        createdAt: toIso(x.createdAt),
        createdBy: actorLabel(x),
      };
    })
    .sort(byCreatedDesc);

  const reminders = remindersSnap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        title: x.name ?? x.title ?? "Reminder",
        type: x.category ?? x.type ?? null,
        petName: petName.get(x.petId) ?? null,
        dueDate: x.dueDate ?? null,
        createdAt: toIso(x.createdAt),
        createdBy: actorLabel(x),
      };
    })
    .sort(byCreatedDesc);

  const entries = entriesSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type ?? "note",
      title: x.title ?? "",
      petName: petName.get(x.petId) ?? null,
      timestamp: toIso(x.timestamp),
      createdAt: toIso(x.createdAt) ?? toIso(x.timestamp),
      createdBy: actorLabel(x),
    };
  });

  return NextResponse.json({
    user: {
      id: uid,
      email: authUser.email ?? null,
      displayName: authUser.displayName ?? (profile.displayName as string | null) ?? null,
      isPremium: profile.isPremium === true,
      freeOcrScansUsed:
        typeof profile.freeOcrScansUsed === "number" ? profile.freeOcrScansUsed : 0,
      createdAt: toIso(profile.createdAt) ?? authUser.metadata.creationTime ?? null,
      lastSignInAt: authUser.metadata.lastSignInTime ?? null,
      disabled: authUser.disabled,
      pets,
      vaccines,
      documents,
      reminders,
      entries,
      petCount: petsCount.data().count,
      vaccineCount: vaccinesCount.data().count,
      documentCount: documentsCount.data().count,
      reminderCount: remindersCount.data().count,
      entryCount: entriesCount.data().count,
      ticketCount: tickets.data().count,
    },
  });
}

const patchSchema = z.object({
  isPremium: z.boolean().optional(),
  disabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { uid } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = adminDb();
  if (parsed.data.isPremium !== undefined) {
    await db.collection("users").doc(uid).set(
      { isPremium: parsed.data.isPremium },
      { merge: true },
    );
  }
  if (parsed.data.disabled !== undefined) {
    await adminAuth().updateUser(uid, { disabled: parsed.data.disabled });
  }
  return NextResponse.json({ ok: true });
}

// Permanently delete a user: their Firestore data, then the Auth account.
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { uid } = await ctx.params;

  // Don't let an admin delete their own account from here by accident.
  if (guard.uid === uid) {
    return NextResponse.json(
      { error: "You can't delete your own admin account here." },
      { status: 400 },
    );
  }

  const db = adminDb();
  const userDoc = db.collection("users").doc(uid);
  const subcollections = [
    "pets",
    "vaccines",
    "documents",
    "reminders",
    "journalEntries",
    "medications",
    "weights",
    "receipts",
  ];
  try {
    for (const name of subcollections) {
      await deleteCollection(userDoc.collection(name));
    }
    // Revoke any pet shares this user owns.
    const shares = await db.collection("pet_shares").where("ownerUid", "==", uid).get();
    await Promise.all(shares.docs.map((d) => d.ref.delete()));
    // Drop the profile doc, then the auth user itself.
    await userDoc.delete();
    await adminAuth().deleteUser(uid);
  } catch (e) {
    console.error("[admin] delete user failed", e);
    return NextResponse.json({ error: "Could not delete user." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Delete every doc in a collection in batches of 400 (under the 500 write cap).
async function deleteCollection(
  col: FirebaseFirestore.CollectionReference,
): Promise<void> {
  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = col.firestore.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < 400) break;
  }
}

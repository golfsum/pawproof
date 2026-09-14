import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let user;
  try { user = await adminAuth().verifyIdToken(header.slice(7)); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const snap = await adminDb().collection("petReports").where("ownerUid", "==", user.uid).limit(100).get();
  const reports = snap.docs.map((doc) => {
    const d = doc.data();
    const createdAt = d.createdAt?.toDate?.()?.toISOString?.() ?? d.createdAt ?? "";
    const updatedAt = d.updatedAt?.toDate?.()?.toISOString?.() ?? d.updatedAt ?? createdAt;
    return { id: doc.id, reportType: d.reportType, lifecycleStatus: d.lifecycleStatus, petName: d.petName, species: d.species, approximateLocation: d.approximateLocation, createdAt, updatedAt };
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json({ reports });
}

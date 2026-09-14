import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const reportSchema = z.object({
  reportType: z.enum(["lost", "found"]),
  petName: z.string().trim().max(80).optional().nullable(),
  species: z.string().trim().min(1).max(40),
  breed: z.string().trim().max(100).optional().nullable(),
  colors: z.string().trim().max(140).optional().nullable(),
  distinguishingFeatures: z.string().trim().max(800).optional().nullable(),
  size: z.string().trim().max(40).optional().nullable(),
  collarDescription: z.string().trim().max(300).optional().nullable(),
  approachInstructions: z.string().trim().max(800).optional().nullable(),
  approximateLocation: z.string().trim().min(2).max(180),
  city: z.string().trim().max(80).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  eventAt: z.string().datetime(),
  foundDisposition: z.enum(["in_care", "seen_not_secured"]).optional().nullable(),
  publicPhotoConsent: z.literal(true),
  publicLocationConsent: z.literal(true),
});

async function currentUser(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    return await adminAuth().verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await currentUser(req);
  if (!user) return NextResponse.json({ error: "Sign in is required to publish a report." }, { status: 401 });

  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the report fields.", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const db = adminDb();
  const privateRef = db.collection("petReports").doc();
  const publicRef = db.collection("publicPetReports").doc(privateRef.id);

  const privateData = {
    ownerUid: user.uid,
    reportType: data.reportType,
    lifecycleStatus: "active",
    moderationStatus: "approved",
    visibility: "public",
    petName: data.petName || null,
    species: data.species,
    breed: data.breed || null,
    colors: data.colors || null,
    distinguishingFeatures: data.distinguishingFeatures || null,
    size: data.size || null,
    collarDescription: data.collarDescription || null,
    approachInstructions: data.approachInstructions || null,
    approximateLocation: data.approximateLocation,
    city: data.city || null,
    region: data.region || null,
    postalCode: data.postalCode || null,
    eventAt: data.eventAt,
    foundDisposition: data.foundDisposition || null,
    photoUrls: [],
    consent: {
      publicPhoto: data.publicPhotoConsent,
      publicLocation: data.publicLocationConsent,
      version: 1,
      acceptedAt: FieldValue.serverTimestamp(),
    },
    schemaVersion: 1,
    revision: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastConfirmedAt: FieldValue.serverTimestamp(),
  };

  const publicData = {
    reportType: data.reportType,
    lifecycleStatus: "active",
    petName: data.petName || null,
    species: data.species,
    breed: data.breed || null,
    colors: data.colors || null,
    distinguishingFeatures: data.distinguishingFeatures || null,
    size: data.size || null,
    collarDescription: data.collarDescription || null,
    approachInstructions: data.approachInstructions || null,
    approximateLocation: data.approximateLocation,
    city: data.city || null,
    region: data.region || null,
    postalCode: data.postalCode || null,
    eventAt: data.eventAt,
    photoUrls: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.create(privateRef, privateData);
  batch.create(publicRef, publicData);
  await batch.commit();

  return NextResponse.json({ id: privateRef.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 48), 1), 100);
  const snapshot = await adminDb().collection("publicPetReports").orderBy("createdAt", "desc").limit(limit).get();
  const reports = snapshot.docs.map((doc) => {
    const d = doc.data();
    const createdAt = d.createdAt?.toDate?.()?.toISOString?.() ?? d.createdAt ?? "";
    const updatedAt = d.updatedAt?.toDate?.()?.toISOString?.() ?? d.updatedAt ?? createdAt;
    return { id: doc.id, ...d, createdAt, updatedAt };
  });
  return NextResponse.json({ reports });
}

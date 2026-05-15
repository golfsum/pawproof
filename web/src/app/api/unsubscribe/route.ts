import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(320),
  token: z.string().min(1).max(256).nullable().optional(),
});

// Email unsubscribe sink. Writes the suppression to a top-level
// `email_unsubscribes` collection keyed by the lowercase email. When
// we send marketing/reminder emails later, we'll skip any recipient
// whose email is in this set.
//
// We also flip an `emailOptOut: true` flag on the matching user
// profile (if there is one) so the in-app settings reflect the state.

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  const db = adminDb();
  try {
    await db
      .collection("email_unsubscribes")
      .doc(email)
      .set(
        {
          email,
          createdAt: FieldValue.serverTimestamp(),
          source: parsed.data.token ? "email_link" : "web_form",
        },
        { merge: true },
      );

    // Best-effort sync to the user profile so the app reflects the
    // opt-out. We don't fail the request if this part errors.
    try {
      const matches = await db.collection("users").where("email", "==", email).limit(5).get();
      await Promise.all(
        matches.docs.map((d) => d.ref.set({ emailOptOut: true }, { merge: true })),
      );
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[unsubscribe]", err);
    return NextResponse.json({ error: "Could not unsubscribe right now." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // GET endpoint so email clients that auto-follow one-click unsubscribe
  // (RFC 8058) can hit this URL directly. Same logic, returns text.
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const token = searchParams.get("token");
  if (!email) return new Response("Missing email", { status: 400 });
  const parsed = schema.safeParse({ email, token });
  if (!parsed.success) return new Response("Invalid email", { status: 400 });

  const db = adminDb();
  await db
    .collection("email_unsubscribes")
    .doc(email)
    .set(
      {
        email,
        createdAt: FieldValue.serverTimestamp(),
        source: "email_link_oneclick",
      },
      { merge: true },
    );
  return new Response("You're unsubscribed. Visit pawproof.app to manage other preferences.", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

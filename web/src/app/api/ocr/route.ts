import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-auth";
import { adminDb } from "@/lib/firebase-admin";

// Server-side OCR proxy. The Gemini API key lives ONLY here (GEMINI_API_KEY,
// a server env var) — it is never shipped in the mobile app. Every request is
// authenticated with a Firebase ID token and rate-limited per user so a
// logged-in client can't spam expensive Gemini calls.
//
// The client sends the prompt + image so the prompt vocabulary stays a single
// source of truth in the app (src/lib/gemini.ts); this route is a thin,
// guarded relay.

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Per-user rate limits. Burst stops scripted loops; daily cap stops a slow
// drip from running up an unbounded bill. Tune as needed.
const BURST_LIMIT = 8; // requests per BURST_WINDOW_MS
const BURST_WINDOW_MS = 60_000;
const DAILY_LIMIT = 100;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // ~12MB of base64-decoded image

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "OCR is not configured on the server." }, 500);
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { uid } = auth;

  let payload: { prompt?: string; mimeType?: string; dataBase64?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  const { prompt, mimeType, dataBase64 } = payload;
  if (!prompt || !mimeType || !dataBase64) {
    return json({ error: "Missing prompt, mimeType, or image data." }, 400);
  }
  // base64 is ~4/3 the byte size; reject oversized payloads early.
  if (dataBase64.length > MAX_IMAGE_BYTES * 1.4) {
    return json({ error: "Image is too large. Use a smaller photo." }, 413);
  }

  // ---- Rate limit (atomic transaction on users/{uid}/private/ocr) ----
  const rl = await checkAndRecordRateLimit(uid);
  if (!rl.allowed) {
    return json({ error: rl.message }, 429);
  }

  // ---- Relay to Gemini with the server-held key ----
  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: dataBase64 } }] },
        ],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });
  } catch (e) {
    console.error("[ocr] gemini fetch failed:", e);
    return json({ error: "OCR service is unreachable. Try again." }, 502);
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "");
    console.error("[ocr] gemini error", geminiRes.status, detail.slice(0, 300));
    // Surface Gemini's own status + message back to the client so failures are
    // diagnosable without server log access. The detail is just an upstream
    // HTTP status/reason (no secrets), e.g. "403 ... API key not valid" or
    // "PERMISSION_DENIED ... API has not been used in project ...".
    let reason = "";
    try {
      const parsed = JSON.parse(detail);
      reason = parsed?.error?.message ?? parsed?.error?.status ?? "";
    } catch {
      reason = detail.slice(0, 200);
    }
    return json(
      { error: `OCR failed (${geminiRes.status})${reason ? `: ${reason}` : ""}` },
      502,
    );
  }

  const data = await geminiRes.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return json({ error: "OCR returned no text. Try a clearer photo." }, 502);
  }
  // Return the raw model text; the client parses it with its existing logic.
  return json({ text });
}

// Atomic per-user rate limiter stored at users/{uid}/private/ocr. Resets the
// daily counter when the UTC day rolls over; trims the burst window to the
// last BURST_WINDOW_MS.
async function checkAndRecordRateLimit(
  uid: string,
): Promise<{ allowed: true } | { allowed: false; message: string }> {
  const ref = adminDb().doc(`users/${uid}/private/ocr`);
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = (snap.exists ? snap.data() : {}) ?? {};
      const recent: number[] = Array.isArray(d.recent) ? d.recent : [];
      const dayCount: number = d.day === today ? Number(d.dayCount ?? 0) : 0;

      const windowStart = now - BURST_WINDOW_MS;
      const trimmed = recent.filter((t) => t > windowStart);

      if (dayCount >= DAILY_LIMIT) {
        return { allowed: false as const, message: "Daily scan limit reached. Try again tomorrow." };
      }
      if (trimmed.length >= BURST_LIMIT) {
        return { allowed: false as const, message: "You're scanning very fast — wait a moment and try again." };
      }

      trimmed.push(now);
      tx.set(
        ref,
        { recent: trimmed.slice(-BURST_LIMIT), day: today, dayCount: dayCount + 1, updatedAt: now },
        { merge: true },
      );
      return { allowed: true as const };
    });
  } catch (e) {
    // If the limiter itself errors, fail OPEN (allow) so a Firestore blip
    // doesn't block legitimate scans — abuse protection is best-effort, the
    // Gemini budget cap in GCP is the hard backstop.
    console.error("[ocr] rate-limit tx failed, allowing:", e);
    return { allowed: true };
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

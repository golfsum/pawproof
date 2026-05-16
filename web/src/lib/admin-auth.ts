import "server-only";
import type { NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

// Admin authentication helpers. Source of truth is the ADMIN_UIDS env
// var (comma-separated Firebase UIDs). Every admin API request verifies
// the bearer token + UID membership server-side. There's no
// client-side flag that could be tampered with.

function adminUidSet(): Set<string> {
  const raw = process.env.ADMIN_UIDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isAdminUid(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return adminUidSet().has(uid);
}

export async function requireAdmin(req: NextRequest): Promise<
  | { ok: true; uid: string; email: string | null }
  | { ok: false; response: Response }
> {
  const auth = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!idToken) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error("[admin-auth] verifyIdToken failed:", err);
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  if (!isAdminUid(decoded.uid)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  return { ok: true, uid: decoded.uid, email: decoded.email ?? null };
}

export async function requireUser(req: NextRequest): Promise<
  | { ok: true; uid: string; email: string | null; displayName: string | null }
  | { ok: false; response: Response }
> {
  const auth = req.headers.get("authorization") ?? "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!idToken) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return {
      ok: true,
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    };
  }
}

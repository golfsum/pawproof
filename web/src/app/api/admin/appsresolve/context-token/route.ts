import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const key = process.env.APPSRESOLVE_AGENT_API_KEY;
  if (!key || !admin.email) return NextResponse.json({ error: "Agent Assist is not configured" }, { status: 503 });

  // Customer context is disabled until a verified PawProof account connector
  // and customer-level authorization mapping are available.
  try {
    const response = await fetch("https://appsresolve.com/api/agent-assist/context-token", {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ employee: { email: admin.email }, origin: "https://pawproof.app", ttlSeconds: 600 }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return NextResponse.json({ error: "Agent Assist authorization unavailable" }, { status: 502 });
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("token" in body) || typeof body.token !== "string" || !body.token) {
      return NextResponse.json({ error: "Missing Agent Assist token" }, { status: 502 });
    }
    const expiresAt = "expiresAt" in body ? body.expiresAt : undefined;
    return NextResponse.json({ token: body.token, expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Agent Assist unavailable" }, { status: 502 });
  }
}

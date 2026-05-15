import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/admin-auth";
import {
  createIssueInputSchema,
  sanitizeText,
  MAX_MESSAGE_LEN,
} from "@/lib/support";
import { createIssue, listIssuesForUser } from "@/lib/support-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createIssueInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  data.message = sanitizeText(data.message, MAX_MESSAGE_LEN);
  if (!data.message.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  try {
    const issue = await createIssue({
      uid: auth.uid,
      email: auth.email,
      displayName: auth.displayName,
      data,
    });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const issues = await listIssuesForUser(auth.uid);
    return NextResponse.json({ issues });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

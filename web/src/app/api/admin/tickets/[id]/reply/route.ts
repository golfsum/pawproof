import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { replyInputSchema, sanitizeText, MAX_MESSAGE_LEN } from "@/lib/support";
import { appendAdminReply } from "@/lib/support-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = replyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const message = sanitizeText(parsed.data.message, MAX_MESSAGE_LEN);
  if (!message.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }
  try {
    const issue = await appendAdminReply(id, message, guard.uid, guard.email);
    return NextResponse.json({ issue });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Could not reply";
    return NextResponse.json({ error: m }, { status: 400 });
  }
}

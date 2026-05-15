import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminNoteInputSchema, sanitizeText, MAX_ADMIN_NOTE_LEN } from "@/lib/support";
import { setAdminNote } from "@/lib/support-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = adminNoteInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const note = sanitizeText(parsed.data.note, MAX_ADMIN_NOTE_LEN);
  try {
    const issue = await setAdminNote(id, note, guard.uid, guard.email);
    return NextResponse.json({ issue });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Could not save note";
    return NextResponse.json({ error: m }, { status: 400 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminStatusInputSchema } from "@/lib/support";
import { setIssueStatus } from "@/lib/support-server";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = adminStatusInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const issue = await setIssueStatus(id, parsed.data.status, guard.uid, guard.email);
    return NextResponse.json({ issue });
  } catch (err) {
    const m = err instanceof Error ? err.message : "Could not update";
    return NextResponse.json({ error: m }, { status: 400 });
  }
}

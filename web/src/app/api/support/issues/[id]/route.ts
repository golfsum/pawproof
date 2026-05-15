import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/admin-auth";
import { getIssueForUser } from "@/lib/support-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const issue = await getIssueForUser(auth.uid, id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ issue });
}

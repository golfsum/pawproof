import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAllIssues } from "@/lib/support-server";
import { ISSUE_STATUSES, type IssueStatus } from "@/lib/support";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status");
  const status =
    statusRaw && (ISSUE_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as IssueStatus)
      : undefined;
  const issues = await listAllIssues({ status, limit: 200 });
  return NextResponse.json({ issues });
}

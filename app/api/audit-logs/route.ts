import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getAuditLogs } from "@/lib/actions/admin-actions";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const action = searchParams.get("action") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  const auditLogs = await getAuditLogs({ startDate, endDate, action, limit });
  return NextResponse.json({ auditLogs });
}

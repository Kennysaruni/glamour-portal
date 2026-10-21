import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getAuditLogs } from "@/lib/actions/admin-actions";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const auditLogs = await getAuditLogs();
  return NextResponse.json({ auditLogs });
}

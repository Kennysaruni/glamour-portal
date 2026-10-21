import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getGlobalActivityFeed } from "@/lib/actions/admin-actions";
import { getCaregiverDashboardData, submitVisitLog } from "@/lib/actions/caregiver-actions";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const notes = await getGlobalActivityFeed();
    return NextResponse.json({ notes });
  } else {
    const data = await getCaregiverDashboardData();
    return NextResponse.json({ notes: data.recentNotes });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await submitVisitLog(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

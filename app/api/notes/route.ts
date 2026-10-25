import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getGlobalActivityFeed } from "@/lib/actions/admin-actions";
import { getCaregiverDashboardData, submitVisitLog, updateVisitLog } from "@/lib/actions/caregiver-actions";

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

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { noteId, ...updateData } = body || {};
    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    const result = await updateVisitLog(noteId, updateData);
    if (!result.success) {
      const is403 = result.error?.includes("403 Forbidden") || result.error?.includes("locked");
      return NextResponse.json({ error: result.error }, { status: is403 ? 403 : 400 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const PATCH = PUT;


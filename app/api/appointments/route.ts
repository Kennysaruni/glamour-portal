import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getAppointmentsList, createAppointment } from "@/lib/actions/admin-actions";
import { getCaregiverAppointments } from "@/lib/actions/caregiver-actions";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const appointments = await getAppointmentsList();
    return NextResponse.json({ appointments });
  } else {
    const appointments = await getCaregiverAppointments();
    return NextResponse.json({ appointments });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await createAppointment(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

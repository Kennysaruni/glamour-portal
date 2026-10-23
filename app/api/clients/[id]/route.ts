import { NextRequest, NextResponse } from "next/server";
import { getClientDetailsAndHistory } from "@/lib/actions/caregiver-actions";
import { getServerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const category = searchParams.get("category") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 100;

  const result = await getClientDetailsAndHistory(id, {
    startDate,
    endDate,
    category,
    limit,
  });

  if (!result.success) {
    if (result.error?.includes("Access Denied")) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    if (result.error?.includes("not found")) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    client: result.client,
    notes: result.notes,
    appointments: result.appointments,
  });
}

"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { NoteCategory, AppointmentStatus, AppointmentType, CareType } from "@/lib/types";

// Helper to normalize ADL tasks
function parseAdlTasks(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw ? [raw] : [];
  }
}

// ============================================================================
// CAREGIVER DASHBOARD DATA (Strict Row-Level Isolation)
// ============================================================================

export async function getCaregiverDashboardData() {
  const session = await requireAuth();
  const userId = session.user.id;

  // 1. Fetch strictly assigned clients
  const assignedClients = await prisma.client.findMany({
    where: {
      assignedEmployeeId: userId,
      isActive: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      _count: {
        select: {
          notes: true,
          appointments: true,
        },
      },
    },
  });

  // 2. Fetch caregiver's schedule (upcoming and past 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      employeeId: userId,
      startTime: { gte: sevenDaysAgo },
    },
    orderBy: { startTime: "asc" },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          emergencyContact: true,
          emergencyPhone: true,
          primaryCareType: true,
        },
      },
    },
  });

  // 3. Fetch recent notes submitted by this caregiver
  const recentNotes = await prisma.clientNote.findMany({
    where: {
      employeeId: userId,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryCareType: true,
        },
      },
    },
  });

  return {
    caregiver: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    clients: assignedClients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().split("T")[0] : null,
      phone: c.phone,
      address: c.address,
      emergencyContact: c.emergencyContact,
      emergencyPhone: c.emergencyPhone,
      primaryCareType: c.primaryCareType as CareType,
      carePlanSummary: c.carePlanSummary,
      notesCount: c._count.notes,
      appointmentsCount: c._count.appointments,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      client: a.client,
      type: a.type as AppointmentType,
      status: a.status as AppointmentStatus,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime ? a.endTime.toISOString() : null,
      location: a.location,
      summary: a.summary,
    })),
    recentNotes: recentNotes.map((n) => ({
      id: n.id,
      clientId: n.clientId,
      client: n.client,
      category: n.category as NoteCategory,
      adlTasksCompleted: parseAdlTasks(n.adlTasksCompleted),
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

// ============================================================================
// SUBMIT VISIT LOG
// ============================================================================

export async function submitVisitLog(data: {
  clientId: string;
  appointmentId?: string;
  category: NoteCategory;
  adlTasksCompleted: string[];
  content: string;
}) {
  const session = await requireAuth();
  const userId = session.user.id;

  // Strict Row-Level Security: Verify client is assigned to this employee (or user is admin)
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    return { success: false, error: "Client not found." };
  }

  if (session.user.role !== "ADMIN" && client.assignedEmployeeId !== userId) {
    return {
      success: false,
      error: "Access Denied: You can only submit notes for clients assigned to you.",
    };
  }

  if (!data.content.trim()) {
    return { success: false, error: "Please enter narrative visit or clinical notes." };
  }

  // Create Client Note
  const note = await prisma.clientNote.create({
    data: {
      clientId: data.clientId,
      employeeId: userId,
      appointmentId: data.appointmentId || null,
      category: data.category,
      adlTasksCompleted: JSON.stringify(data.adlTasksCompleted || []),
      content: data.content.trim(),
    },
  });

  // If this note is tied to an appointment, mark appointment as COMPLETED
  if (data.appointmentId) {
    await prisma.appointment.update({
      where: { id: data.appointmentId },
      data: { status: "COMPLETED" },
    });
  }

  // Create audit trail log
  await prisma.auditLog.create({
    data: {
      userId,
      action: "VISIT_NOTE_SUBMISSION",
      entityType: "ClientNote",
      entityId: note.id,
    },
  });

  revalidatePath("/app");
  revalidatePath("/admin");

  return { success: true, noteId: note.id };
}

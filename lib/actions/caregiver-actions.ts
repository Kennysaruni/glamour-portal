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
// CAREGIVER DATA FETCHERS (Strict Row-Level Isolation)
// ============================================================================

export async function getAssignedClients() {
  const session = await requireAuth();
  const userId = session.user.id;

  const assignedClients = await prisma.client.findMany({
    where: session.user.role === "ADMIN" ? {} : {
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

  return assignedClients.map((c) => ({
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
    isActive: c.isActive,
    assignedEmployeeId: c.assignedEmployeeId,
    notesCount: c._count.notes,
    appointmentsCount: c._count.appointments,
  }));
}

export async function getCaregiverAppointments() {
  const session = await requireAuth();
  const userId = session.user.id;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: session.user.role === "ADMIN" ? {} : {
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

  return appointments.map((a) => ({
    id: a.id,
    clientId: a.clientId,
    client: a.client,
    type: a.type as AppointmentType,
    status: a.status as AppointmentStatus,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime ? a.endTime.toISOString() : null,
    location: a.location,
    summary: a.summary,
  }));
}

export async function getCaregiverNotes() {
  const session = await requireAuth();
  const userId = session.user.id;

  const recentNotes = await prisma.clientNote.findMany({
    where: session.user.role === "ADMIN" ? {} : {
      employeeId: userId,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
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

  return recentNotes.map((n) => ({
    id: n.id,
    clientId: n.clientId,
    client: n.client,
    category: n.category as NoteCategory,
    adlTasksCompleted: parseAdlTasks(n.adlTasksCompleted),
    content: n.content,
    attachmentUrl: n.attachmentUrl,
    attachmentName: n.attachmentName,
    attachmentType: n.attachmentType,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function getCaregiverDashboardData() {
  const session = await requireAuth();
  const [clients, appointments, recentNotes] = await Promise.all([
    getAssignedClients(),
    getCaregiverAppointments(),
    getCaregiverNotes(),
  ]);

  return {
    caregiver: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    clients,
    appointments,
    recentNotes,
  };
}

// ============================================================================
// CLIENT DETAILS & HISTORY (Protected by Role & Row-Level Isolation)
// ============================================================================

export async function getClientDetailsAndHistory(
  clientId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    limit?: number;
  }
) {
  const session = await requireAuth();
  const userId = session.user.id;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      assignedEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!client) {
    return { success: false, error: "Client not found." };
  }

  // Row-Level Access Control: Caregivers may only view clients assigned to them
  if (session.user.role !== "ADMIN" && client.assignedEmployeeId !== userId) {
    return {
      success: false,
      error: "Access Denied: You do not have authorization to view this patient's clinical records.",
    };
  }

  // Fetch bounded notes/summaries for this client with date filtering
  const notesWhere: Record<string, unknown> = { clientId };

  if (options?.startDate || options?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (options.startDate) {
      dateFilter.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    notesWhere.createdAt = dateFilter;
  }

  if (options?.category && options.category !== "ALL") {
    notesWhere.category = options.category;
  }

  const notesTake = Math.min(options?.limit || 100, 250);

  const notes = await prisma.clientNote.findMany({
    where: notesWhere,
    take: notesTake,
    orderBy: { createdAt: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      appointment: {
        select: {
          id: true,
          type: true,
          startTime: true,
        },
      },
    },
  });

  // Fetch all shifts / appointments for this client
  const appointments = await prisma.appointment.findMany({
    where: { clientId },
    orderBy: { startTime: "desc" },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    success: true,
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: client.dateOfBirth ? client.dateOfBirth.toISOString().split("T")[0] : null,
      phone: client.phone,
      address: client.address,
      emergencyContact: client.emergencyContact,
      emergencyPhone: client.emergencyPhone,
      primaryCareType: client.primaryCareType as CareType,
      carePlanSummary: client.carePlanSummary,
      isActive: client.isActive,
      assignedEmployeeId: client.assignedEmployeeId,
      assignedEmployee: client.assignedEmployee,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    },
    notes: notes.map((n) => ({
      id: n.id,
      clientId: n.clientId,
      employeeId: n.employeeId,
      employee: n.employee,
      appointmentId: n.appointmentId,
      appointment: n.appointment
        ? {
            id: n.appointment.id,
            type: n.appointment.type as AppointmentType,
            startTime: n.appointment.startTime.toISOString(),
          }
        : null,
      category: n.category as NoteCategory,
      adlTasksCompleted: parseAdlTasks(n.adlTasksCompleted),
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      attachmentName: n.attachmentName,
      attachmentType: n.attachmentType,
      createdAt: n.createdAt.toISOString(),
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      employeeId: a.employeeId,
      employee: a.employee,
      type: a.type as AppointmentType,
      status: a.status as AppointmentStatus,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime ? a.endTime.toISOString() : null,
      location: a.location,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
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
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
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
      attachmentUrl: data.attachmentUrl || null,
      attachmentName: data.attachmentName || null,
      attachmentType: data.attachmentType || null,
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
  revalidatePath(`/clients/${data.clientId}`);

  return { success: true, noteId: note.id };
}

"use server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { NoteCategory, AppointmentStatus, AppointmentType, CareType, RawClientNoteWithVitals } from "@/lib/types";
import { validateVitals, hasAnyVitals } from "@/lib/vitals-utils";

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

  // Ensure SCHEDULED shifts are FIRST (ascending by upcoming time), then COMPLETED/past shifts (most recent first)
  const scheduled = appointments
    .filter((a) => a.status === "SCHEDULED")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const completed = appointments
    .filter((a) => a.status !== "SCHEDULED")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const sortedAppointments = [...scheduled, ...completed];

  return sortedAppointments.map((a) => ({
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

  return (recentNotes as unknown as RawClientNoteWithVitals[]).map((n) => ({
    id: n.id,
    clientId: n.clientId,
    client: n.client,
    category: n.category as NoteCategory,
    adlTasksCompleted: parseAdlTasks(n.adlTasksCompleted),
    content: n.content,
    attachmentUrl: n.attachmentUrl,
    attachmentName: n.attachmentName,
    attachmentType: n.attachmentType,
    temperature: n.temperature ?? null,
    temperatureUnit: (n.temperatureUnit as "F" | "C") || "F",
    bloodPressureSys: n.bloodPressureSys ?? null,
    bloodPressureDia: n.bloodPressureDia ?? null,
    heartRate: n.heartRate ?? null,
    oxygenSaturation: n.oxygenSaturation ?? null,
    respiratoryRate: n.respiratoryRate ?? null,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
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
    notes: (notes as unknown as RawClientNoteWithVitals[]).map((n) => ({
      id: n.id,
      clientId: n.clientId,
      employeeId: n.employeeId,
      employee: n.employee,
      appointmentId: n.appointmentId,
      appointment: n.appointment
        ? {
            id: n.appointment.id,
            type: n.appointment.type as AppointmentType,
            startTime: n.appointment.startTime instanceof Date ? n.appointment.startTime.toISOString() : String(n.appointment.startTime),
          }
        : null,
      category: n.category as NoteCategory,
      adlTasksCompleted: parseAdlTasks(n.adlTasksCompleted),
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      attachmentName: n.attachmentName,
      attachmentType: n.attachmentType,
      temperature: n.temperature ?? null,
      temperatureUnit: (n.temperatureUnit as "F" | "C") || "F",
      bloodPressureSys: n.bloodPressureSys ?? null,
      bloodPressureDia: n.bloodPressureDia ?? null,
      heartRate: n.heartRate ?? null,
      oxygenSaturation: n.oxygenSaturation ?? null,
      respiratoryRate: n.respiratoryRate ?? null,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
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
  temperature?: number | null;
  temperatureUnit?: "F" | "C";
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
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

  // Server-side structured vitals validation
  const vitalsToCheck = {
    temperature: data.temperature,
    temperatureUnit: data.temperatureUnit,
    bloodPressureSys: data.bloodPressureSys,
    bloodPressureDia: data.bloodPressureDia,
    heartRate: data.heartRate,
    oxygenSaturation: data.oxygenSaturation,
    respiratoryRate: data.respiratoryRate,
  };
  const vitalsValidation = validateVitals(vitalsToCheck);
  if (!vitalsValidation.isValid) {
    const firstErr = Object.values(vitalsValidation.errors)[0];
    return { success: false, error: `Vitals Error: ${firstErr}` };
  }

  const hasVitals = hasAnyVitals(vitalsToCheck);
  const trimmedContent = data.content ? data.content.trim() : "";

  if (!trimmedContent && !hasVitals && !data.attachmentUrl) {
    return {
      success: false,
      error: "Please enter narrative visit notes, record structured vitals, or attach a document.",
    };
  }

  // Format default qualitative content if only vitals were recorded
  let finalContent = trimmedContent;
  if (!finalContent && hasVitals) {
    const parts: string[] = [];
    if (data.temperature) parts.push(`Temp: ${data.temperature}°${data.temperatureUnit || "F"}`);
    if (data.bloodPressureSys && data.bloodPressureDia) parts.push(`BP: ${data.bloodPressureSys}/${data.bloodPressureDia} mmHg`);
    if (data.heartRate) parts.push(`HR: ${data.heartRate} BPM`);
    if (data.oxygenSaturation) parts.push(`SpO2: ${data.oxygenSaturation}%`);
    if (data.respiratoryRate) parts.push(`RR: ${data.respiratoryRate} bpm`);
    finalContent = `Routine Vitals Check recorded (${parts.join(", ")}).`;
  } else if (!finalContent && data.attachmentName) {
    finalContent = `Attached clinical summary document: ${data.attachmentName}`;
  }

  // Create Client Note with Structured Vitals
  const note = await (prisma.clientNote as any).create({
    data: {
      clientId: data.clientId,
      employeeId: userId,
      appointmentId: data.appointmentId || null,
      category: data.category,
      adlTasksCompleted: JSON.stringify(data.adlTasksCompleted || []),
      content: finalContent,
      attachmentUrl: data.attachmentUrl || null,
      attachmentName: data.attachmentName || null,
      attachmentType: data.attachmentType || null,
      temperature: data.temperature !== undefined ? data.temperature : null,
      temperatureUnit: data.temperatureUnit || "F",
      bloodPressureSys: data.bloodPressureSys !== undefined ? data.bloodPressureSys : null,
      bloodPressureDia: data.bloodPressureDia !== undefined ? data.bloodPressureDia : null,
      heartRate: data.heartRate !== undefined ? data.heartRate : null,
      oxygenSaturation: data.oxygenSaturation !== undefined ? data.oxygenSaturation : null,
      respiratoryRate: data.respiratoryRate !== undefined ? data.respiratoryRate : null,
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

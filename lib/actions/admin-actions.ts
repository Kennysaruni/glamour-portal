"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { NoteCategory, CareType, AppointmentStatus, AppointmentType } from "@/lib/types";


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



export async function getStaffList() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          assignedClients: true,
          appointments: true,
          clientNotes: true,
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    assignedClientsCount: u._count.assignedClients,
    appointmentsCount: u._count.appointments,
    notesCount: u._count.clientNotes,
  }));
}

export async function createStaffMember(data: {
  name: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "EMPLOYEE";
  tempPassword: string;
}) {
  const adminSession = await requireAdmin();

  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "A staff member with this email already exists." };
  }

  const hashedPassword = await bcrypt.hash(data.tempPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      emailVerified: true,
      role: data.role,
      phone: data.phone?.trim() || null,
      isActive: true,
      accounts: {
        create: {
          providerId: "credential",
          accountId: email, // will update with id right after or use cuid
          password: hashedPassword,
        },
      },
    },
  });

  // Sync accountId with user.id for Better Auth consistency
  await prisma.account.updateMany({
    where: { userId: newUser.id },
    data: { accountId: newUser.id },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: adminSession.user.id,
      action: "STAFF_CREATION",
      entityType: "User",
      entityId: newUser.id,
    },
  });

  revalidatePath("/admin");
  return { success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  const adminSession = await requireAdmin();

  // Protect Shavonnah / last admin from being deactivated
  if (!isActive && userId === adminSession.user.id) {
    return { success: false, error: "You cannot deactivate your own admin account." };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  if (!isActive) {
    // Immediately revoke all active sessions for this suspended account
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: adminSession.user.id,
      action: isActive ? "STAFF_ACTIVATION" : "STAFF_DEACTIVATION",
      entityType: "User",
      entityId: userId,
    },
  });

  revalidatePath("/admin");
  return { success: true, isActive: updated.isActive };
}

// ============================================================================
// CLIENT DIRECTORY
// ============================================================================

export async function getClientsList() {
  await requireAdmin();

  const clients = await prisma.client.findMany({
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: {
      assignedEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      _count: {
        select: {
          appointments: true,
          notes: true,
        },
      },
    },
  });

  return clients.map((c) => ({
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
    assignedEmployee: c.assignedEmployee,
    createdAt: c.createdAt.toISOString(),
    appointmentsCount: c._count.appointments,
    notesCount: c._count.notes,
  }));
}

export async function createClient(data: {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  primaryCareType: CareType;
  carePlanSummary?: string;
  assignedEmployeeId: string;
}) {
  const adminSession = await requireAdmin();

  const caregiver = await prisma.user.findUnique({
    where: { id: data.assignedEmployeeId },
  });
  if (!caregiver) {
    return { success: false, error: "Assigned caregiver does not exist." };
  }

  const client = await prisma.client.create({
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      emergencyContact: data.emergencyContact?.trim() || null,
      emergencyPhone: data.emergencyPhone?.trim() || null,
      primaryCareType: data.primaryCareType,
      carePlanSummary: data.carePlanSummary?.trim() || null,
      assignedEmployeeId: data.assignedEmployeeId,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminSession.user.id,
      action: "CLIENT_CREATION",
      entityType: "Client",
      entityId: client.id,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/app");
  return { success: true, clientId: client.id };
}

export async function updateClient(
  clientId: string,
  data: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    primaryCareType?: CareType;
    carePlanSummary?: string;
    assignedEmployeeId?: string;
    isActive?: boolean;
  }
) {
  const adminSession = await requireAdmin();

  const updatePayload: Record<string, unknown> = {};
  if (data.firstName !== undefined) updatePayload.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updatePayload.lastName = data.lastName.trim();
  if (data.dateOfBirth !== undefined)
    updatePayload.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
  if (data.address !== undefined) updatePayload.address = data.address?.trim() || null;
  if (data.emergencyContact !== undefined)
    updatePayload.emergencyContact = data.emergencyContact?.trim() || null;
  if (data.emergencyPhone !== undefined)
    updatePayload.emergencyPhone = data.emergencyPhone?.trim() || null;
  if (data.primaryCareType !== undefined)
    updatePayload.primaryCareType = data.primaryCareType;
  if (data.carePlanSummary !== undefined)
    updatePayload.carePlanSummary = data.carePlanSummary?.trim() || null;
  if (data.assignedEmployeeId !== undefined)
    updatePayload.assignedEmployeeId = data.assignedEmployeeId;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  try {
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: updatePayload,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminSession.user.id,
        action: "CLIENT_UPDATE",
        entityType: "Client",
        entityId: clientId,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/app");
    return { success: true as const, client: updated, error: undefined };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update client.";
    return { success: false as const, client: undefined, error: errorMsg };
  }
}

// ============================================================================
// APPOINTMENTS & SHIFTS
// ============================================================================

export async function getAppointmentsList() {
  await requireAdmin();

  const appointments = await prisma.appointment.findMany({
    orderBy: { startTime: "asc" },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          primaryCareType: true,
        },
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return appointments.map((a) => ({
    id: a.id,
    clientId: a.clientId,
    client: a.client,
    employeeId: a.employeeId,
    employee: a.employee,
    type: a.type as AppointmentType,
    status: a.status as AppointmentStatus,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime ? a.endTime.toISOString() : null,
    location: a.location,
    summary: a.summary,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function createAppointment(data: {
  clientId: string;
  employeeId: string;
  type: AppointmentType;
  startTime: string;
  endTime?: string;
  location?: string;
  summary?: string;
}) {
  const adminSession = await requireAdmin();

  try {
    const appt = await prisma.appointment.create({
      data: {
        clientId: data.clientId,
        employeeId: data.employeeId,
        type: data.type,
        status: "SCHEDULED",
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        location: data.location?.trim() || null,
        summary: data.summary?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminSession.user.id,
        action: "APPOINTMENT_SCHEDULED",
        entityType: "Appointment",
        entityId: appt.id,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/app");
    return { success: true as const, appointmentId: appt.id, error: undefined };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to schedule appointment.";
    return { success: false as const, appointmentId: undefined, error: errorMsg };
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus
) {
  const adminSession = await requireAdmin();

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminSession.user.id,
        action: `APPOINTMENT_STATUS_${status}`,
        entityType: "Appointment",
        entityId: appointmentId,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/app");
    return { success: true as const, status: updated.status, error: undefined };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update status.";
    return { success: false as const, status: undefined, error: errorMsg };
  }
}

// ============================================================================
// GLOBAL ACTIVITY FEED (All notes across the company)
// ============================================================================

export async function getGlobalActivityFeed(filters?: {
  caregiverId?: string;
  clientId?: string;
  category?: NoteCategory | "ALL";
  search?: string;
}) {
  await requireAdmin();

  const whereClause: Record<string, unknown> = {};

  if (filters?.caregiverId && filters.caregiverId !== "ALL") {
    whereClause.employeeId = filters.caregiverId;
  }

  if (filters?.clientId && filters.clientId !== "ALL") {
    whereClause.clientId = filters.clientId;
  }

  if (filters?.category && filters.category !== "ALL") {
    whereClause.category = filters.category;
  }

  if (filters?.search && filters.search.trim()) {
    whereClause.content = {
      contains: filters.search.trim(),
    };
  }

  const notes = await prisma.clientNote.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryCareType: true,
          emergencyContact: true,
          emergencyPhone: true,
          address: true,
        },
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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

  return notes.map((n) => ({
    id: n.id,
    clientId: n.clientId,
    client: n.client,
    employeeId: n.employeeId,
    employee: n.employee,
    appointmentId: n.appointmentId,
    appointment: n.appointment
      ? {
        id: n.appointment.id,
        type: n.appointment.type,
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
    updatedAt: n.updatedAt.toISOString(),
  }));
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function getAuditLogs(options?: {
  startDate?: string;
  endDate?: string;
  action?: string;
  limit?: number;
}) {
  await requireAdmin();

  const take = Math.min(options?.limit || 100, 250);
  const where: Record<string, unknown> = {};

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
    where.createdAt = dateFilter;
  }

  if (options?.action && options.action !== "ALL") {
    where.action = options.action;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    userId: l.userId,
    userName: l.user?.name || "System",
    userRole: l.user?.role || "SYSTEM",
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    createdAt: l.createdAt.toISOString(),
  }));
}

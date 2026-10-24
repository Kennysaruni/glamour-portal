// Types and Constants for Glamour Homecare Portal

export const ROLES = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CARE_TYPES = {
  PERSONAL_CARE: "PERSONAL_CARE",
  COMPANION_CARE: "COMPANION_CARE",
  RESPITE_CARE: "RESPITE_CARE",
} as const;

export type CareType = (typeof CARE_TYPES)[keyof typeof CARE_TYPES];

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  PERSONAL_CARE: "Personal Care",
  COMPANION_CARE: "Companion Care",
  RESPITE_CARE: "Respite Care",
};

export const APPOINTMENT_TYPES = {
  HOME_CARE_SHIFT: "HOME_CARE_SHIFT",
  MEDICAL_APPOINTMENT: "MEDICAL_APPOINTMENT",
  HOSPITAL_DISCHARGE: "HOSPITAL_DISCHARGE",
  INITIAL_ASSESSMENT: "INITIAL_ASSESSMENT",
} as const;

export type AppointmentType =
  (typeof APPOINTMENT_TYPES)[keyof typeof APPOINTMENT_TYPES];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  HOME_CARE_SHIFT: "Home Care Shift",
  MEDICAL_APPOINTMENT: "Medical Appointment",
  HOSPITAL_DISCHARGE: "Hospital Discharge",
  INITIAL_ASSESSMENT: "Initial Assessment",
};

export const APPOINTMENT_STATUSES = {
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUSES)[keyof typeof APPOINTMENT_STATUSES];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export const NOTE_CATEGORIES = {
  DAILY_CARE_LOG: "DAILY_CARE_LOG",
  MEDICATION_REMINDER: "MEDICATION_REMINDER",
  VITALS_CHECK: "VITALS_CHECK",
  DISCHARGE_SUMMARY: "DISCHARGE_SUMMARY",
  INCIDENT_REPORT: "INCIDENT_REPORT",
} as const;

export type NoteCategory =
  (typeof NOTE_CATEGORIES)[keyof typeof NOTE_CATEGORIES];

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  DAILY_CARE_LOG: "Daily Care Log",
  MEDICATION_REMINDER: "Medication Reminder",
  VITALS_CHECK: "Vitals Check",
  DISCHARGE_SUMMARY: "Discharge Summary",
  INCIDENT_REPORT: "Incident Report",
};

// Standard ADL Checklist Tasks defined in PRD Section 5
export const ADL_TASKS = [
  "Bathing",
  "Grooming",
  "Dressing",
  "Meal Prep",
  "Medication Reminder",
  "Housekeeping",
] as const;

export type AdlTask = (typeof ADL_TASKS)[number];

export interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  primaryCareType: CareType | string;
  carePlanSummary?: string | null;
  isActive: boolean;
  assignedEmployeeId: string;
  assignedEmployee?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ClientNoteData {
  id: string;
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    primaryCareType: string;
    emergencyContact?: string | null;
    emergencyPhone?: string | null;
    address?: string | null;
  };
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  appointmentId?: string | null;
  appointment?: {
    id: string;
    startTime: Date | string;
    type: string;
  } | null;
  category: NoteCategory | string;
  adlTasksCompleted: string[];
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  temperature?: number | null;
  temperatureUnit?: "F" | "C" | string | null;
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface RawClientNoteWithVitals {
  id: string;
  clientId: string;
  client?: any;
  employeeId: string;
  employee?: any;
  appointmentId?: string | null;
  appointment?: any;
  category: string;
  adlTasksCompleted?: string | string[] | null;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  temperature?: number | null;
  temperatureUnit?: string | null;
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface AppointmentData {
  id: string;
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    address?: string | null;
  };
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  type: AppointmentType | string;
  status: AppointmentStatus | string;
  startTime: Date | string;
  endTime?: Date | string | null;
  location?: string | null;
  summary?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role | string;
  phone?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  assignedClientsCount?: number;
}

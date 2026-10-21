"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  FileText,
  Calendar,
  Printer,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  HeartPulse,
  Plus,
  Phone,
  MapPin,
  Shield,
  Activity,
  CheckSquare,
  ClipboardList,
  Edit,
  X,
  ExternalLink,
} from "lucide-react";
import {
  createStaffMember,
  toggleStaffStatus,
  createClient,
  updateClient,
  createAppointment,
  updateAppointmentStatus,
} from "@/lib/actions/admin-actions";
import {
  CARE_TYPES,
  CARE_TYPE_LABELS,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  CareType,
  NoteCategory,
  AppointmentType,
  AppointmentStatus,
  ADL_TASKS,
} from "@/lib/types";

interface AdminDashboardClientProps {
  initialStaff: any[];
  initialClients: any[];
  initialAppointments: any[];
  initialNotes: any[];
  initialAuditLogs: any[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminDashboardClient({
  initialStaff,
  initialClients,
  initialAppointments,
  initialNotes,
  initialAuditLogs,
  currentUser,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<
    "activity" | "clients" | "staff" | "appointments" | "audit"
  >("activity");

  const [staffList, setStaffList] = useState(initialStaff);
  const [clientsList, setClientsList] = useState(initialClients);
  const [appointmentsList, setAppointmentsList] = useState(initialAppointments);
  const [notesList, setNotesList] = useState(initialNotes);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);

  // Filters for Global Activity Feed
  const [selectedCaregiverFilter, setSelectedCaregiverFilter] = useState("ALL");
  const [selectedClientFilter, setSelectedClientFilter] = useState("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelectedNote, setPrintSelectedNote] = useState<any | null>(null);

  // Form states
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
    tempPassword: "",
  });

  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    primaryCareType: "PERSONAL_CARE" as CareType,
    carePlanSummary: "",
    assignedEmployeeId: initialStaff[0]?.id || "",
  });

  const [appointmentForm, setAppointmentForm] = useState({
    clientId: initialClients[0]?.id || "",
    employeeId: initialStaff[0]?.id || "",
    type: "HOME_CARE_SHIFT" as AppointmentType,
    startTime: "",
    endTime: "",
    location: "",
    summary: "",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtered notes calculation
  const filteredNotes = notesList.filter((note) => {
    if (selectedCaregiverFilter !== "ALL" && note.employeeId !== selectedCaregiverFilter) {
      return false;
    }
    if (selectedClientFilter !== "ALL" && note.clientId !== selectedClientFilter) {
      return false;
    }
    if (selectedCategoryFilter !== "ALL" && note.category !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const contentMatch = note.content.toLowerCase().includes(q);
      const clientName = `${note.client?.firstName} ${note.client?.lastName}`.toLowerCase();
      const caregiverName = note.employee?.name.toLowerCase() || "";
      if (!contentMatch && !clientName.includes(q) && !caregiverName.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Action: Create Staff Member
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!staffForm.name || !staffForm.email || !staffForm.tempPassword) {
      setFormError("Name, work email, and temporary password are required.");
      return;
    }

    startTransition(async () => {
      const res = await createStaffMember(staffForm);
      if (res.success) {
        setIsStaffModalOpen(false);
        setStaffForm({
          name: "",
          email: "",
          phone: "",
          role: "EMPLOYEE",
          tempPassword: "",
        });
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to create staff member.");
      }
    });
  };

  // Action: Toggle Staff Active
  const handleToggleStaff = (userId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleStaffStatus(userId, !currentStatus);
      if (res.success) {
        setStaffList((prev) =>
          prev.map((s) => (s.id === userId ? { ...s, isActive: !currentStatus } : s))
        );
      } else {
        alert(res.error || "Could not change status.");
      }
    });
  };

  // Action: Create Client
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientForm.firstName || !clientForm.lastName || !clientForm.assignedEmployeeId) {
      setFormError("Client first name, last name, and assigned caregiver are required.");
      return;
    }

    startTransition(async () => {
      const res = await createClient(clientForm);
      if (res.success) {
        setIsClientModalOpen(false);
        setClientForm({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          phone: "",
          address: "",
          emergencyContact: "",
          emergencyPhone: "",
          primaryCareType: "PERSONAL_CARE",
          carePlanSummary: "",
          assignedEmployeeId: staffList[0]?.id || "",
        });
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to create client.");
      }
    });
  };

  // Action: Open Edit Client
  const openEditClient = (client: any) => {
    setClientToEdit(client);
    setIsEditClientModalOpen(true);
    setFormError(null);
  };

  // Action: Save Edit Client
  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;

    startTransition(async () => {
      const res = await updateClient(clientToEdit.id, {
        firstName: clientToEdit.firstName,
        lastName: clientToEdit.lastName,
        dateOfBirth: clientToEdit.dateOfBirth,
        phone: clientToEdit.phone,
        address: clientToEdit.address,
        emergencyContact: clientToEdit.emergencyContact,
        emergencyPhone: clientToEdit.emergencyPhone,
        primaryCareType: clientToEdit.primaryCareType,
        carePlanSummary: clientToEdit.carePlanSummary,
        assignedEmployeeId: clientToEdit.assignedEmployeeId,
        isActive: clientToEdit.isActive,
      });

      if (res.success) {
        setIsEditClientModalOpen(false);
        window.location.reload();
      } else {
        setFormError((res as { error?: string }).error || "Failed to update client.");
      }
    });
  };

  // Action: Schedule Shift / Appointment
  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!appointmentForm.clientId || !appointmentForm.employeeId || !appointmentForm.startTime) {
      setFormError("Client, caregiver, and shift start time are required.");
      return;
    }

    startTransition(async () => {
      const res = await createAppointment(appointmentForm);
      if (res.success) {
        setIsAppointmentModalOpen(false);
        setAppointmentForm({
          clientId: clientsList[0]?.id || "",
          employeeId: staffList[0]?.id || "",
          type: "HOME_CARE_SHIFT",
          startTime: "",
          endTime: "",
          location: "",
          summary: "",
        });
        window.location.reload();
      } else {
        setFormError((res as { error?: string }).error || "Failed to schedule appointment.");
      }
    });
  };

  // Action: Update Appointment Status
  const handleUpdateStatus = (apptId: string, status: AppointmentStatus) => {
    startTransition(async () => {
      const res = await updateAppointmentStatus(apptId, status);
      if (res.success) {
        setAppointmentsList((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status } : a))
        );
      }
    });
  };

  // Action: Trigger browser native print
  const handleTriggerPrint = (note?: any) => {
    if (note) {
      setPrintSelectedNote(note);
    }
    setIsPrintModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {/* Top Banner & Header Summary */}
      <div className="bg-white border-b border-pink-200/70 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">
                  <Shield className="w-3.5 h-3.5" /> RN Admin
                </span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 mt-1">
                Clinical Oversight & Administration
              </h1>
            </div>

            {/* Quick Action Buttons - 2x2 Grid on Mobile, Flex on Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="inline-flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Client
              </button>
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="inline-flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-2 rounded-md bg-white border border-pink-300 text-pink-700 hover:bg-pink-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add Caregiver
              </button>
              <button
                onClick={() => setIsAppointmentModalOpen(true)}
                className="inline-flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-2 rounded-md bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-zinc-500" /> Schedule Shift
              </button>
              <button
                onClick={() => handleTriggerPrint()}
                className="inline-flex justify-center items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-2 rounded-md bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Summary
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
              <div className="text-zinc-500 text-xs font-medium">Active Clients</div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                {clientsList.filter((c) => c.isActive).length}
              </div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5 truncate">
                Enrolled Patients
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
              <div className="text-zinc-500 text-xs font-medium">Active Caregivers</div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                {staffList.filter((s) => s.isActive && s.role === "EMPLOYEE").length}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {staffList.filter((s) => s.role === "ADMIN").length} RN Admin
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
              <div className="text-zinc-500 text-xs font-medium">Visit Notes</div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                {notesList.length}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {notesList.filter((n) => n.category === "DISCHARGE_SUMMARY").length} Discharges
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3">
              <div className="text-zinc-500 text-xs font-medium">Scheduled Shifts</div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-0.5">
                {appointmentsList.filter((a) => a.status === "SCHEDULED").length}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 truncate">Upcoming visits</div>
            </div>
          </div>

          {/* Primary Navigation Tabs - Horizontally Scrollable on Mobile */}
          <div className="flex border-b border-zinc-200 mt-5 space-x-3 sm:space-x-6 overflow-x-auto whitespace-nowrap pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "activity"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <FileText className="w-4 h-4" /> Activity Feed
              <span className="bg-pink-100 text-pink-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {filteredNotes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "clients"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <Users className="w-4 h-4" /> Client Directory
              <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {clientsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("staff")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "staff"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Staff Management
              <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {staffList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("appointments")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "appointments"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <Calendar className="w-4 h-4" /> Shifts & Visits
              <span className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
                {appointmentsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === "audit"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              <Activity className="w-4 h-4" /> Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ================================================================= */}
        {/* TAB 1: GLOBAL ACTIVITY FEED                                      */}
        {/* ================================================================= */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-pink-200/80 rounded-lg p-4 shadow-2xs no-print">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-pink-600" /> Filters:
                  </span>

                  {/* Filter: Category */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="text-xs bg-zinc-50 border border-zinc-300 rounded-md py-1.5 px-2.5 text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="ALL">All Categories</option>
                    {Object.entries(NOTE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={val}>
                        {NOTE_CATEGORY_LABELS[val as NoteCategory]}
                      </option>
                    ))}
                  </select>

                  {/* Filter: Caregiver */}
                  <select
                    value={selectedCaregiverFilter}
                    onChange={(e) => setSelectedCaregiverFilter(e.target.value)}
                    className="text-xs bg-zinc-50 border border-zinc-300 rounded-md py-1.5 px-2.5 text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="ALL">All Caregivers</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>

                  {/* Filter: Client */}
                  <select
                    value={selectedClientFilter}
                    onChange={(e) => setSelectedClientFilter(e.target.value)}
                    className="text-xs bg-zinc-50 border border-zinc-300 rounded-md py-1.5 px-2.5 text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="ALL">All Clients</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search clinical narratives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-zinc-300 rounded-md bg-zinc-50 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-lg p-10 text-center">
                <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-800">No visit notes found</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Try adjusting your category or caregiver filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => {
                  const isDischarge = note.category === "DISCHARGE_SUMMARY";
                  return (
                    <div
                      key={note.id}
                      className={`bg-white rounded-lg border shadow-2xs transition-all ${
                        isDischarge
                          ? "border-pink-300 bg-linear-to-r from-pink-50/30 to-white"
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                isDischarge
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-pink-100 text-pink-800 border border-pink-200"
                              }`}
                            >
                              {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                            </span>
                            <span className="text-xs font-bold text-zinc-900">
                              {note.client?.firstName} {note.client?.lastName}
                            </span>
                            <span className="text-xs text-zinc-400">•</span>
                            <span className="text-xs text-zinc-600 font-medium">
                              {note.employee?.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>
                              {new Date(note.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}{" "}
                              at{" "}
                              {new Date(note.createdAt).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <button
                              onClick={() => handleTriggerPrint(note)}
                              title="Print this specific note"
                              className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition-colors"
                            >
                              <Printer className="w-3 h-3 text-zinc-500" /> Print
                            </button>
                          </div>
                        </div>

                        {/* ADL Checklist Badges */}
                        {note.adlTasksCompleted && note.adlTasksCompleted.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <CheckSquare className="w-3.5 h-3.5 text-pink-600" /> ADLs Completed:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {note.adlTasksCompleted.map((task: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                                >
                                  {task}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Narrative Content */}
                        <div className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-50/70 p-3 rounded-md border border-zinc-200/70">
                          {note.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: CLIENT DIRECTORY                                          */}
        {/* ================================================================= */}
        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                  Client Directory
                </h2>
              </div>
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Client
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientsList.map((client) => (
                <div
                  key={client.id}
                  className={`bg-white rounded-lg border p-5 shadow-2xs relative ${
                    client.isActive ? "border-zinc-200" : "border-zinc-200 bg-zinc-50 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            client.primaryCareType === "PERSONAL_CARE"
                              ? "bg-pink-100 text-pink-800 border border-pink-200"
                              : client.primaryCareType === "RESPITE_CARE"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {CARE_TYPE_LABELS[client.primaryCareType as CareType] ||
                            client.primaryCareType}
                        </span>
                        {!client.isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                            Inactive
                          </span>
                        )}
                      </div>

                      {client.dateOfBirth && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          DOB: {client.dateOfBirth}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditClient(client)}
                      className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                      title="Edit Client"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-600">
                    {client.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span>{client.address}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.emergencyContact && (
                      <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50/70 p-2 rounded border border-rose-100 mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span className="font-medium">
                          Emergency: {client.emergencyContact}{" "}
                          {client.emergencyPhone && `(${client.emergencyPhone})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {client.carePlanSummary && (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Care Plan
                      </div>
                      <p className="text-xs text-zinc-700 mt-1 leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200/60">
                        {client.carePlanSummary}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Caregiver:</span>
                      <span className="font-semibold text-pink-700">
                        {client.assignedEmployee?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {client.notesCount || 0} Notes • {client.appointmentsCount || 0} Shifts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: STAFF MANAGEMENT                                          */}
        {/* ================================================================= */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                  Caregivers & Staff
                </h2>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Provision New Staff
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="min-w-[620px] divide-y divide-zinc-200 text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Assigned Clients</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-pink-100 text-pink-800 font-bold flex items-center justify-center text-xs">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div>{staff.name}</div>
                            <div className="text-[11px] text-zinc-400 font-normal">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            staff.role === "ADMIN"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                          }`}
                        >
                          {staff.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zinc-600">
                        {staff.phone || <span className="text-zinc-400">N/A</span>}
                      </td>

                      <td className="px-4 py-3 font-medium text-zinc-700">
                        {staff.assignedClientsCount || 0} Patients
                      </td>

                      <td className="px-4 py-3">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-400 font-semibold text-xs">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {staff.id !== currentUser.id && (
                          <button
                            onClick={() => handleToggleStaff(staff.id, staff.isActive)}
                            disabled={isPending}
                            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                              staff.isActive
                                ? "text-rose-700 hover:bg-rose-50 border border-rose-200"
                                : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                            }`}
                          >
                            {staff.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: SHIFTS & APPOINTMENTS                                     */}
        {/* ================================================================= */}
        {activeTab === "appointments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                  Scheduled Shifts
                </h2>
              </div>
              <button
                onClick={() => setIsAppointmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" /> Schedule New Shift
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="min-w-[680px] divide-y divide-zinc-200 text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Scheduled Time</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Caregiver</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {appointmentsList.map((appt) => (
                    <tr key={appt.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        <div>
                          {new Date(appt.startTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-normal">
                          {new Date(appt.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {appt.endTime &&
                            ` - ${new Date(appt.endTime).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {appt.client?.firstName} {appt.client?.lastName}
                      </td>

                      <td className="px-4 py-3 text-pink-700 font-medium">
                        {appt.employee?.name}
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {APPOINTMENT_TYPE_LABELS[appt.type as AppointmentType] || appt.type}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">
                        {appt.location || "Client residence"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            appt.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : appt.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {APPOINTMENT_STATUS_LABELS[appt.status as AppointmentStatus] ||
                            appt.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {appt.status === "SCHEDULED" && (
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(appt.id, "COMPLETED")}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-semibold"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appt.id, "CANCELLED")}
                              className="px-2 py-1 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: AUDIT LOGS                                                */}
        {/* ================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Audit Trail
              </h2>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="min-w-[600px] divide-y divide-zinc-200 text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Entity ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/70">
                      <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-sans font-medium text-zinc-900">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="px-4 py-2.5 text-pink-700 font-bold">{log.action}</td>
                      <td className="px-4 py-2.5 text-zinc-600">{log.entityType}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{log.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL 1: ADD STAFF MEMBER                                          */}
      {/* =================================================================== */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-pink-200 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Provision Staff Account</h3>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Martha Jenkins"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@glamourhomecare.org"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(540) 555-0100"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, role: e.target.value as "ADMIN" | "EMPLOYEE" })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2 focus:ring-1 focus:ring-pink-500 bg-white"
                >
                  <option value="EMPLOYEE">Caregiver (Employee - Restricted Row Isolation)</option>
                  <option value="ADMIN">RN Administrator (Full Agency Access)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Temporary Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={staffForm.tempPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, tempPassword: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2 focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: ADD NEW CLIENT                                            */}
      {/* =================================================================== */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-pink-200 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsClientModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Add New Client (Patient)</h3>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor"
                    value={clientForm.firstName}
                    onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance"
                    value={clientForm.lastName}
                    onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={clientForm.dateOfBirth}
                    onChange={(e) => setClientForm({ ...clientForm, dateOfBirth: e.target.value })}
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Client Phone</label>
                  <input
                    type="tel"
                    placeholder="(540) 555-0123"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Residence Address (Fredericksburg, VA)
                </label>
                <input
                  type="text"
                  placeholder="Street, City, VA Zip"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Vance (Daughter)"
                    value={clientForm.emergencyContact}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, emergencyContact: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="(540) 555-8821"
                    value={clientForm.emergencyPhone}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, emergencyPhone: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Primary Care Type
                  </label>
                  <select
                    value={clientForm.primaryCareType}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        primaryCareType: e.target.value as CareType,
                      })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                  >
                    {Object.entries(CARE_TYPES).map(([k, v]) => (
                      <option key={k} value={v}>
                        {CARE_TYPE_LABELS[v as CareType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Assign to Caregiver
                  </label>
                  <select
                    value={clientForm.assignedEmployeeId}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, assignedEmployeeId: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Care Plan & Clinical Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Daily requirements, mobility assistance, low sodium diet, medication schedule..."
                  value={clientForm.carePlanSummary}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, carePlanSummary: e.target.value })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-3 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: EDIT CLIENT                                               */}
      {/* =================================================================== */}
      {isEditClientModalOpen && clientToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-pink-200 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditClientModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">
                Edit Client: {clientToEdit.firstName} {clientToEdit.lastName}
              </h3>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditClient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={clientToEdit.firstName}
                    onChange={(e) =>
                      setClientToEdit({ ...clientToEdit, firstName: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={clientToEdit.lastName}
                    onChange={(e) =>
                      setClientToEdit({ ...clientToEdit, lastName: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Address</label>
                <input
                  type="text"
                  value={clientToEdit.address || ""}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, address: e.target.value })}
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Care Type</label>
                  <select
                    value={clientToEdit.primaryCareType}
                    onChange={(e) =>
                      setClientToEdit({
                        ...clientToEdit,
                        primaryCareType: e.target.value as CareType,
                      })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                  >
                    {Object.entries(CARE_TYPES).map(([k, v]) => (
                      <option key={k} value={v}>
                        {CARE_TYPE_LABELS[v as CareType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Assigned Caregiver
                  </label>
                  <select
                    value={clientToEdit.assignedEmployeeId}
                    onChange={(e) =>
                      setClientToEdit({
                        ...clientToEdit,
                        assignedEmployeeId: e.target.value,
                      })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Care Plan Summary</label>
                <textarea
                  rows={3}
                  value={clientToEdit.carePlanSummary || ""}
                  onChange={(e) =>
                    setClientToEdit({
                      ...clientToEdit,
                      carePlanSummary: e.target.value,
                    })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="clientIsActive"
                  checked={clientToEdit.isActive}
                  onChange={(e) =>
                    setClientToEdit({ ...clientToEdit, isActive: e.target.checked })
                  }
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="clientIsActive" className="font-semibold text-zinc-700">
                  Client is currently active and receiving care
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="px-3 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: SCHEDULE SHIFT / APPOINTMENT                              */}
      {/* =================================================================== */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-pink-200 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAppointmentModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Schedule Caregiver Shift</h3>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Select Client</label>
                <select
                  value={appointmentForm.clientId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = clientsList.find((x) => x.id === cid);
                    setAppointmentForm({
                      ...appointmentForm,
                      clientId: cid,
                      employeeId: c?.assignedEmployeeId || appointmentForm.employeeId,
                      location: c?.address || "",
                    });
                  }}
                  className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                >
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.address || "Fredericksburg, VA"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Assign Caregiver</label>
                <select
                  value={appointmentForm.employeeId}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, employeeId: e.target.value })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Visit / Shift Type</label>
                <select
                  value={appointmentForm.type}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      type: e.target.value as AppointmentType,
                    })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2 bg-white"
                >
                  {Object.entries(APPOINTMENT_TYPES).map(([k, v]) => (
                    <option key={k} value={v}>
                      {APPOINTMENT_TYPE_LABELS[v as AppointmentType]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={appointmentForm.startTime}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, startTime: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={appointmentForm.endTime}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, endTime: e.target.value })
                    }
                    className="w-full border border-zinc-300 rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 Washington Ave, Fredericksburg, VA"
                  value={appointmentForm.location}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, location: e.target.value })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Visit Objectives & Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Bathing assistance, meal prep, hospital discharge review..."
                  value={appointmentForm.summary}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, summary: e.target.value })
                  }
                  className="w-full border border-zinc-300 rounded px-3 py-2"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAppointmentModalOpen(false)}
                  className="px-3 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isPending ? "Scheduling..." : "Schedule Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRINTABLE REPORT VIEW (Native window.print with @media print)      */}
      {/* =================================================================== */}
      <div id="print-section" className="hidden print:block print:p-8 bg-white">
        <div className="border-b-2 border-pink-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                GLAMOUR HOMECARE, LLC
              </h1>
              <p className="text-xs text-zinc-600">
                Nurse-Owned Non-Skilled Home Care Agency • Fredericksburg, VA
              </p>
              <p className="text-xs text-zinc-500">Phone: (540) 555-0199 • HIPAA Compliant Clinical Summary</p>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p className="font-semibold text-zinc-900">
                Report Date: {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
              </p>
              <p>Generated by: {currentUser.name}</p>
            </div>
          </div>
        </div>

        <h2 className="text-base font-bold text-zinc-900 mb-4 uppercase tracking-wider border-b border-zinc-200 pb-1">
          {printSelectedNote
            ? `CLINICAL REPORT: ${NOTE_CATEGORY_LABELS[printSelectedNote.category as NoteCategory] || printSelectedNote.category}`
            : "AGENCY CLINICAL ACTIVITY & DISCHARGE SUMMARY REPORT"}
        </h2>

        {/* Notes to Print */}
        <div className="space-y-6">
          {(printSelectedNote ? [printSelectedNote] : filteredNotes).map((note, index) => (
            <div
              key={note.id || index}
              className="border border-zinc-300 rounded p-4 break-inside-avoid"
            >
              <div className="flex justify-between items-baseline border-b border-zinc-200 pb-2 mb-2">
                <div>
                  <span className="font-bold text-sm text-zinc-900">
                    Patient: {note.client?.firstName} {note.client?.lastName}
                  </span>
                  <span className="text-xs text-zinc-500 ml-2">
                    (Care Type: {CARE_TYPE_LABELS[note.client?.primaryCareType as CareType] || note.client?.primaryCareType})
                  </span>
                </div>
                <div className="text-xs text-zinc-600">
                  Caregiver: <span className="font-semibold">{note.employee?.name}</span> •{" "}
                  {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="text-xs font-semibold text-pink-700 uppercase mb-2">
                Category: {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
              </div>

              {note.adlTasksCompleted && note.adlTasksCompleted.length > 0 && (
                <div className="text-xs text-zinc-700 mb-2">
                  <span className="font-semibold">ADL Tasks Completed: </span>
                  {note.adlTasksCompleted.join(", ")}
                </div>
              )}

              <div className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed mt-2 pt-2 border-t border-zinc-100 font-sans">
                {note.content}
              </div>
            </div>
          ))}
        </div>

        {/* Agency Sign-Off Block */}
        <div className="mt-12 pt-6 border-t-2 border-zinc-300 grid grid-cols-2 gap-8 text-xs text-zinc-700 break-inside-avoid">
          <div>
            <div className="border-b border-zinc-400 h-8 mb-1"></div>
            <p className="font-semibold">Attending Registered Nurse (RN Owner) Signature</p>
            <p className="text-[10px] text-zinc-500">Shavonnah, RN • License # VA-RN-772104</p>
          </div>
          <div>
            <div className="border-b border-zinc-400 h-8 mb-1"></div>
            <p className="font-semibold">Assigned Caregiver Verification</p>
            <p className="text-[10px] text-zinc-500">Glamour Homecare, LLC Clinical Records</p>
          </div>
        </div>
      </div>
    </div>
  );
}

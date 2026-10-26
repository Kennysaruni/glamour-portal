"use client";

import React, { useState, useTransition, useRef, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  FileText,
  Search,
  Filter,
  CheckCircle,
  CheckCircle2,
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
  Image as ImageIcon,
  RotateCcw,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { getDocumentUrl, calculateAge } from "@/lib/document-utils";
import { VitalsBadges } from "@/components/vitals/VitalsDisplay";
import {
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
  createClient,
  updateClient,
} from "@/lib/actions/admin-actions";
import {
  CARE_TYPES,
  CARE_TYPE_LABELS,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  CareType,
  NoteCategory,
  ADL_TASKS,
} from "@/lib/types";

interface AdminDashboardClientProps {
  initialStaff: any[];
  initialClients: any[];
  initialAppointments?: any[];
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
    "activity" | "clients" | "staff" | "audit"
  >("activity");

  const [staffList, setStaffList] = useState(initialStaff);
  const [clientsList, setClientsList] = useState(initialClients);
  const [notesList, setNotesList] = useState(initialNotes);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);

  // Filters for Audit Log Trail
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [isFetchingAuditLogs, setIsFetchingAuditLogs] = useState(false);

  const handleApplyAuditFilters = async (overrideParams?: {
    startDate?: string;
    endDate?: string;
    action?: string;
  }) => {
    setIsFetchingAuditLogs(true);
    try {
      const start = overrideParams?.startDate !== undefined ? overrideParams.startDate : auditStartDate;
      const end = overrideParams?.endDate !== undefined ? overrideParams.endDate : auditEndDate;
      const act = overrideParams?.action !== undefined ? overrideParams.action : auditActionFilter;

      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      if (act && act !== "ALL") params.set("action", act);
      params.set("limit", "100");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.auditLogs) {
          setAuditLogs(data.auditLogs);
        }
      }
    } catch (e) {
      console.error("Failed to fetch audit logs:", e);
    } finally {
      setIsFetchingAuditLogs(false);
    }
  };

  const setAuditPreset = (days: number | "all") => {
    if (days === "all") {
      setAuditStartDate("");
      setAuditEndDate("");
      handleApplyAuditFilters({ startDate: "", endDate: "" });
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setAuditStartDate(startStr);
    setAuditEndDate(endStr);
    handleApplyAuditFilters({ startDate: startStr, endDate: endStr });
  };

  const filteredAuditLogs = auditLogs.filter((log: any) => {
    if (!auditSearchQuery.trim()) return true;
    const q = auditSearchQuery.toLowerCase();
    return (
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      (log.userRole && log.userRole.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.entityType && log.entityType.toLowerCase().includes(q)) ||
      (log.entityId && log.entityId.toLowerCase().includes(q))
    );
  });

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

  // Search state for Client Directory & Staff Management
  const [clientDirectorySearch, setClientDirectorySearch] = useState("");
  const [staffDirectorySearch, setStaffDirectorySearch] = useState("");

  // Suggestive search for provisioning new staff
  const [staffClientSearchQuery, setStaffClientSearchQuery] = useState("");
  const [isStaffClientDropdownOpen, setIsStaffClientDropdownOpen] = useState(false);



  // Form states
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "EMPLOYEE" as "ADMIN" | "EMPLOYEE",
    tempPassword: "",
    assignedClientIds: [] as string[],
  });

  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "ADMIN" | "EMPLOYEE";
    assignedClientIds: string[];
  } | null>(null);
  const [editStaffSearchQuery, setEditStaffSearchQuery] = useState("");
  const [isEditStaffDropdownOpen, setIsEditStaffDropdownOpen] = useState(false);

  const staffClientDropdownRef = useRef<HTMLDivElement>(null);
  const editStaffDropdownRef = useRef<HTMLDivElement>(null);

  // Filter for unassigned clients (clients with no assigned employee, or assigned to an ADMIN agency pool)
  const unassignedClients = useMemo(() => {
    return clientsList.filter((client) => {
      if (!client.assignedEmployeeId) return true;
      const assignedStaff = staffList.find((s) => s.id === client.assignedEmployeeId);
      if (assignedStaff) {
        return String(assignedStaff.role).toUpperCase() !== "EMPLOYEE";
      }
      const role = String((client.assignedEmployee as any)?.role || "").toUpperCase();
      return role !== "EMPLOYEE";
    });
  }, [clientsList, staffList]);

  // Click-outside and Escape key dismissal for staff client assignment dropdowns
  useEffect(() => {
    if (!isStaffClientDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        staffClientDropdownRef.current &&
        !staffClientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStaffClientDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsStaffClientDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStaffClientDropdownOpen]);

  useEffect(() => {
    if (!isEditStaffDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        editStaffDropdownRef.current &&
        !editStaffDropdownRef.current.contains(e.target as Node)
      ) {
        setIsEditStaffDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEditStaffDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditStaffDropdownOpen]);

  const filteredClientDirectory = clientsList.filter((client) => {
    if (!clientDirectorySearch.trim()) return true;
    const q = clientDirectorySearch.toLowerCase();
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const address = (client.address || "").toLowerCase();
    const phone = (client.phone || "").toLowerCase();
    const caregiver = (client.assignedEmployee?.name || "").toLowerCase();
    const careType = (client.primaryCareType || "").toLowerCase();
    return (
      fullName.includes(q) ||
      address.includes(q) ||
      phone.includes(q) ||
      caregiver.includes(q) ||
      careType.includes(q)
    );
  });

  const filteredStaffDirectory = staffList.filter((staff) => {
    if (!staffDirectorySearch.trim()) return true;
    const q = staffDirectorySearch.toLowerCase();
    const name = (staff.name || "").toLowerCase();
    const email = (staff.email || "").toLowerCase();
    const phone = (staff.phone || "").toLowerCase();
    const role = (staff.role || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
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
          assignedClientIds: [],
        });
        setStaffClientSearchQuery("");
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

  // Action: Open Edit Staff
  const openEditStaff = (staff: any) => {
    setStaffToEdit({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      phone: staff.phone || "",
      role: staff.role || "EMPLOYEE",
      assignedClientIds:
        staff.assignedClientIds || staff.assignedClients?.map((c: any) => c.id) || [],
    });
    setEditStaffSearchQuery("");
    setIsEditStaffDropdownOpen(false);
    setIsEditStaffModalOpen(true);
    setFormError(null);
  };

  // Action: Save Edit Staff
  const handleSaveEditStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToEdit) return;

    startTransition(async () => {
      const res = await updateStaffMember(staffToEdit.id, {
        name: staffToEdit.name,
        email: staffToEdit.email,
        phone: staffToEdit.phone,
        role: staffToEdit.role,
        assignedClientIds: staffToEdit.assignedClientIds,
      });

      if (res.success) {
        setIsEditStaffModalOpen(false);
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to update staff member.");
      }
    });
  };



  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Banner & Header Summary */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Clinical Oversight & Administration
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Agency operations, staff provisioning, client care plans, and HIPAA compliance audit trail.
              </p>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-500 text-xs font-medium">Active Clients</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                {clientsList.filter((c) => c.isActive).length}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                Enrolled Patients
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-500 text-xs font-medium">Active Caregivers</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                {staffList.filter((s) => s.isActive && s.role === "EMPLOYEE").length}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                {staffList.filter((s) => s.role === "ADMIN").length} RN Admin
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs">
              <div className="text-slate-500 text-xs font-medium">Visit Notes</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
                {notesList.length}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                {notesList.filter((n) => n.category === "DISCHARGE_SUMMARY").length} Discharges
              </div>
            </div>
          </div>

          {/* Primary Navigation Tabs - Horizontally Scrollable on Mobile */}
          <div className="flex border-b border-slate-200 mt-6 space-x-3 sm:space-x-6 overflow-x-auto whitespace-nowrap pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === "activity"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <FileText className="w-4 h-4" /> Activity Feed
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-0.5">
                {filteredNotes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === "clients"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Users className="w-4 h-4" /> Client Directory
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-0.5">
                {clientsList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("staff")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === "staff"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Staff Management
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-0.5">
                {staffList.length}
              </span>
            </button>



            <button
              onClick={() => setActiveTab("audit")}
              className={`pb-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === "audit"
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
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
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs no-print">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-slate-500" /> Filters:
                  </span>

                  {/* Filter: Category */}
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="DAILY_CARE_LOG">Daily Care Log</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="INCIDENT_REPORT">Incident Report</option>
                  </select>

                  {/* Filter: Caregiver */}
                  <select
                    value={selectedCaregiverFilter}
                    onChange={(e) => setSelectedCaregiverFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
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
                    className="text-xs bg-white border border-slate-200 rounded-lg py-2 px-3 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search clinical narratives..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-500 text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Notes List */}
            {filteredNotes.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-xs">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No visit notes found</h3>
                <p className="text-xs text-slate-500 mt-1">
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
                      className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                note.category === "INCIDENT_REPORT"
                                  ? "bg-amber-50 text-amber-800 border border-amber-300"
                                  : isDischarge
                                  ? "bg-pink-50 text-pink-700 border border-pink-200/60"
                                  : "bg-slate-100 text-slate-700 border border-slate-200/60"
                              }`}
                            >
                              {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {note.client?.firstName} {note.client?.lastName}
                            </span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-600 font-medium">
                              {note.employee?.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                          </div>
                        </div>

                        {/* ADL Checklist Badges */}
                        {note.adlTasksCompleted && note.adlTasksCompleted.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <CheckSquare className="w-3.5 h-3.5 text-slate-500" /> ADLs Completed:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {note.adlTasksCompleted.map((task: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80"
                                >
                                  {task}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Structured Vitals Badges */}
                        <VitalsBadges vitals={note} size="sm" />

                        {/* Narrative Content */}
                        <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 mt-2">
                          {note.content}
                        </div>

                        {/* Attached Summary (PDF or PNG) */}
                        {note.attachmentUrl && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {note.attachmentType === "pdf" ? (
                                <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-900 text-xs truncate">
                                  {note.attachmentName || "Attached Summary Document"}
                                </div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                  {note.attachmentType === "pdf" ? "PDF Document" : "Clinical Image"}
                                </div>
                              </div>
                            </div>
                            <a
                              href={getDocumentUrl(note.attachmentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors shrink-0 w-full sm:w-auto"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>View / Download</span>
                            </a>
                          </div>
                        )}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Client Directory
                </h2>
                <p className="text-xs text-slate-500">All registered patients and clinical care assignments.</p>
              </div>
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" /> Add New Client
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, address, phone, or assigned caregiver..."
                  value={clientDirectorySearch}
                  onChange={(e) => setClientDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 text-slate-800 placeholder-slate-400"
                />
                {clientDirectorySearch && (
                  <button
                    onClick={() => setClientDirectorySearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shrink-0 text-center sm:text-left">
                Showing {filteredClientDirectory.length} of {clientsList.length} clients
              </span>
            </div>

            {filteredClientDirectory.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No clients found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {clientDirectorySearch
                    ? `No patient matches "${clientDirectorySearch}". Try another search term.`
                    : "No registered clients."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClientDirectory.map((client) => (
                  <div
                    key={client.id}
                    className={`bg-white rounded-xl border p-5 shadow-xs relative transition-all ${
                      client.isActive ? "border-slate-200/80 hover:border-slate-300" : "border-slate-200/50 bg-slate-50/50 opacity-75"
                    }`}
                  >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            client.primaryCareType === "PERSONAL_CARE"
                              ? "bg-pink-50 text-pink-700 border border-pink-200/60"
                              : "bg-slate-100 text-slate-700 border border-slate-200/60"
                          }`}
                        >
                          {CARE_TYPE_LABELS[client.primaryCareType as CareType] ||
                            client.primaryCareType}
                        </span>
                        {!client.isActive && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>

                      {client.dateOfBirth && (() => {
                        const age = calculateAge(client.dateOfBirth);
                        return (
                          <p className="text-xs text-slate-500 mt-0.5">
                            DOB: <span className="font-medium text-slate-700">{client.dateOfBirth}</span>
                            {age !== null && (
                              <span className="ml-1.5 font-semibold text-slate-600">
                                (Age {age})
                              </span>
                            )}
                          </p>
                        );
                      })()}
                    </div>

                    <button
                      onClick={() => openEditClient(client)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Client"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {client.address && (
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{client.address}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.emergencyContact && (
                      <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50/70 p-2.5 rounded-lg border border-rose-100 mt-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span className="font-medium">
                          Emergency: {client.emergencyContact}{" "}
                          {client.emergencyPhone && `(${client.emergencyPhone})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {client.carePlanSummary && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Care Plan
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg border border-slate-200/60">
                        {client.carePlanSummary}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Caregiver:</span>
                      <span className="font-semibold text-slate-800">
                        {client.assignedEmployee?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {client.notesCount || 0} Notes
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                    <a
                      href={`/clients/${client.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Full Profile & History</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: STAFF MANAGEMENT                                          */}
        {/* ================================================================= */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Caregivers & Staff
                </h2>
                <p className="text-xs text-slate-500">Manage caregiver credentials, roles, and client caseloads.</p>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" /> Provision New Staff
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, work email, phone, or role..."
                  value={staffDirectorySearch}
                  onChange={(e) => setStaffDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-pink-500 text-slate-800 placeholder-slate-400"
                />
                {staffDirectorySearch && (
                  <button
                    onClick={() => setStaffDirectorySearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1.5 rounded-lg shrink-0 text-center sm:text-left">
                Showing {filteredStaffDirectory.length} of {staffList.length} staff
              </span>
            </div>

            {filteredStaffDirectory.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No staff members found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {staffDirectorySearch
                    ? `No staff matches "${staffDirectorySearch}". Try another name, email, or role.`
                    : "No staff members registered."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block bg-white border border-slate-200/80 rounded-xl overflow-x-auto shadow-xs">
                  <table className="min-w-[620px] w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Staff Member</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Assigned Clients</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffDirectory.map((staff) => (
                        <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {staff.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-slate-900 font-semibold">{staff.name}</div>
                                <div className="text-[11px] text-slate-400 font-normal">
                                  {staff.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                staff.role === "ADMIN"
                                  ? "bg-pink-50 text-pink-700 border border-pink-200/60"
                                  : "bg-slate-100 text-slate-700 border border-slate-200/60"
                              }`}
                            >
                              {staff.role}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            {staff.phone || <span className="text-slate-400">N/A</span>}
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-700">
                            {staff.assignedClientsCount || 0} Patients
                          </td>

                          <td className="px-4 py-3">
                            {staff.isActive ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                                <CheckCircle className="w-3.5 h-3.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-xs">
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditStaff(staff)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Staff Member"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {staff.id !== currentUser.id && (
                                <button
                                  onClick={() => handleToggleStaff(staff.id, staff.isActive)}
                                  disabled={isPending}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                    staff.isActive
                                      ? "text-rose-700 hover:bg-rose-50 border border-rose-200/70"
                                      : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70"
                                  }`}
                                >
                                  {staff.isActive ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {filteredStaffDirectory.map((staff) => (
                    <div key={staff.id} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {staff.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-slate-900 font-semibold">{staff.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{staff.email}</div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            staff.role === "ADMIN"
                              ? "bg-pink-50 text-pink-700 border border-pink-200/60"
                              : "bg-slate-100 text-slate-700 border border-slate-200/60"
                          }`}
                        >
                          {staff.role}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Phone</span>
                          <span className="font-medium text-slate-800">{staff.phone || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Assigned Clients</span>
                          <span className="font-medium text-slate-800">{staff.assignedClientsCount || 0} Patients</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-xs">
                            Suspended
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditStaff(staff)}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3 h-3 text-slate-500" /> Edit
                          </button>
                          {staff.id !== currentUser.id && (
                            <button
                              onClick={() => handleToggleStaff(staff.id, staff.isActive)}
                              disabled={isPending}
                              className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                staff.isActive
                                  ? "text-rose-700 hover:bg-rose-50 border border-rose-200/70"
                                  : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200/70"
                              }`}
                            >
                              {staff.isActive ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}



        {/* ================================================================= */}
        {/* TAB 5: AUDIT LOGS                                                */}
        {/* ================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Immutable HIPAA compliance log of staff access and clinical changes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md">
                  Showing {filteredAuditLogs.length} logs (max 100/fetch)
                </span>
                <button
                  onClick={() => handleApplyAuditFilters()}
                  disabled={isFetchingAuditLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 shadow-2xs cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetchingAuditLogs ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
              {/* Presets and Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 mr-1">Date Range:</span>
                  {[
                    { label: "Today", days: 0 },
                    { label: "7 Days", days: 7 },
                    { label: "30 Days", days: 30 },
                    { label: "All Time", days: "all" as const },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setAuditPreset(preset.days)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Reset button */}
                {(auditStartDate || auditEndDate || auditActionFilter !== "ALL" || auditSearchQuery) && (
                  <button
                    onClick={() => {
                      setAuditStartDate("");
                      setAuditEndDate("");
                      setAuditActionFilter("ALL");
                      setAuditSearchQuery("");
                      handleApplyAuditFilters({ startDate: "", endDate: "", action: "ALL" });
                    }}
                    className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Filters
                  </button>
                )}
              </div>

              {/* Input Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Action Type</label>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="LOGOUT">LOGOUT</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                    <option value="VIEW_PHI">VIEW_PHI</option>
                    <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Search Loaded Logs</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="User, role, ID..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleApplyAuditFilters()}
                  disabled={isFetchingAuditLogs}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{isFetchingAuditLogs ? "Applying..." : "Apply Date & Action Filters"}</span>
                </button>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block bg-white border border-slate-200/80 rounded-xl overflow-x-auto shadow-xs">
              <table className="min-w-[680px] w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity Type</th>
                    <th className="px-4 py-3">Entity ID</th>
                    <th className="px-4 py-3">Changes / Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                        No audit logs matched the specified date range and action filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-900">
                          {log.userName} ({log.userRole})
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200/60 uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-sans">{log.entityType}</td>
                        <td className="px-4 py-2.5 text-slate-400 truncate max-w-xs">{log.entityId}</td>
                        <td className="px-4 py-2.5 font-sans">
                          {log.details ? (() => {
                            try {
                              const parsed = JSON.parse(log.details);
                              const keys = Object.keys(parsed);
                              if (keys.length === 0) return <span className="text-slate-400 italic text-[10px]">No modified fields</span>;
                              return (
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {keys.map((k) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                                      title={`${k}: ${JSON.stringify(parsed[k]?.from)} → ${JSON.stringify(parsed[k]?.to)}`}
                                    >
                                      <span className="font-semibold">{k}:</span>
                                      <span className="text-slate-400 truncate max-w-[60px]">{String(parsed[k]?.from ?? "none")}</span>
                                      <span>→</span>
                                      <span className="text-emerald-700 font-medium truncate max-w-[60px]">{String(parsed[k]?.to ?? "none")}</span>
                                    </span>
                                  ))}
                                </div>
                              );
                            } catch {
                              return <span className="text-slate-500 font-mono text-[10px] truncate max-w-xs block">{log.details}</span>;
                            }
                          })() : (
                            <span className="text-slate-400 italic text-[10px]">Initial creation</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="sm:hidden space-y-2.5">
              {filteredAuditLogs.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center text-xs text-slate-500">
                  No audit logs matched the specified filters.
                </div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {log.userName} <span className="text-[10px] text-slate-500 font-normal">({log.userRole})</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200/60 uppercase shrink-0">
                        {log.action}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Entity: <strong className="text-slate-700 font-medium">{log.entityType}</strong></span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {log.entityId && (
                      <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono truncate">
                        ID: {log.entityId}
                      </div>
                    )}
                    {log.details && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Changes / Diff
                        </span>
                        {(() => {
                          try {
                            const parsed = JSON.parse(log.details);
                            const keys = Object.keys(parsed);
                            if (keys.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1">
                                {keys.map((k) => (
                                  <span
                                    key={k}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                                  >
                                    <span className="font-semibold">{k}:</span>
                                    <span className="text-slate-400 truncate max-w-[60px]">{String(parsed[k]?.from ?? "none")}</span>
                                    <span>→</span>
                                    <span className="text-emerald-700 font-medium truncate max-w-[60px]">{String(parsed[k]?.to ?? "none")}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          } catch {
                            return <div className="text-[10px] text-slate-500 font-mono">{log.details}</div>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MODAL 1: ADD STAFF MEMBER                                          */}
      {/* =================================================================== */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Provision Staff Account</h3>
                <p className="text-xs text-slate-500">Create new caregiver or administrator credentials</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Martha Jenkins"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="name@glamourhomecare.org"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(540) 555-0100"
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, role: e.target.value as "ADMIN" | "EMPLOYEE" })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                >
                  <option value="EMPLOYEE">Caregiver (Employee - Restricted Row Isolation)</option>
                  <option value="ADMIN">RN Administrator (Full Agency Access)</option>
                </select>
              </div>

              {/* Suggestive Search for Assigning Initial Clients */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Assign Patients / Clients (Optional)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {staffForm.assignedClientIds.length} selected
                  </span>
                </div>

                {/* Selected Clients Chips */}
                {staffForm.assignedClientIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {staffForm.assignedClientIds.map((cid) => {
                      const client = clientsList.find((c) => c.id === cid);
                      if (!client) return null;
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <span className="font-semibold">{client.firstName} {client.lastName}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setStaffForm({
                                ...staffForm,
                                assignedClientIds: staffForm.assignedClientIds.filter((id) => id !== cid),
                              })
                            }
                            className="text-slate-400 hover:text-rose-600 rounded-full cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search Input with Autocomplete Suggestions */}
                <div ref={staffClientDropdownRef} className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      disabled={unassignedClients.length === 0}
                      placeholder={
                        unassignedClients.length === 0
                          ? "All clients are currently assigned (Optional)"
                          : "Type patient name or care type to suggest..."
                      }
                      value={staffClientSearchQuery}
                      onChange={(e) => {
                        setStaffClientSearchQuery(e.target.value);
                        if (!isStaffClientDropdownOpen) setIsStaffClientDropdownOpen(true);
                      }}
                      onClick={() => {
                        if (unassignedClients.length > 0) {
                          setIsStaffClientDropdownOpen((prev) => !prev);
                        }
                      }}
                      className={`w-full border rounded-lg pl-9 pr-16 py-2.5 text-xs transition-all ${
                        unassignedClients.length === 0
                          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed placeholder:text-slate-400"
                          : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                      }`}
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      {staffForm.assignedClientIds.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffForm({ ...staffForm, assignedClientIds: [] });
                            setStaffClientSearchQuery("");
                            setIsStaffClientDropdownOpen(false);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Clear assignment (Leave unassigned)"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : staffClientSearchQuery ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStaffClientSearchQuery("");
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={unassignedClients.length === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (unassignedClients.length > 0) {
                            setIsStaffClientDropdownOpen((prev) => !prev);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Toggle unassigned clients list"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            isStaffClientDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {unassignedClients.length === 0 ? (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-md px-2.5 py-1.5 mt-1.5">
                      All clients are currently assigned (Optional)
                    </p>
                  ) : null}

                  {/* Suggestion Dropdown */}
                  {isStaffClientDropdownOpen && unassignedClients.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {/* Clear / Leave Unassigned option */}
                      <button
                        type="button"
                        onClick={() => {
                          setStaffForm({ ...staffForm, assignedClientIds: [] });
                          setStaffClientSearchQuery("");
                          setIsStaffClientDropdownOpen(false);
                        }}
                        className="w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer text-xs text-slate-600 font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </div>
                          <span>None / Leave Unassigned</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Clear selection</span>
                      </button>

                      {unassignedClients
                        .filter((c) => {
                          const matchesQuery =
                            !staffClientSearchQuery.trim() ||
                            `${c.firstName} ${c.lastName}`.toLowerCase().includes(staffClientSearchQuery.toLowerCase()) ||
                            (c.address && c.address.toLowerCase().includes(staffClientSearchQuery.toLowerCase())) ||
                            (c.primaryCareType && c.primaryCareType.toLowerCase().includes(staffClientSearchQuery.toLowerCase()));
                          const notAlreadySelected = !staffForm.assignedClientIds.includes(c.id);
                          return matchesQuery && notAlreadySelected;
                        })
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setStaffForm({
                                ...staffForm,
                                assignedClientIds: [...staffForm.assignedClientIds, c.id],
                              });
                              setStaffClientSearchQuery("");
                              setIsStaffClientDropdownOpen(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {c.firstName[0]}{c.lastName[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">
                                  {c.firstName} {c.lastName}
                                </div>
                                <div className="text-[10px] text-emerald-600 font-medium truncate">
                                  Unassigned Patient • {c.address || "Fredericksburg, VA"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {CARE_TYPE_LABELS[c.primaryCareType as CareType] || c.primaryCareType}
                            </span>
                          </button>
                        ))}
                      {unassignedClients.filter(
                        (c) =>
                          (!staffClientSearchQuery.trim() ||
                            `${c.firstName} ${c.lastName}`.toLowerCase().includes(staffClientSearchQuery.toLowerCase())) &&
                          !staffForm.assignedClientIds.includes(c.id)
                      ).length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {staffClientSearchQuery ? "No matching unassigned clients found." : "All available unassigned clients selected."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Temporary Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={staffForm.tempPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, tempPassword: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1B: EDIT STAFF MEMBER                                         */}
      {/* =================================================================== */}
      {isEditStaffModalOpen && staffToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditStaffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Edit Staff Member</h3>
                <p className="text-xs text-slate-500">Update caregiver details, roles, and assigned clients</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditStaff} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffToEdit.name}
                  onChange={(e) => setStaffToEdit({ ...staffToEdit, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Work Email</label>
                <input
                  type="email"
                  required
                  value={staffToEdit.email}
                  onChange={(e) => setStaffToEdit({ ...staffToEdit, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="(540) 555-0100"
                  value={staffToEdit.phone}
                  onChange={(e) => setStaffToEdit({ ...staffToEdit, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
                <select
                  value={staffToEdit.role}
                  onChange={(e) =>
                    setStaffToEdit({ ...staffToEdit, role: e.target.value as "ADMIN" | "EMPLOYEE" })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                >
                  <option value="EMPLOYEE">Caregiver (Employee - Restricted Row Isolation)</option>
                  <option value="ADMIN">RN Administrator (Full Agency Access)</option>
                </select>
              </div>

              {/* Assign Clients */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Assigned Patients / Clients
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {staffToEdit.assignedClientIds.length} selected
                  </span>
                </div>

                {/* Selected Clients Chips */}
                {staffToEdit.assignedClientIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {staffToEdit.assignedClientIds.map((cid) => {
                      const client = clientsList.find((c) => c.id === cid);
                      if (!client) return null;
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <span className="font-semibold">{client.firstName} {client.lastName}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setStaffToEdit({
                                ...staffToEdit,
                                assignedClientIds: staffToEdit.assignedClientIds.filter((id) => id !== cid),
                              })
                            }
                            className="text-slate-400 hover:text-pink-600 rounded-full cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search Input with Autocomplete Suggestions */}
                <div ref={editStaffDropdownRef} className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Type patient name or care type to suggest..."
                      value={editStaffSearchQuery}
                      onChange={(e) => {
                        setEditStaffSearchQuery(e.target.value);
                        setIsEditStaffDropdownOpen(true);
                      }}
                      onFocus={() => setIsEditStaffDropdownOpen(true)}
                      className="w-full border border-slate-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                    />
                  </div>

                  {isEditStaffDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100">
                      <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Suggested Patients
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditStaffDropdownOpen(false)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                      {clientsList
                        .filter(
                          (c) =>
                            (!editStaffSearchQuery.trim() ||
                              `${c.firstName} ${c.lastName}`.toLowerCase().includes(editStaffSearchQuery.toLowerCase())) &&
                            !staffToEdit.assignedClientIds.includes(c.id)
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setStaffToEdit({
                                ...staffToEdit,
                                assignedClientIds: [...staffToEdit.assignedClientIds, c.id],
                              });
                              setEditStaffSearchQuery("");
                              setIsEditStaffDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-pink-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600" />
                              <div>
                                <div className="font-semibold text-slate-800 group-hover:text-pink-900">
                                  {c.firstName} {c.lastName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {c.address || "Fredericksburg, VA"}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {CARE_TYPE_LABELS[c.primaryCareType as CareType] || c.primaryCareType}
                            </span>
                          </button>
                        ))}
                      {clientsList.filter(
                        (c) =>
                          (!editStaffSearchQuery.trim() ||
                            `${c.firstName} ${c.lastName}`.toLowerCase().includes(editStaffSearchQuery.toLowerCase())) &&
                          !staffToEdit.assignedClientIds.includes(c.id)
                      ).length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {editStaffSearchQuery ? "No matching clients found." : "All clients already selected."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditStaffModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving..." : "Save Changes"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsClientModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Add New Client (Patient)</h3>
                <p className="text-xs text-slate-500">Create client profile and assign care supervisor</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor"
                    value={clientForm.firstName}
                    onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vance"
                    value={clientForm.lastName}
                    onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={clientForm.dateOfBirth}
                    onChange={(e) => setClientForm({ ...clientForm, dateOfBirth: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Client Phone</label>
                  <input
                    type="tel"
                    placeholder="(540) 555-0123"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Residence Address (Fredericksburg, VA)
                </label>
                <input
                  type="text"
                  placeholder="Street, City, VA Zip"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Vance (Daughter)"
                    value={clientForm.emergencyContact}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, emergencyContact: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="(540) 555-8821"
                    value={clientForm.emergencyPhone}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, emergencyPhone: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  >
                    {Object.entries(CARE_TYPES).map(([k, v]) => (
                      <option key={k} value={v}>
                        {CARE_TYPE_LABELS[v as CareType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Assign to Caregiver
                  </label>
                  <select
                    value={clientForm.assignedEmployeeId}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, assignedEmployeeId: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
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
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Care Plan & Clinical Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Daily requirements, mobility assistance, low sodium diet, medication schedule..."
                  value={clientForm.carePlanSummary}
                  onChange={(e) =>
                    setClientForm({ ...clientForm, carePlanSummary: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditClientModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Edit Client: {clientToEdit.firstName} {clientToEdit.lastName}
                </h3>
                <p className="text-xs text-slate-500">Update medical care plan, status, and assignment</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEditClient} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={clientToEdit.firstName}
                    onChange={(e) =>
                      setClientToEdit({ ...clientToEdit, firstName: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={clientToEdit.lastName}
                    onChange={(e) =>
                      setClientToEdit({ ...clientToEdit, lastName: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={clientToEdit.address || ""}
                  onChange={(e) => setClientToEdit({ ...clientToEdit, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Care Type</label>
                  <select
                    value={clientToEdit.primaryCareType}
                    onChange={(e) =>
                      setClientToEdit({
                        ...clientToEdit,
                        primaryCareType: e.target.value as CareType,
                      })
                    }
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                  >
                    {Object.entries(CARE_TYPES).map(([k, v]) => (
                      <option key={k} value={v}>
                        {CARE_TYPE_LABELS[v as CareType]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
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
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
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
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Care Plan Summary</label>
                <textarea
                  rows={3}
                  value={clientToEdit.carePlanSummary || ""}
                  onChange={(e) =>
                    setClientToEdit({
                      ...clientToEdit,
                      carePlanSummary: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="clientIsActive"
                  checked={clientToEdit.isActive}
                  onChange={(e) =>
                    setClientToEdit({ ...clientToEdit, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300 text-pink-600 focus:ring-pink-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="clientIsActive" className="text-xs font-medium text-slate-700">
                  Client is currently active and receiving care
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

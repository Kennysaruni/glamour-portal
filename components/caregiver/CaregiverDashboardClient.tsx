"use client";

import React, { useState, useTransition } from "react";
import {
  Calendar,
  Users,
  ClipboardList,
  CheckSquare,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Heart,
  Sparkles,
  Upload,
  X,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { submitVisitLog } from "@/lib/actions/caregiver-actions";
import {
  ADL_TASKS,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  CARE_TYPE_LABELS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  CareType,
  NoteCategory,
  AppointmentType,
  AppointmentStatus,
} from "@/lib/types";

interface CaregiverDashboardClientProps {
  initialData: {
    caregiver: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    clients: any[];
    appointments: any[];
    recentNotes: any[];
  };
}

export function CaregiverDashboardClient({
  initialData,
}: CaregiverDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"schedule" | "clients" | "log" | "history">("schedule");

  const { caregiver, clients, appointments, recentNotes } = initialData;

  // Visit Log Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>("DAILY_CARE_LOG");
  const [selectedAdlTasks, setSelectedAdlTasks] = useState<string[]>([]);
  const [narrativeContent, setNarrativeContent] = useState<string>("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formStatus, setFormStatus] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isPng = mime === "image/png" || file.name.toLowerCase().endsWith(".png");

    if (!isPdf && !isPng) {
      alert("Only PDF documents and PNG images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 15MB.");
      e.target.value = "";
      return;
    }

    setAttachedFile(file);
  };

  // Helper: Toggle ADL task on/off (optimized for mobile touch)
  const toggleAdlTask = (taskName: string) => {
    setSelectedAdlTasks((prev) =>
      prev.includes(taskName) ? prev.filter((t) => t !== taskName) : [...prev, taskName]
    );
  };

  // Quick action: pre-fill form for a scheduled appointment
  const handleLogShiftVisit = (appt: any) => {
    setSelectedClientId(appt.clientId);
    setSelectedAppointmentId(appt.id);
    setSelectedCategory(
      appt.type === "HOSPITAL_DISCHARGE" ? "DISCHARGE_SUMMARY" : "DAILY_CARE_LOG"
    );
    setActiveTab("log");
    setFormStatus(null);
  };

  // Submit Visit Log Action
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    if (!selectedClientId) {
      setFormStatus({ error: "Please select an assigned client." });
      return;
    }

    if (!narrativeContent.trim() && !attachedFile) {
      setFormStatus({ error: "Please enter narrative visit notes or upload a PDF/PNG summary." });
      return;
    }

    startTransition(async () => {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      let attachmentType: string | undefined;

      if (attachedFile) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", attachedFile);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.success) {
            setFormStatus({ error: uploadData.error || "File upload failed." });
            setIsUploading(false);
            return;
          }
          attachmentUrl = uploadData.url;
          attachmentName = uploadData.originalName;
          attachmentType = uploadData.fileType;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload error";
          setFormStatus({ error: msg });
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const res = await submitVisitLog({
        clientId: selectedClientId,
        appointmentId: selectedAppointmentId || undefined,
        category: selectedCategory,
        adlTasksCompleted: selectedAdlTasks,
        content: narrativeContent || (attachedFile ? `Attached summary: ${attachedFile.name}` : ""),
        attachmentUrl,
        attachmentName,
        attachmentType,
      });

      if (res.success) {
        setFormStatus({ success: true });
        setNarrativeContent("");
        setSelectedAdlTasks([]);
        setSelectedAppointmentId("");
        setAttachedFile(null);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setFormStatus({ error: res.error || "Failed to submit visit log." });
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Top Mobile Caregiver Header */}
      <div className="bg-white border-b border-pink-200/70 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900 leading-tight">
                Welcome, {caregiver.name}
              </h1>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-pink-100 text-pink-800 border border-pink-200">
                {clients.length} Assigned Clients
              </span>
            </div>
          </div>

          {/* Mobile Bottom-Bar / Sub-Tabs Navigation */}
          <div className="grid grid-cols-4 gap-1.5 mt-4 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-2 text-xs font-semibold rounded-md transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "schedule"
                  ? "bg-white text-pink-700 shadow-2xs font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Calendar className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Schedule</span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`py-2 text-xs font-semibold rounded-md transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "clients"
                  ? "bg-white text-pink-700 shadow-2xs font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Users className="w-4 h-4 text-pink-600 shrink-0" />
              <span>My Clients</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("log");
                setFormStatus(null);
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "log"
                  ? "bg-pink-600 text-white shadow-xs font-bold"
                  : "text-pink-700 hover:text-pink-900"
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0" />
              <span>Log Visit</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`py-2 text-xs font-semibold rounded-md transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-pink-700 shadow-2xs font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <ClipboardList className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Past Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* ================================================================= */}
        {/* VIEW 1: MY SCHEDULE                                              */}
        {/* ================================================================= */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Upcoming Shifts
              </h2>
              <span className="text-xs text-zinc-500">
                {appointments.filter((a) => a.status === "SCHEDULED").length} Upcoming
              </span>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center">
                <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700">No shifts scheduled</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your supervisor will post upcoming visits to your calendar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => {
                  const isScheduled = appt.status === "SCHEDULED";
                  const isDischarge = appt.type === "HOSPITAL_DISCHARGE";
                  return (
                    <div
                      key={appt.id}
                      className={`bg-white border rounded-lg p-4 shadow-2xs transition-all ${
                        isScheduled
                          ? "border-pink-300 ring-1 ring-pink-100"
                          : "border-zinc-200 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isDischarge
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-pink-100 text-pink-800 border border-pink-200"
                              }`}
                            >
                              {APPOINTMENT_TYPE_LABELS[appt.type as AppointmentType] || appt.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                appt.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {APPOINTMENT_STATUS_LABELS[appt.status as AppointmentStatus] ||
                                appt.status}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-zinc-900 mt-1.5">
                            {appt.client?.firstName} {appt.client?.lastName}
                          </h3>

                          <div className="text-xs text-zinc-600 font-medium mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {new Date(appt.startTime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              •{" "}
                              {new Date(appt.startTime).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {appt.endTime &&
                                ` - ${new Date(appt.endTime).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}`}
                            </span>
                          </div>

                          {appt.location && (
                            <div className="text-xs text-zinc-500 mt-1 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appt.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-700 hover:underline"
                              >
                                {appt.location}
                              </a>
                            </div>
                          )}
                        </div>

                        {isScheduled && (
                          <button
                            onClick={() => handleLogShiftVisit(appt)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                          >
                            <span>Log Visit</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {appt.summary && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 text-xs text-zinc-700 bg-zinc-50/70 p-2 rounded">
                          <span className="font-semibold text-zinc-500">Visit Summary: </span>
                          {appt.summary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: MY CLIENTS (Row-Level Isolation)                         */}
        {/* ================================================================= */}
        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                My Patients
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white border border-pink-200/80 rounded-lg p-4 sm:p-5 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-zinc-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-800 border border-pink-200 uppercase tracking-wider">
                          {CARE_TYPE_LABELS[client.primaryCareType as CareType] ||
                            client.primaryCareType}
                        </span>
                      </div>
                      {client.dateOfBirth && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Date of Birth: {client.dateOfBirth}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <a
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" /> Full History
                      </a>
                      <button
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setActiveTab("log");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-pink-300 text-pink-700 hover:bg-pink-50 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Start Visit Note
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-700">
                    <div>
                      <span className="text-zinc-500 font-medium block">Residence:</span>
                      <div className="flex items-center gap-1 text-zinc-900 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address || "Fredericksburg, VA")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-700 font-semibold hover:underline"
                        >
                          {client.address || "Fredericksburg, VA"}
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-zinc-500 font-medium block">Emergency Contact:</span>
                      <div className="flex items-center gap-1 text-rose-700 font-semibold mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <a
                          href={client.emergencyPhone ? `tel:${client.emergencyPhone}` : "#"}
                          className="hover:underline"
                        >
                          {client.emergencyContact || "Emergency Contact"}{" "}
                          {client.emergencyPhone && `(${client.emergencyPhone})`}
                        </a>
                      </div>
                    </div>
                  </div>

                  {client.carePlanSummary && (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                        Active Care Plan:
                      </span>
                      <p className="text-xs text-zinc-800 bg-zinc-50 p-2.5 rounded border border-zinc-200/60 leading-relaxed">
                        {client.carePlanSummary}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: LOG VISIT FORM (Touch-Optimized ADL Grid)                 */}
        {/* ================================================================= */}
        {activeTab === "log" && (
          <div className="bg-white border border-pink-200/80 rounded-xl p-5 sm:p-7 shadow-xs">
            <div className="border-b border-zinc-200 pb-3 mb-5">
              <h2 className="text-lg font-bold text-zinc-900">
                Log Care Visit
              </h2>
            </div>

            {formStatus?.success && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Visit log successfully recorded and synced to agency administration!</span>
              </div>
            )}

            {formStatus?.error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{formStatus.error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitVisit} className="space-y-5">
              {/* Select Client */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Patient *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full text-base sm:text-xs font-medium border border-zinc-300 rounded-lg py-3 sm:py-2.5 px-3 bg-zinc-50 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.primaryCareType})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Category */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(NOTE_CATEGORIES).map(([key, val]) => {
                    const isSelected = selectedCategory === val;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedCategory(val as NoteCategory)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-pink-600 text-white border-pink-600 shadow-2xs"
                            : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                        }`}
                      >
                        {NOTE_CATEGORY_LABELS[val as NoteCategory]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ADL Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    ADL Tasks Completed
                  </label>
                  <span className="text-[11px] text-pink-600 font-semibold">
                    {selectedAdlTasks.length} Selected
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ADL_TASKS.map((task) => {
                    const isChecked = selectedAdlTasks.includes(task);
                    return (
                      <button
                        key={task}
                        type="button"
                        onClick={() => toggleAdlTask(task)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none active:scale-98 ${
                          isChecked
                            ? "bg-pink-50/90 border-pink-400 text-pink-900 shadow-2xs"
                            : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{task}</span>
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-pink-600 border-pink-600 text-white"
                              : "border-zinc-300 bg-zinc-50"
                          }`}
                        >
                          {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Box (PDF or PNG) */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Attach Summary Document (PDF or PNG)
                </label>
                <div className="border-2 border-dashed border-pink-200 rounded-lg p-4 bg-pink-50/30 text-center hover:bg-pink-50/60 transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.png,application/pdf,image/png"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-pink-600 mx-auto mb-1.5" />
                  <div className="text-xs font-semibold text-zinc-800">
                    {attachedFile ? attachedFile.name : "Tap to upload PDF summary or PNG photo"}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Accepted: PDF (.pdf) or PNG (.png) • Max 15MB
                  </div>

                  {attachedFile && (
                    <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-pink-200 rounded text-xs text-pink-800 font-medium">
                      <span>{(attachedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFile(null);
                        }}
                        className="text-zinc-400 hover:text-zinc-600 ml-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visit Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1.5">
                  Visit Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter visit notes, vitals, or clinical observations..."
                  value={narrativeContent}
                  onChange={(e) => setNarrativeContent(e.target.value)}
                  className="w-full text-base sm:text-xs font-normal border border-zinc-300 rounded-lg p-3 bg-zinc-50 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 placeholder-zinc-400 leading-relaxed font-sans"
                />
              </div>

              {/* Step 5: Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending || isUploading}
                  className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isUploading ? (
                    <span>Uploading Summary Document...</span>
                  ) : isPending ? (
                    <span>Submitting Visit Record...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Visit Log</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 4: PAST LOGS HISTORY                                        */}
        {/* ================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
                Visit History
              </h2>
              <span className="text-xs text-zinc-500">
                {recentNotes.length} Notes
              </span>
            </div>

            {recentNotes.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center">
                <ClipboardList className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700">No logs submitted yet</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Use the "Log Visit" tab to record your first patient visit notes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-zinc-200 rounded-lg p-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-pink-100 text-pink-800 border border-pink-200">
                          {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                        </span>
                        <span className="text-xs font-bold text-zinc-900">
                          {note.client?.firstName} {note.client?.lastName}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(note.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {note.adlTasksCompleted && note.adlTasksCompleted.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.adlTasksCompleted.map((task: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 font-medium"
                          >
                            {task}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200/60 font-sans">
                      {note.content}
                    </p>

                    {/* Attachment Card */}
                    {note.attachmentUrl && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          {note.attachmentType === "pdf" ? (
                            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                          )}
                          <span className="font-semibold text-zinc-800 truncate max-w-[180px] sm:max-w-xs">
                            {note.attachmentName || "Attached Summary"}
                          </span>
                        </div>
                        <a
                          href={note.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:text-pink-800"
                        >
                          <ExternalLink className="w-3 h-3" /> View Document
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

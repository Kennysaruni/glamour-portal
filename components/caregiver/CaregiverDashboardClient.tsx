"use client";

import React, { useState, useTransition } from "react";
import {
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
  Search,
  ExternalLink,
  Loader2,
  Lock,
  Edit,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import { submitVisitLog, updateVisitLog, submitIncidentReport } from "@/lib/actions/caregiver-actions";
import { getDocumentUrl, calculateAge } from "@/lib/document-utils";
import { VitalsInputFields } from "@/components/vitals/VitalsInputFields";
import { VitalsBadges } from "@/components/vitals/VitalsDisplay";
import { validateVitals } from "@/lib/vitals-utils";
import {
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  CARE_TYPE_LABELS,
  CareType,
  NoteCategory,
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
  const [activeTab, setActiveTab] = useState<"clients" | "log" | "history">("clients");

  const { caregiver, clients, appointments, recentNotes } = initialData;

  // Search & Autocomplete State
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [logPatientSearchQuery, setLogPatientSearchQuery] = useState("");
  const [isLogPatientDropdownOpen, setIsLogPatientDropdownOpen] = useState(false);

  // Filtered patients for Tab 2
  const filteredPatients = clients.filter((client) => {
    if (!patientSearchQuery.trim()) return true;
    const q = patientSearchQuery.toLowerCase();
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    const address = (client.address || "").toLowerCase();
    const phone = (client.emergencyPhone || "").toLowerCase();
    const contact = (client.emergencyContact || "").toLowerCase();
    const careType = (CARE_TYPE_LABELS[client.primaryCareType as CareType] || client.primaryCareType || "").toLowerCase();
    return (
      fullName.includes(q) ||
      address.includes(q) ||
      phone.includes(q) ||
      contact.includes(q) ||
      careType.includes(q)
    );
  });

  // Visit Log Form State (3 primary categories)
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<"DAILY_CARE_LOG" | "DISCHARGE_SUMMARY" | "INCIDENT_REPORT">("DAILY_CARE_LOG");
  const [narrativeContent, setNarrativeContent] = useState<string>("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "completed" | "error">("idle");

  // Structured Vitals State
  const [temperature, setTemperature] = useState<string>("");
  const [temperatureUnit, setTemperatureUnit] = useState<"F" | "C">("F");
  const [bloodPressureSys, setBloodPressureSys] = useState<string>("");
  const [bloodPressureDia, setBloodPressureDia] = useState<string>("");
  const [heartRate, setHeartRate] = useState<string>("");
  const [oxygenSaturation, setOxygenSaturation] = useState<string>("");
  const [respiratoryRate, setRespiratoryRate] = useState<string>("");
  const [bloodGlucose, setBloodGlucose] = useState<string>("");
  const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});

  // Incident Documentation Fields
  const [incidentDate, setIncidentDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [incidentDescription, setIncidentDescription] = useState<string>("");
  const [notificationsMade, setNotificationsMade] = useState<string>("");
  const [actionsTaken, setActionsTaken] = useState<string>("");

  const [uploadedDoc, setUploadedDoc] = useState<{
    url: string;
    originalName: string;
    fileType: string;
    size: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formStatus, setFormStatus] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Edit Visit Log Modal State (24-Hour Window)
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<NoteCategory>("DAILY_CARE_LOG");
  const [editNarrative, setEditNarrative] = useState<string>("");
  const [editTemperature, setEditTemperature] = useState<string>("");
  const [editTemperatureUnit, setEditTemperatureUnit] = useState<"F" | "C">("F");
  const [editBloodPressureSys, setEditBloodPressureSys] = useState<string>("");
  const [editBloodPressureDia, setEditBloodPressureDia] = useState<string>("");
  const [editHeartRate, setEditHeartRate] = useState<string>("");
  const [editOxygenSaturation, setEditOxygenSaturation] = useState<string>("");
  const [editRespiratoryRate, setEditRespiratoryRate] = useState<string>("");
  const [editBloodGlucose, setEditBloodGlucose] = useState<string>("");
  const [editVitalsErrors, setEditVitalsErrors] = useState<Record<string, string>>({});

  const openEditNoteModal = (note: any) => {
    setEditingNote(note);
    setEditCategory((note.category as NoteCategory) || "DAILY_CARE_LOG");
    setEditNarrative(note.content || "");
    setEditTemperature(
      note.temperature !== null && note.temperature !== undefined ? String(note.temperature) : ""
    );
    setEditTemperatureUnit(note.temperatureUnit === "C" ? "C" : "F");
    setEditBloodPressureSys(
      note.bloodPressureSys !== null && note.bloodPressureSys !== undefined
        ? String(note.bloodPressureSys)
        : ""
    );
    setEditBloodPressureDia(
      note.bloodPressureDia !== null && note.bloodPressureDia !== undefined
        ? String(note.bloodPressureDia)
        : ""
    );
    setEditHeartRate(
      note.heartRate !== null && note.heartRate !== undefined ? String(note.heartRate) : ""
    );
    setEditOxygenSaturation(
      note.oxygenSaturation !== null && note.oxygenSaturation !== undefined
        ? String(note.oxygenSaturation)
        : ""
    );
    setEditRespiratoryRate(
      note.respiratoryRate !== null && note.respiratoryRate !== undefined
        ? String(note.respiratoryRate)
        : ""
    );
    setEditBloodGlucose(
      note.bloodGlucose !== null && note.bloodGlucose !== undefined
        ? String(note.bloodGlucose)
        : ""
    );
    setEditVitalsErrors({});
    setEditError(null);
    setIsEditNoteModalOpen(true);
  };

  const handleSaveEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    const bgVal = editBloodGlucose.trim() ? parseInt(editBloodGlucose, 10) : undefined;

    const vitalsResult = validateVitals({
      temperature: editTemperature ? parseFloat(editTemperature) : undefined,
      temperatureUnit: editTemperatureUnit,
      bloodPressureSys: editBloodPressureSys ? parseInt(editBloodPressureSys, 10) : undefined,
      bloodPressureDia: editBloodPressureDia ? parseInt(editBloodPressureDia, 10) : undefined,
      heartRate: editHeartRate ? parseInt(editHeartRate, 10) : undefined,
      oxygenSaturation: editOxygenSaturation ? parseInt(editOxygenSaturation, 10) : undefined,
      respiratoryRate: editRespiratoryRate ? parseInt(editRespiratoryRate, 10) : undefined,
      bloodGlucose: bgVal,
    });

    if (!vitalsResult.isValid) {
      setEditVitalsErrors(vitalsResult.errors);
      setEditError(Object.values(vitalsResult.errors).join(" "));
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateVisitLog(editingNote.id, {
          category: editCategory,
          content: editNarrative,
          temperature: editTemperature ? parseFloat(editTemperature) : undefined,
          temperatureUnit: editTemperatureUnit,
          bloodPressureSys: editBloodPressureSys ? parseInt(editBloodPressureSys, 10) : undefined,
          bloodPressureDia: editBloodPressureDia ? parseInt(editBloodPressureDia, 10) : undefined,
          heartRate: editHeartRate ? parseInt(editHeartRate, 10) : undefined,
          oxygenSaturation: editOxygenSaturation ? parseInt(editOxygenSaturation, 10) : undefined,
          respiratoryRate: editRespiratoryRate ? parseInt(editRespiratoryRate, 10) : undefined,
          bloodGlucose: bgVal,
        });

        if (!res.success) {
          setEditError(res.error || "Failed to update visit log.");
          return;
        }

        setIsEditNoteModalOpen(false);
        setEditingNote(null);
        window.location.reload();
      } catch (err: any) {
        setEditError(err.message || "An unexpected error occurred while saving.");
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploadState("uploading");
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "File upload failed.");
      }

      setUploadedDoc({
        url: uploadData.url,
        originalName: uploadData.originalName,
        fileType: uploadData.fileType,
        size: uploadData.size,
      });
      setUploadState("completed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setUploadError(msg);
      setUploadState("error");
    }
  };



  // Submit Incident Report Action
  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    if (!selectedClientId) {
      setFormStatus({ error: "Please select an assigned client." });
      return;
    }

    if (!incidentDescription.trim()) {
      setFormStatus({ error: "Please describe what happened during the incident." });
      return;
    }

    startTransition(async () => {
      const res = await submitIncidentReport({
        clientId: selectedClientId,
        incidentDate,
        description: incidentDescription.trim(),
        notificationsMade: notificationsMade.trim() || undefined,
        actionsTaken: actionsTaken.trim() || undefined,
      });

      if (res.success) {
        setFormStatus({ success: true });
        setIncidentDescription("");
        setNotificationsMade("");
        setActionsTaken("");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setFormStatus({ error: res.error || "Failed to submit incident report." });
      }
    });
  };

  // Submit Visit Log Action
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    if (!selectedClientId) {
      setFormStatus({ error: "Please select an assigned client." });
      return;
    }

    // Parse and validate numeric vitals
    const tempVal = temperature.trim() ? parseFloat(temperature) : null;
    const sysVal = bloodPressureSys.trim() ? parseInt(bloodPressureSys, 10) : null;
    const diaVal = bloodPressureDia.trim() ? parseInt(bloodPressureDia, 10) : null;
    const hrVal = heartRate.trim() ? parseInt(heartRate, 10) : null;
    const spo2Val = oxygenSaturation.trim() ? parseInt(oxygenSaturation, 10) : null;
    const rrVal = respiratoryRate.trim() ? parseInt(respiratoryRate, 10) : null;
    const bgVal = bloodGlucose.trim() ? parseInt(bloodGlucose, 10) : null;

    const validation = validateVitals({
      temperature: tempVal,
      temperatureUnit,
      bloodPressureSys: sysVal,
      bloodPressureDia: diaVal,
      heartRate: hrVal,
      oxygenSaturation: spo2Val,
      respiratoryRate: rrVal,
      bloodGlucose: bgVal,
    });

    if (!validation.isValid) {
      setVitalsErrors(validation.errors);
      const firstErr = Object.values(validation.errors)[0];
      setFormStatus({ error: `Vitals Error: ${firstErr}` });
      return;
    }
    setVitalsErrors({});

    const hasAnyVital = [tempVal, sysVal, diaVal, hrVal, spo2Val, rrVal, bgVal].some(
      (v) => v !== null && !isNaN(v as number)
    );

    if (!narrativeContent.trim() && !hasAnyVital && !attachedFile && !uploadedDoc) {
      setFormStatus({
        error: "Please enter qualitative visit notes, record structured vitals, or upload a document.",
      });
      return;
    }

    if (uploadState === "uploading") {
      setFormStatus({ error: "Please wait for document upload to complete before submitting." });
      return;
    }

    startTransition(async () => {
      let attachmentUrl: string | undefined = uploadedDoc?.url;
      let attachmentName: string | undefined = uploadedDoc?.originalName;
      let attachmentType: string | undefined = uploadedDoc?.fileType;

      if (attachedFile && !uploadedDoc) {
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
        category: selectedCategory as NoteCategory,
        content: narrativeContent || (attachmentName ? `Attached summary: ${attachmentName}` : (attachedFile ? `Attached summary: ${attachedFile.name}` : "")),
        attachmentUrl,
        attachmentName,
        attachmentType,
        temperature: tempVal,
        temperatureUnit,
        bloodPressureSys: sysVal,
        bloodPressureDia: diaVal,
        heartRate: hrVal,
        oxygenSaturation: spo2Val,
        respiratoryRate: rrVal,
        bloodGlucose: bgVal,
      });

      if (res.success) {
        setFormStatus({ success: true });
        setNarrativeContent("");
        setSelectedAppointmentId("");
        setAttachedFile(null);
        setUploadedDoc(null);
        setUploadState("idle");
        setUploadError(null);
        setTemperature("");
        setBloodPressureSys("");
        setBloodPressureDia("");
        setHeartRate("");
        setOxygenSaturation("");
        setRespiratoryRate("");
        setBloodGlucose("");
        setVitalsErrors({});
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setFormStatus({ error: res.error || "Failed to submit visit log." });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Caregiver Portal Sub-Header - Clean & Functional */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Caregiver Field Portal
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Clinical visit documentation, patient care, and clinical summaries.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>{clients.length} Assigned {clients.length === 1 ? "Patient" : "Patients"}</span>
              </span>
            </div>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="grid grid-cols-2 gap-1.5 mt-4 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => {
                setActiveTab("clients");
                setFormStatus(null);
              }}
              className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                activeTab === "clients"
                  ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${activeTab === "clients" ? "text-pink-600" : "text-slate-500"}`} />
              <span>My Patients</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                setFormStatus(null);
              }}
              className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === "history" ? "text-pink-600" : "text-slate-500"}`} />
              <span>Past Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* ================================================================= */}
        {/* VIEW 2: MY CLIENTS (Row-Level Isolation)                         */}
        {/* ================================================================= */}
        {activeTab === "clients" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  My Patients
                </h2>
                <p className="text-xs text-slate-500">Assigned patient list and clinical care plans.</p>
              </div>

              {/* Patient Instant Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patients by name, care type, address..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-2xs"
                />
                {patientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPatientSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Match Counter Bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
              <span>
                Showing <strong className="text-slate-800 font-semibold">{filteredPatients.length}</strong> of {clients.length} patients
              </span>
              {patientSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPatientSearchQuery("")}
                  className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {filteredPatients.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center text-xs shadow-2xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">No patients found</p>
                <p className="text-slate-500 mt-1">
                  {patientSearchQuery
                    ? `No patient matches "${patientSearchQuery}". Try adjusting your keywords.`
                    : "No patients currently assigned to you."}
                </p>
                {patientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPatientSearchQuery("")}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredPatients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0">
                          {client.firstName[0]}{client.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {client.firstName} {client.lastName}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60 uppercase tracking-wider">
                              {CARE_TYPE_LABELS[client.primaryCareType as CareType] ||
                                client.primaryCareType}
                            </span>
                          </div>
                          {client.dateOfBirth && (() => {
                            const age = calculateAge(client.dateOfBirth);
                            return (
                              <p className="text-xs text-slate-500 mt-0.5">
                                DOB: <span className="font-medium text-slate-700">{client.dateOfBirth}</span>
                                {age !== null && (
                                  <span className="ml-1.5 text-slate-600 font-semibold font-sans">
                                    (Age {age})
                                  </span>
                                )}
                              </p>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <a
                          href={`/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-slate-500" /> Full History
                        </a>
                        <button
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setSelectedCategory("DAILY_CARE_LOG");
                            setActiveTab("log");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Start Visit Note
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                      <div className="bg-slate-50/70 border border-slate-200/60 rounded-lg p-2.5">
                        <span className="text-slate-500 font-medium block">Residence:</span>
                        <div className="flex items-center gap-1 text-slate-900 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address || "Fredericksburg, VA")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-800 font-semibold hover:text-pink-600 hover:underline"
                          >
                            {client.address || "Fredericksburg, VA"}
                          </a>
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/60 rounded-lg p-2.5">
                        <span className="text-slate-500 font-medium block">Emergency Contact:</span>
                        <div className="flex items-center gap-1 text-slate-900 font-semibold mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                          <a
                            href={client.emergencyPhone ? `tel:${client.emergencyPhone}` : "#"}
                            className="hover:underline text-pink-700"
                          >
                            {client.emergencyContact || "Emergency Contact"}{" "}
                            {client.emergencyPhone && `(${client.emergencyPhone})`}
                          </a>
                        </div>
                      </div>
                    </div>

                    {client.carePlanSummary && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                          Active Care Plan:
                        </span>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                          {client.carePlanSummary}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: LOG VISIT FORM (Touch-Optimized ADL Grid)                 */}
        {/* ================================================================= */}
        {activeTab === "log" && (
          <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Log Care Visit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Document patient care, vital signs, and clinical summaries.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("clients");
                  setFormStatus(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors self-start sm:self-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to My Patients</span>
              </button>
            </div>

            {formStatus?.success && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  {selectedCategory === "INCIDENT_REPORT"
                    ? "Incident report successfully filed and escalated to clinical administration!"
                    : "Visit log successfully recorded and synced to agency administration!"}
                </span>
              </div>
            )}

            {formStatus?.error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 font-medium">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{formStatus.error}</span>
              </div>
            )}

            <form
              onSubmit={selectedCategory === "INCIDENT_REPORT" ? handleSubmitIncident : handleSubmitVisit}
              className="space-y-5"
            >
              {/* Select Client with Suggestive Search */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Patient *
                </label>

                {/* Selected Patient Preview Card */}
                {(() => {
                  const currentClient = clients.find((c) => c.id === selectedClientId);
                  return currentClient ? (
                    <div className="mb-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200/80 text-pink-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {currentClient.firstName[0]}{currentClient.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                              {currentClient.firstName} {currentClient.lastName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 border border-slate-300/60 uppercase tracking-wider shrink-0">
                              {CARE_TYPE_LABELS[currentClient.primaryCareType as CareType] || currentClient.primaryCareType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {currentClient.address || "Fredericksburg, VA"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/60 shrink-0">
                        Active Patient
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Suggestive Search Combobox */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient by name or care type to switch..."
                    value={logPatientSearchQuery}
                    onChange={(e) => {
                      setLogPatientSearchQuery(e.target.value);
                      setIsLogPatientDropdownOpen(true);
                    }}
                    onFocus={() => setIsLogPatientDropdownOpen(true)}
                    className="w-full text-base sm:text-xs font-medium border border-slate-300 rounded-xl py-2.5 pl-9 pr-8 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all shadow-2xs"
                  />
                  {logPatientSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLogPatientSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isLogPatientDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsLogPatientDropdownOpen(false)}
                      />
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {clients
                          .filter((c) => {
                            if (!logPatientSearchQuery.trim()) return true;
                            const q = logPatientSearchQuery.toLowerCase();
                            const name = `${c.firstName} ${c.lastName}`.toLowerCase();
                            const care = (CARE_TYPE_LABELS[c.primaryCareType as CareType] || c.primaryCareType || "").toLowerCase();
                            const addr = (c.address || "").toLowerCase();
                            return name.includes(q) || care.includes(q) || addr.includes(q);
                          })
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedClientId(c.id);
                                setLogPatientSearchQuery("");
                                setIsLogPatientDropdownOpen(false);
                              }}
                              className={`w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 cursor-pointer text-xs ${
                                selectedClientId === c.id ? "bg-pink-50/60 font-semibold" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {c.firstName[0]}{c.lastName[0]}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-slate-900 truncate font-medium">
                                    {c.firstName} {c.lastName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {c.address || "Fredericksburg, VA"}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                {CARE_TYPE_LABELS[c.primaryCareType as CareType] || c.primaryCareType}
                              </span>
                            </button>
                          ))}
                        {clients.filter((c) => {
                          if (!logPatientSearchQuery.trim()) return true;
                          const q = logPatientSearchQuery.toLowerCase();
                          const name = `${c.firstName} ${c.lastName}`.toLowerCase();
                          const care = (CARE_TYPE_LABELS[c.primaryCareType as CareType] || c.primaryCareType || "").toLowerCase();
                          const addr = (c.address || "").toLowerCase();
                          return name.includes(q) || care.includes(q) || addr.includes(q);
                        }).length === 0 && (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No matching patients found.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Select Category: Cleanly Presents 3 Primary Options */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "DAILY_CARE_LOG" as const, label: "Daily Care Log" },
                    { id: "DISCHARGE_SUMMARY" as const, label: "Discharge Summary" },
                    { id: "INCIDENT_REPORT" as const, label: "Incident Report" },
                  ].map((opt) => {
                    const isSelected = selectedCategory === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(opt.id);
                          if (opt.id !== "DISCHARGE_SUMMARY") {
                            setAttachedFile(null);
                            setUploadedDoc(null);
                            setUploadState("idle");
                            setUploadError(null);
                          }
                        }}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-pink-600 text-white border-pink-600 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================== */}
              {/* INCIDENT REPORT FORM VIEW                                      */}
              {/* ============================================================== */}
              {selectedCategory === "INCIDENT_REPORT" && (
                <div className="space-y-4 pt-1">
                  {/* Incident Date/Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-pink-600" />
                      <span>Incident Date & Time *</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full text-base sm:text-xs font-medium border border-slate-300 rounded-xl py-2.5 px-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Incident Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-pink-600" />
                        <span>What happened? (Incident Description) *</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Objective clinical details</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe the incident objectively, including who was present, exact sequence of events, patient condition, and immediate impact..."
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      className="w-full text-base sm:text-xs font-normal border border-slate-300 rounded-xl p-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 placeholder-slate-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Notifications Made */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-pink-600" />
                        <span>Who did you notify? (Notifications Made)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">e.g., RN Supervisor, family, emergency services</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Notified RN Supervisor Shavonnah at 10:15 AM; informed daughter Jane Doe"
                      value={notificationsMade}
                      onChange={(e) => setNotificationsMade(e.target.value)}
                      className="w-full text-base sm:text-xs font-medium border border-slate-300 rounded-xl py-2.5 px-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Immediate Actions Taken */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-pink-600" />
                        <span>What immediate actions were taken?</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">First aid, assistance, repositioning</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe immediate aid given, vital signs recorded, safety checks performed, repositioning, etc..."
                      value={actionsTaken}
                      onChange={(e) => setActionsTaken(e.target.value)}
                      className="w-full text-base sm:text-xs font-normal border border-slate-300 rounded-xl p-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 placeholder-slate-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Submit Incident Report Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isPending ? (
                        <span>Submitting Incident Report...</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Incident Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* DISCHARGE SUMMARY DOCUMENT UPLOAD                              */}
              {/* ============================================================== */}
              {selectedCategory === "DISCHARGE_SUMMARY" && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Attach Discharge Summary Document (PDF or PNG)</span>
                    {uploadState === "completed" && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 normal-case bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Upload Complete
                      </span>
                    )}
                  </label>

                  {uploadState === "uploading" ? (
                    <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 text-center">
                      <Loader2 className="w-6 h-6 text-pink-600 animate-spin mx-auto mb-2" />
                      <div className="text-xs font-bold text-slate-900">Uploading Document to Secure Storage...</div>
                      <div className="text-[11px] text-slate-500 mt-1">Encrypting and uploading {attachedFile?.name}</div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-pink-600 h-full w-2/3 animate-pulse rounded-full" />
                      </div>
                    </div>
                  ) : uploadState === "completed" && uploadedDoc ? (
                    <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {uploadedDoc.fileType.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {uploadedDoc.originalName}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Complete
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{(uploadedDoc.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Encrypted & Ready</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end w-full sm:w-auto shrink-0">
                          <a
                            href={getDocumentUrl(uploadedDoc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs flex-1 sm:flex-initial"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                            <span>Preview</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedFile(null);
                              setUploadedDoc(null);
                              setUploadState("idle");
                            }}
                            className="p-1.5 text-slate-400 hover:text-pink-600 rounded-md hover:bg-white transition-colors cursor-pointer shrink-0"
                            title="Remove attached file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50 text-center hover:bg-slate-50 transition-colors relative">
                      <input
                        type="file"
                        accept=".pdf,.png,application/pdf,image/png"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                      <div className="text-xs font-semibold text-slate-800">
                        Tap to upload PDF discharge summary or PNG photo
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Accepted: PDF (.pdf) or PNG (.png) • Max 15MB
                      </div>
                      {uploadError && (
                        <div className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 p-1.5 rounded border border-rose-200">
                          {uploadError}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* STRUCTURED VITALS & CLINICAL NOTES (FOR DAILY CARE LOG & DISCHARGE) */}
              {/* ============================================================== */}
              {selectedCategory !== "INCIDENT_REPORT" && (
                <>
                  {/* Structured Vital Signs Section */}
                  <VitalsInputFields
                    temperature={temperature}
                    setTemperature={setTemperature}
                    temperatureUnit={temperatureUnit}
                    setTemperatureUnit={setTemperatureUnit}
                    bloodPressureSys={bloodPressureSys}
                    setBloodPressureSys={setBloodPressureSys}
                    bloodPressureDia={bloodPressureDia}
                    setBloodPressureDia={setBloodPressureDia}
                    heartRate={heartRate}
                    setHeartRate={setHeartRate}
                    oxygenSaturation={oxygenSaturation}
                    setOxygenSaturation={setOxygenSaturation}
                    respiratoryRate={respiratoryRate}
                    setRespiratoryRate={setRespiratoryRate}
                    bloodGlucose={bloodGlucose}
                    setBloodGlucose={setBloodGlucose}
                    errors={vitalsErrors}
                  />

                  {/* General Visit & Care Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>General Visit & Care Notes</span>
                      <span className="text-[10px] text-slate-500 font-normal lowercase">Qualitative clinical observations</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Document general observations, patient demeanor, appetite, mobility, or caregiver recommendations..."
                      value={narrativeContent}
                      onChange={(e) => setNarrativeContent(e.target.value)}
                      className="w-full text-base sm:text-xs font-normal border border-slate-300 rounded-xl p-3 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 focus:border-pink-500 placeholder-slate-400 leading-relaxed font-sans"
                    />
                  </div>

                  {/* Submit Visit Log Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isPending || isUploading}
                      className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
                </>
              )}
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 4: PAST LOGS HISTORY                                        */}
        {/* ================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Visit History
                </h2>
                <p className="text-xs text-slate-500">Historical visit logs submitted by you.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/70">
                {recentNotes.length} Notes
              </span>
            </div>

            {recentNotes.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-xs">
                <ClipboardList className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">No logs submitted yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use the "Log Visit" tab to record your first patient visit notes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                          {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {note.client?.firstName} {note.client?.lastName}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[11px] text-slate-400">
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
                        {(() => {
                          const elapsedMs = Date.now() - new Date(note.createdAt).getTime();
                          const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                          const isLocked = elapsedMs > TWENTY_FOUR_HOURS_MS;
                          const totalMinutesRemaining = Math.max(
                            0,
                            Math.floor((TWENTY_FOUR_HOURS_MS - elapsedMs) / (60 * 1000))
                          );
                          const hoursRemaining = Math.floor(totalMinutesRemaining / 60);
                          const minutesRemaining = totalMinutesRemaining % 60;

                          if (isLocked) {
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                  <Lock className="w-3 h-3 text-slate-400" /> Locked / Finalized
                                </span>
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-60"
                                  title="Edit window closed (24-hour limit reached)"
                                >
                                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Edit Disabled
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Clock className="w-3 h-3 text-emerald-600" /> {hoursRemaining > 0 ? `${hoursRemaining}h ` : ""}{minutesRemaining}m edit window
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditNoteModal(note)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 hover:border-pink-300 text-slate-700 hover:text-pink-600 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Edit className="w-3 h-3" /> Edit Note
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Structured Vitals Badge Row */}
                    <VitalsBadges vitals={note} size="sm" />

                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-200/60 font-sans mt-2">
                      {note.content}
                    </p>

                    {/* Attachment Card */}
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
                          <span>View Document</span>
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

      {/* Edit Visit Log Modal (24-Hour Window Active) */}
      {isEditNoteModalOpen && editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditNoteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Edit Submitted Visit Log</h3>
                <p className="text-xs text-slate-500">
                  Patient: {editingNote.client?.firstName} {editingNote.client?.lastName} • 24-Hour Edit Window
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditNote} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(NOTE_CATEGORIES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditCategory(val as NoteCategory)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                        editCategory === val
                          ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {NOTE_CATEGORY_LABELS[val as NoteCategory] || val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Structured Vitals Input Fields */}
              <div className="pt-2 border-t border-slate-100">
                <VitalsInputFields
                  temperature={editTemperature}
                  setTemperature={setEditTemperature}
                  temperatureUnit={editTemperatureUnit}
                  setTemperatureUnit={setEditTemperatureUnit}
                  bloodPressureSys={editBloodPressureSys}
                  setBloodPressureSys={setEditBloodPressureSys}
                  bloodPressureDia={editBloodPressureDia}
                  setBloodPressureDia={setEditBloodPressureDia}
                  heartRate={editHeartRate}
                  setHeartRate={setEditHeartRate}
                  oxygenSaturation={editOxygenSaturation}
                  setOxygenSaturation={setEditOxygenSaturation}
                  respiratoryRate={editRespiratoryRate}
                  setRespiratoryRate={setEditRespiratoryRate}
                  bloodGlucose={editBloodGlucose}
                  setBloodGlucose={setEditBloodGlucose}
                  errors={editVitalsErrors}
                />
              </div>

              {/* Qualitative Narrative */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  General Visit &amp; Care Notes
                </label>
                <textarea
                  rows={4}
                  value={editNarrative}
                  onChange={(e) => setEditNarrative(e.target.value)}
                  placeholder="Clinical observations, patient demeanor, meals consumed, etc..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Changes are recorded in clinical audit log.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditNoteModalOpen(false)}
                    className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? "Saving..." : "Save Updates"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  FileText,
  Upload,
  ArrowLeft,
  User,
  Shield,
  HeartPulse,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Image as ImageIcon,
  X,
  Plus,
  Loader2,
  Filter,
  RotateCcw,
  RefreshCw,
  Activity,
  Lock,
} from "lucide-react";
import { getDocumentUrl, calculateAge } from "@/lib/document-utils";
import { formatPhoneNumber } from "@/lib/phone";
import { VitalsInputFields } from "@/components/vitals/VitalsInputFields";
import { VitalsBadges, VitalsTable } from "@/components/vitals/VitalsDisplay";
import { validateVitals, hasAnyVitals } from "@/lib/vitals-utils";
import {
  CARE_TYPE_LABELS,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  CareType,
  NoteCategory,
} from "@/lib/types";
import { submitVisitLog } from "@/lib/actions/caregiver-actions";

interface ClientDetailViewProps {
  client: any;
  notes: any[];
  appointments: any[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function ClientDetailView({
  client,
  notes: initialNotes,
  appointments: initialAppointments,
  currentUser,
}: ClientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"history" | "careplan" | "upload">("history");
  const [historySubTab, setHistorySubTab] = useState<"feed" | "vitals">("feed");
  const [notes, setNotes] = useState(initialNotes);

  // Structured Vitals State for Upload / Log Form
  const [temperature, setTemperature] = useState("");
  const [temperatureUnit, setTemperatureUnit] = useState<"F" | "C">("F");
  const [bloodPressureSys, setBloodPressureSys] = useState("");
  const [bloodPressureDia, setBloodPressureDia] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [vitalsErrors, setVitalsErrors] = useState<Record<string, string>>({});

  // Filters for Client Visit Notes / Summaries
  const [noteStartDate, setNoteStartDate] = useState("");
  const [noteEndDate, setNoteEndDate] = useState("");
  const [noteCategoryFilter, setNoteCategoryFilter] = useState("ALL");
  const [activePreset, setActivePreset] = useState<number | "all">("all");
  const [isFetchingNotes, setIsFetchingNotes] = useState(false);

  const handleFetchFilteredNotes = async (override?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }) => {
    setIsFetchingNotes(true);
    try {
      const start = override?.startDate !== undefined ? override.startDate : noteStartDate;
      const end = override?.endDate !== undefined ? override.endDate : noteEndDate;
      const cat = override?.category !== undefined ? override.category : noteCategoryFilter;

      const params = new URLSearchParams();
      if (start) params.set("startDate", start);
      if (end) params.set("endDate", end);
      if (cat && cat !== "ALL") params.set("category", cat);
      params.set("limit", "100");

      const res = await fetch(`/api/clients/${client.id}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notes) {
          setNotes(data.notes);
        }
      }
    } catch (err) {
      console.error("Failed to fetch filtered notes:", err);
    } finally {
      setIsFetchingNotes(false);
    }
  };

  const setNotePreset = (days: number | "all") => {
    setActivePreset(days);
    if (days === "all") {
      setNoteStartDate("");
      setNoteEndDate("");
      handleFetchFilteredNotes({ startDate: "", endDate: "" });
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setNoteStartDate(startStr);
    setNoteEndDate(endStr);
    handleFetchFilteredNotes({ startDate: startStr, endDate: endStr });
  };

  // New Note / Summary Form State
  const [category, setCategory] = useState<NoteCategory>("DAILY_CARE_LOG");
  const [narrativeContent, setNarrativeContent] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "completed" | "error">("idle");
  const [uploadedDoc, setUploadedDoc] = useState<{
    url: string;
    originalName: string;
    fileType: string;
    size: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formStatus, setFormStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    // Parse and validate numeric vitals
    const tempVal = temperature.trim() ? parseFloat(temperature) : null;
    const sysVal = bloodPressureSys.trim() ? parseInt(bloodPressureSys, 10) : null;
    const diaVal = bloodPressureDia.trim() ? parseInt(bloodPressureDia, 10) : null;
    const hrVal = heartRate.trim() ? parseInt(heartRate, 10) : null;
    const spo2Val = oxygenSaturation.trim() ? parseInt(oxygenSaturation, 10) : null;
    const rrVal = respiratoryRate.trim() ? parseInt(respiratoryRate, 10) : null;
    const bgVal = bloodGlucose.trim() ? parseInt(bloodGlucose, 10) : null;

    const vitalsValidation = validateVitals({
      temperature: tempVal,
      temperatureUnit,
      bloodPressureSys: sysVal,
      bloodPressureDia: diaVal,
      heartRate: hrVal,
      oxygenSaturation: spo2Val,
      respiratoryRate: rrVal,
      bloodGlucose: bgVal,
    });

    if (!vitalsValidation.isValid) {
      setVitalsErrors(vitalsValidation.errors);
      const firstErr = Object.values(vitalsValidation.errors)[0];
      setFormStatus({ error: `Vitals Error: ${firstErr}` });
      return;
    }
    setVitalsErrors({});

    const hasAnyVital = [tempVal, sysVal, diaVal, hrVal, spo2Val, rrVal, bgVal].some(
      (v) => v !== null && !isNaN(v as number)
    );

    if (!narrativeContent.trim() && !hasAnyVital && !attachedFile && !uploadedDoc) {
      setFormStatus({
        error: "Please provide clinical notes, record structured vitals, or upload a summary document.",
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
            setFormStatus({ error: uploadData.error || "Failed to upload document." });
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
        clientId: client.id,
        category,
        content: narrativeContent || (attachmentName ? `Uploaded clinical summary: ${attachmentName}` : (attachedFile ? `Uploaded clinical summary: ${attachedFile.name}` : "")),
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
        setAttachedFile(null);
        setUploadedDoc(null);
        setUploadState("idle");
        setTemperature("");
        setBloodPressureSys("");
        setBloodPressureDia("");
        setHeartRate("");
        setOxygenSaturation("");
        setRespiratoryRate("");
        setBloodGlucose("");
        setVitalsErrors({});

        // Prepend optimistic note
        const newNoteItem = {
          id: res.noteId || String(Date.now()),
          clientId: client.id,
          employeeId: currentUser.id,
          employee: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
          category,
          content: narrativeContent || (attachmentName ? `Uploaded clinical summary: ${attachmentName}` : (attachedFile ? `Uploaded clinical summary: ${attachedFile.name}` : "")),
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
          createdAt: new Date().toISOString(),
        };
        setNotes((prev) => [newNoteItem, ...prev]);
        setTimeout(() => setActiveTab("history"), 1200);
      } else {
        setFormStatus({ error: res.error || "Failed to save record." });
      }
    });
  };

  const backUrl = currentUser.role === "ADMIN" ? "/admin" : "/app";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {currentUser.role === "ADMIN" ? "Admin Portal" : "Caregiver Portal"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
              <Shield className="w-3.5 h-3.5 text-slate-500" /> HIPAA Clinical Record
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Client Header Profile Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-semibold text-xl shrink-0 shadow-2xs">
                {client.firstName[0]}
                {client.lastName[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {client.firstName} {client.lastName}
                  </h1>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                      client.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {client.isActive ? "Active Patient" : "Inactive"}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 uppercase tracking-wider">
                    {CARE_TYPE_LABELS[client.primaryCareType as CareType] || client.primaryCareType}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-3">
                  <span>Client ID: <span className="font-mono text-slate-700">{client.id}</span></span>
                  {client.dateOfBirth && (() => {
                    const age = calculateAge(client.dateOfBirth);
                    return (
                      <span>
                        • DOB: <span className="font-medium text-slate-800">{client.dateOfBirth}</span>
                        {age !== null && (
                          <span className="ml-1.5 font-semibold text-slate-700">
                            (Age {age})
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Clinical Profile Snapshot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Residence */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Residence
              </div>
              <div className="mt-1 text-xs font-medium text-slate-900">
                {client.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-800 hover:text-rose-600 hover:underline"
                  >
                    {client.address}
                  </a>
                ) : (
                  <span className="text-slate-400">Not recorded</span>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone
              </div>
              <div className="mt-1 text-xs font-medium text-slate-900">
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:text-rose-600 hover:underline text-slate-900">
                    {formatPhoneNumber(client.phone)}
                  </a>
                ) : (
                  <span className="text-slate-400">Not recorded</span>
                )}
              </div>
            </div>

            {/* Assigned Caregiver */}
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Assigned Caregiver
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-900">
                {client.assignedEmployee?.name || "Unassigned"}
              </div>
              {client.assignedEmployee?.phone && (
                <div className="text-[11px] text-slate-500 mt-0.5">{formatPhoneNumber(client.assignedEmployee.phone)}</div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-rose-50/50 border border-rose-200/70 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Emergency Contact
              </div>
              <div className="mt-1 text-xs font-semibold text-rose-950">
                {client.emergencyContact || "No contact listed"}
              </div>
              {client.emergencyPhone && (
                <a
                  href={`tel:${client.emergencyPhone}`}
                  className="text-xs text-rose-700 font-medium hover:underline block mt-0.5"
                >
                  {formatPhoneNumber(client.emergencyPhone)}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-8 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Visit History & Summaries ({notes.length})</span>
          </button>



          <button
            onClick={() => setActiveTab("careplan")}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "careplan"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Care Plan & Protocols</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "upload"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Summary / New Log</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* TAB 1: VISIT HISTORY & SUMMARIES */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Filter and Action Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Visit Logs & Clinical Summaries
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chronological audit of caregiver visit logs, ADLs, and physician discharge summaries.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md">
                    Showing {notes.length} records (max 100/fetch)
                  </span>
                  <button
                    onClick={() => handleFetchFilteredNotes()}
                    disabled={isFetchingNotes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 shadow-2xs cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetchingNotes ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 mr-1">Date Range:</span>
                    {[
                      { label: "Today", days: 0 },
                      { label: "7 Days", days: 7 },
                      { label: "30 Days", days: 30 },
                      { label: "All Time", days: "all" as const },
                    ].map((preset) => {
                      const isSelected = activePreset === preset.days;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => setNotePreset(preset.days)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-pink-50 text-pink-700 border border-pink-300 font-semibold"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {(noteStartDate || noteEndDate || noteCategoryFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setNoteStartDate("");
                        setNoteEndDate("");
                        setNoteCategoryFilter("ALL");
                        handleFetchFilteredNotes({ startDate: "", endDate: "", category: "ALL" });
                      }}
                      className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">From Date</label>
                    <input
                      type="date"
                      value={noteStartDate}
                      onChange={(e) => setNoteStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">To Date</label>
                    <input
                      type="date"
                      value={noteEndDate}
                      onChange={(e) => setNoteEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Clinical Category</label>
                    <select
                      value={noteCategoryFilter}
                      onChange={(e) => setNoteCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-pink-500"
                    >
                      <option value="ALL">All Categories</option>
                      <option value="DAILY_CARE_LOG">Daily Care Log</option>
                      <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                      <option value="INCIDENT_REPORT">Incident Report</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleFetchFilteredNotes()}
                    disabled={isFetchingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{isFetchingNotes ? "Loading..." : "Filter Notes"}</span>
                  </button>
                </div>
              </div>

              {/* Sub-view switcher: All Visit Notes Feed vs Vitals Flowsheet Table */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
                  <button
                    type="button"
                    onClick={() => setHistorySubTab("feed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      historySubTab === "feed"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 inline mr-1.5 text-slate-500" />
                    Visit Notes Feed ({notes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistorySubTab("vitals")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      historySubTab === "vitals"
                        ? "bg-white text-pink-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 inline mr-1.5 text-pink-600" />
                    Vitals Flowsheet Table ({notes.filter((n) => hasAnyVitals(n)).length})
                  </button>
                </div>
                {historySubTab === "feed" && (
                  <span className="text-xs text-slate-500">
                    Chronological card view of visit notes, ADLs, and attachments.
                  </span>
                )}
              </div>

              {historySubTab === "vitals" ? (
                <VitalsTable notes={notes} />
              ) : notes.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No visit notes or summaries recorded yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload a PDF summary or log the patient's first care visit.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add First Record
                  </button>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-slate-200/80 rounded-xl p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/80">
                          {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                        </span>
                        <span className="text-xs text-slate-600">
                          Recorded by <span className="font-semibold text-slate-900">{note.employee?.name || "Caregiver"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">
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
                        {(() => {
                          const elapsedMs = Date.now() - new Date(note.createdAt).getTime();
                          const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
                          const isLocked = elapsedMs > TWENTY_FOUR_HOURS_MS;
                          return isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Clock className="w-2.5 h-2.5 text-emerald-600" /> 24h Edit Window
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Structured Vitals Badges */}
                    <VitalsBadges vitals={note} size="sm" />

                    {/* Narrative Clinical Content */}
                    <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/60 mt-2">
                      {note.content}
                    </div>

                    {/* ATTACHMENT CARD (PDF or PNG) */}
                    {note.attachmentUrl && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-pink-600" /> Attached Clinical Summary
                        </div>

                        {note.attachmentType === "pdf" ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                PDF
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {note.attachmentName || "Clinical_Summary.pdf"}
                                </div>
                                <div className="text-[11px] text-slate-500">PDF Document Summary</div>
                              </div>
                            </div>
                            <a
                              href={getDocumentUrl(note.attachmentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 w-full sm:w-auto"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View / Download PDF</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                onClick={() => setPreviewImageUrl(getDocumentUrl(note.attachmentUrl))}
                                className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer relative group"
                              >
                                <img
                                  src={getDocumentUrl(note.attachmentUrl)}
                                  alt="Clinical Summary"
                                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                />
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                  {note.attachmentName || "Summary_Image.png"}
                                </div>
                                <div className="text-[11px] text-slate-500">PNG Clinical Image</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                              <button
                                onClick={() => setPreviewImageUrl(getDocumentUrl(note.attachmentUrl))}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-2xs transition-colors cursor-pointer flex-1 sm:flex-initial"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={getDocumentUrl(note.attachmentUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white text-xs font-semibold shadow-xs transition-colors flex-1 sm:flex-initial"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Full</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}



          {/* TAB 3: CARE PLAN & PROTOCOLS */}
          {activeTab === "careplan" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-rose-600" /> Active Care Plan & Clinical Directives
                </h3>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {client.carePlanSummary || "Standard personalized home care assistance with activities of daily living."}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                  Clinical Care Classification
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed">
                  <strong className="font-semibold text-slate-900">{CARE_TYPE_LABELS[client.primaryCareType as CareType] || client.primaryCareType}: </strong>
                  Assigned to licensed and trained non-skilled personal care attendants under Registered Nurse oversight.
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                  Emergency Protocols
                </h4>
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70 text-xs text-rose-950 leading-relaxed">
                  In case of critical clinical deterioration, chest pain, or emergency, staff are instructed to contact 911 immediately, followed by the agency RN clinical administrator at <strong>(678) 468-7009</strong> and designated emergency contact: <strong>{client.emergencyContact || "Family"}{client.emergencyPhone ? ` • ${formatPhoneNumber(client.emergencyPhone)}` : " (N/A)"}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: UPLOAD SUMMARY / NEW LOG FORM */}
          {activeTab === "upload" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Upload PDF / PNG Summary or Record Visit
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Upload medical summaries, hospital discharge reports, or record direct care notes for {client.firstName} {client.lastName}.
                </p>
              </div>

              {formStatus?.success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Clinical record successfully added to patient history!</span>
                </div>
              )}

              {formStatus?.error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800 font-medium">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{formStatus.error}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Record Category *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "DAILY_CARE_LOG" as const, label: "Daily Care Log" },
                      { id: "DISCHARGE_SUMMARY" as const, label: "Discharge Summary" },
                      { id: "INCIDENT_REPORT" as const, label: "Incident Report" },
                    ].map((opt) => {
                      const isSelected = category === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const newCat = opt.id as NoteCategory;
                            setCategory(newCat);
                            if (newCat !== "DISCHARGE_SUMMARY") {
                              setAttachedFile(null);
                              setUploadedDoc(null);
                              setUploadState("idle");
                              setUploadError(null);
                            }
                          }}
                          className={`py-2.5 px-3 rounded-lg text-xs font-medium text-center border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-pink-600 text-white border-pink-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>



                {/* File Upload Box (PDF or PNG) - ONLY ON DISCHARGE_SUMMARY */}
                {category === "DISCHARGE_SUMMARY" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Upload Hospital Discharge Summary (PDF or PNG)
                    </label>

                    {uploadState === "uploading" ? (
                      <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 text-center">
                        <Loader2 className="w-6 h-6 text-pink-600 animate-spin mx-auto mb-2" />
                        <div className="text-xs font-semibold text-slate-900">Uploading Document to Secure Storage...</div>
                        <div className="text-[11px] text-slate-500 mt-1">Encrypting and uploading {attachedFile?.name}</div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-pink-600 h-full w-2/3 animate-pulse rounded-full" />
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
                                <span className="text-xs font-semibold text-slate-900 truncate">
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
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium shadow-2xs flex-1 sm:flex-initial"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
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
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/60 text-center hover:bg-slate-50 hover:border-slate-400 transition-colors relative">
                        <input
                          type="file"
                          accept=".pdf,.png,application/pdf,image/png"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <div className="text-xs font-semibold text-slate-800">
                          Click or drag & drop to upload discharge document
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Supported formats: <span className="font-semibold text-slate-700">PDF (.pdf)</span> or <span className="font-semibold text-slate-700">PNG (.png)</span> • Max 15MB
                        </div>
                        {uploadError && (
                          <div className="mt-2 text-xs text-pink-600 font-medium bg-pink-50 p-2 rounded-lg border border-pink-200">
                            {uploadError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Structured Vital Signs Input */}
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

                {/* Qualitative Clinical Narrative & Observations */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Clinical Narrative & Observations</span>
                    <span className="text-[10px] text-slate-500 font-normal lowercase">Qualitative clinical observations</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter visit narrative, patient clinical observations, or document summary notes..."
                    value={narrativeContent}
                    onChange={(e) => setNarrativeContent(e.target.value)}
                    className="w-full text-xs font-normal border border-slate-200 rounded-xl p-3.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 placeholder-slate-400 leading-relaxed font-sans"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isUploading ? (
                      <span>Uploading Document...</span>
                    ) : isPending ? (
                      <span>Saving Clinical Record...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Record & Sync History</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Image Preview */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={getDocumentUrl(previewImageUrl)}
              alt="Clinical Document Preview"
              className="max-h-[85vh] w-auto mx-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

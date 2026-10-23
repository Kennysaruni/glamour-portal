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
  CheckSquare,
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
} from "lucide-react";
import { getDocumentUrl } from "@/lib/document-utils";
import {
  CARE_TYPE_LABELS,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABELS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  ADL_TASKS,
  CareType,
  NoteCategory,
  AppointmentType,
  AppointmentStatus,
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
  const [activeTab, setActiveTab] = useState<"history" | "appointments" | "careplan" | "upload">("history");
  const [notes, setNotes] = useState(initialNotes);
  const [appointments] = useState(initialAppointments);

  // New Note / Summary Form State
  const [category, setCategory] = useState<NoteCategory>("DAILY_CARE_LOG");
  const [selectedAdlTasks, setSelectedAdlTasks] = useState<string[]>([]);
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

  const toggleAdlTask = (task: string) => {
    setSelectedAdlTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    if (!narrativeContent.trim() && !attachedFile && !uploadedDoc) {
      setFormStatus({ error: "Please provide clinical notes or upload a PDF/PNG summary document." });
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
        adlTasksCompleted: selectedAdlTasks,
        content: narrativeContent || (attachedFile ? `Uploaded clinical summary: ${attachedFile.name}` : ""),
        attachmentUrl,
        attachmentName,
        attachmentType,
      });

      if (res.success) {
        setFormStatus({ success: true });
        setNarrativeContent("");
        setSelectedAdlTasks([]);
        setAttachedFile(null);
        setUploadedDoc(null);
        setUploadState("idle");

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
          adlTasksCompleted: selectedAdlTasks,
          content: narrativeContent || (attachedFile ? `Uploaded clinical summary: ${attachedFile.name}` : ""),
          attachmentUrl,
          attachmentName,
          attachmentType,
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
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white border-b border-pink-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-pink-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {currentUser.role === "ADMIN" ? "Admin Portal" : "Caregiver Portal"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
              <Shield className="w-3.5 h-3.5" /> HIPAA Clinical Record
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Client Header Profile Card */}
        <div className="bg-white border border-pink-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-2xl shadow-sm shrink-0">
                {client.firstName[0]}
                {client.lastName[0]}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                    {client.firstName} {client.lastName}
                  </h1>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      client.isActive
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {client.isActive ? "Active Patient" : "Inactive"}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-200 uppercase tracking-wider">
                    {CARE_TYPE_LABELS[client.primaryCareType as CareType] || client.primaryCareType}
                  </span>
                </div>

                <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-3">
                  <span>Client ID: <span className="font-mono text-zinc-700">{client.id}</span></span>
                  {client.dateOfBirth && <span>• DOB: <span className="font-semibold text-zinc-800">{client.dateOfBirth}</span></span>}
                </p>
              </div>
            </div>

            {/* Quick Action */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("upload")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload PDF / PNG Summary</span>
              </button>
            </div>
          </div>

          {/* Clinical Profile Snapshot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Residence */}
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-600" /> Residence
              </div>
              <div className="mt-1 text-xs font-semibold text-zinc-900">
                {client.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-700 hover:underline"
                  >
                    {client.address}
                  </a>
                ) : (
                  <span className="text-zinc-400">Not recorded</span>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-600" /> Contact Phone
              </div>
              <div className="mt-1 text-xs font-semibold text-zinc-900">
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="hover:underline text-zinc-900">
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-zinc-400">Not recorded</span>
                )}
              </div>
            </div>

            {/* Assigned Caregiver */}
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-pink-600" /> Assigned Caregiver
              </div>
              <div className="mt-1 text-xs font-bold text-pink-700">
                {client.assignedEmployee?.name || "Unassigned"}
              </div>
              {client.assignedEmployee?.phone && (
                <div className="text-[11px] text-zinc-500 mt-0.5">{client.assignedEmployee.phone}</div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Emergency Contact
              </div>
              <div className="mt-1 text-xs font-bold text-rose-950">
                {client.emergencyContact || "No contact listed"}
              </div>
              {client.emergencyPhone && (
                <a
                  href={`tel:${client.emergencyPhone}`}
                  className="text-xs text-rose-700 font-semibold hover:underline block mt-0.5"
                >
                  {client.emergencyPhone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 mt-8 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Visit History & Summaries ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("appointments")}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "appointments"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduled Shifts ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("careplan")}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "careplan"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>Care Plan & Protocols</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "upload"
                ? "border-pink-600 text-pink-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
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
              {notes.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
                  <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-700">No visit notes or summaries recorded yet</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Upload a PDF summary or log the patient's first care visit.
                  </p>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add First Record
                  </button>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-pink-200/80 rounded-xl p-5 sm:p-6 shadow-2xs transition-all hover:border-pink-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-3 mb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-pink-100 text-pink-800 border border-pink-200">
                          {NOTE_CATEGORY_LABELS[note.category as NoteCategory] || note.category}
                        </span>
                        <span className="text-xs text-zinc-600">
                          Recorded by <span className="font-bold text-zinc-900">{note.employee?.name || "Caregiver"}</span>
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400">
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

                    {/* ADL Tasks Completed */}
                    {note.adlTasksCompleted && note.adlTasksCompleted.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-pink-600" /> Completed ADLs:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {note.adlTasksCompleted.map((task: string, i: number) => (
                            <span
                              key={i}
                              className="text-xs bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200 font-medium"
                            >
                              {task}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Narrative Clinical Content */}
                    <div className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-50/70 p-3.5 rounded-lg border border-zinc-200/60">
                      {note.content}
                    </div>

                    {/* ATTACHMENT CARD (PDF or PNG) */}
                    {note.attachmentUrl && (
                      <div className="mt-4 pt-3 border-t border-zinc-100">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-pink-600" /> Attached Clinical Summary
                        </div>

                        {note.attachmentType === "pdf" ? (
                          <div className="flex items-center justify-between p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                PDF
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-900 truncate max-w-xs sm:max-w-md">
                                  {note.attachmentName || "Clinical_Summary.pdf"}
                                </div>
                                <div className="text-[11px] text-zinc-500">PDF Document Summary</div>
                              </div>
                            </div>
                            <a
                              href={getDocumentUrl(note.attachmentUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </a>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-pink-50/60 border border-pink-200/80 rounded-xl gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setPreviewImageUrl(getDocumentUrl(note.attachmentUrl))}
                                className="w-12 h-12 rounded-lg border border-pink-200 overflow-hidden bg-zinc-100 shrink-0 cursor-pointer relative group"
                              >
                                <img
                                  src={getDocumentUrl(note.attachmentUrl)}
                                  alt="Clinical Summary"
                                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                                />
                              </button>
                              <div>
                                <div className="text-xs font-bold text-zinc-900 truncate max-w-xs sm:max-w-md">
                                  {note.attachmentName || "Summary_Image.png"}
                                </div>
                                <div className="text-[11px] text-zinc-500">PNG Clinical Image</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewImageUrl(getDocumentUrl(note.attachmentUrl))}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-pink-300 text-pink-700 hover:bg-pink-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <a
                                href={getDocumentUrl(note.attachmentUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-2xs transition-colors"
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

          {/* TAB 2: SCHEDULED SHIFTS & APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
                  <Calendar className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-zinc-700">No shifts scheduled for this patient</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => {
                    const isCompleted = appt.status === "COMPLETED";
                    return (
                      <div
                        key={appt.id}
                        className={`bg-white border rounded-xl p-4 shadow-2xs transition-all ${
                          isCompleted ? "border-zinc-200 opacity-80" : "border-pink-300 ring-1 ring-pink-100"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-pink-100 text-pink-800 border border-pink-200">
                              {APPOINTMENT_TYPE_LABELS[appt.type as AppointmentType] || appt.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {APPOINTMENT_STATUS_LABELS[appt.status as AppointmentStatus] || appt.status}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {new Date(appt.startTime).toLocaleString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-700 space-y-1">
                          {appt.summary && <p className="font-medium text-zinc-900">{appt.summary}</p>}
                          {appt.location && (
                            <p className="text-zinc-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-pink-600" /> {appt.location}
                            </p>
                          )}
                          <p className="text-zinc-500">
                            Caregiver: <span className="font-semibold text-zinc-800">{appt.employee?.name || "Assigned Caregiver"}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CARE PLAN & PROTOCOLS */}
          {activeTab === "careplan" && (
            <div className="bg-white border border-pink-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-zinc-900 mb-2 flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-pink-600" /> Active Care Plan & Clinical Directives
                </h3>
                <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {client.carePlanSummary || "Standard personalized home care assistance with activities of daily living."}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-5">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Clinical Care Classification
                </h4>
                <div className="p-4 rounded-xl bg-pink-50/70 border border-pink-200/80 text-xs text-pink-900 leading-relaxed">
                  <strong>{CARE_TYPE_LABELS[client.primaryCareType as CareType] || client.primaryCareType}: </strong>
                  Assigned to licensed and trained non-skilled personal care attendants under Registered Nurse oversight.
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-5">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                  Emergency Protocols
                </h4>
                <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-950 leading-relaxed">
                  In case of critical clinical deterioration, chest pain, or emergency, staff are instructed to contact 911 immediately, followed by the agency RN clinical administrator at <strong>(540) 555-0199</strong> and designated emergency contact: <strong>{client.emergencyContact || "Family"} ({client.emergencyPhone || "N/A"})</strong>.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: UPLOAD SUMMARY / NEW LOG FORM */}
          {activeTab === "upload" && (
            <div className="bg-white border border-pink-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
              <div className="border-b border-zinc-200 pb-3 mb-6">
                <h2 className="text-lg font-bold text-zinc-900">
                  Upload PDF / PNG Summary or Record Visit
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
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
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Record Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(NOTE_CATEGORIES).map(([key, val]) => {
                      const isSelected = category === val;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCategory(val as NoteCategory)}
                          className={`py-2.5 px-3 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
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

                {/* ADL Tasks Completed */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    ADL Tasks (If Applicable)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ADL_TASKS.map((task) => {
                      const isChecked = selectedAdlTasks.includes(task);
                      return (
                        <button
                          key={task}
                          type="button"
                          onClick={() => toggleAdlTask(task)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            isChecked
                              ? "bg-pink-50 border-pink-400 text-pink-900 shadow-2xs"
                              : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          <span>{task}</span>
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? "bg-pink-600 border-pink-600 text-white" : "border-zinc-300 bg-zinc-50"
                            }`}
                          >
                            {isChecked && <CheckSquare className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Upload Box (PDF or PNG) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Upload PDF Summary or PNG Document
                  </label>

                  {uploadState === "uploading" ? (
                    <div className="border border-pink-200 bg-pink-50/50 rounded-xl p-4 text-center">
                      <Loader2 className="w-6 h-6 text-pink-600 animate-spin mx-auto mb-2" />
                      <div className="text-xs font-bold text-pink-900">Uploading Document to Secure Storage...</div>
                      <div className="text-[11px] text-zinc-500 mt-1">Encrypting and uploading {attachedFile?.name}</div>
                      <div className="w-full bg-pink-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-600 h-full w-2/3 animate-pulse rounded-full" />
                      </div>
                    </div>
                  ) : uploadState === "completed" && uploadedDoc ? (
                    <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {uploadedDoc.fileType.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-900 truncate max-w-[180px] sm:max-w-xs">
                                {uploadedDoc.originalName}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Complete
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                              <span>{(uploadedDoc.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-medium">Encrypted & Ready</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={getDocumentUrl(uploadedDoc.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-2xs"
                          >
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                            <span>Preview</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setAttachedFile(null);
                              setUploadedDoc(null);
                              setUploadState("idle");
                            }}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors cursor-pointer"
                            title="Remove attached file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-pink-300 rounded-xl p-5 bg-pink-50/40 text-center hover:bg-pink-50/70 transition-colors relative">
                      <input
                        type="file"
                        accept=".pdf,.png,application/pdf,image/png"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                      <div className="text-xs font-bold text-zinc-800">
                        Click or drag & drop to upload document
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Supported formats: <span className="font-semibold text-pink-700">PDF (.pdf)</span> or <span className="font-semibold text-pink-700">PNG (.png)</span> • Max 15MB
                      </div>
                      {uploadError && (
                        <div className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 p-1.5 rounded border border-rose-200">
                          {uploadError}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Narrative Clinical Notes */}
                <div>
                  <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2">
                    Clinical Narrative & Observations
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter visit narrative, patient vital signs, or document summary notes..."
                    value={narrativeContent}
                    onChange={(e) => setNarrativeContent(e.target.value)}
                    className="w-full text-xs font-normal border border-zinc-300 rounded-xl p-3.5 bg-zinc-50 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-pink-500 placeholder-zinc-400 leading-relaxed font-sans"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending || isUploading}
                    className="w-full py-3.5 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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

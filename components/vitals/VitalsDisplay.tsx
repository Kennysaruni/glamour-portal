"use client";

import React from "react";
import {
  Thermometer,
  Activity,
  Heart,
  Wind,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  VitalsData,
  getTemperatureStatus,
  getBloodPressureStatus,
  getHeartRateStatus,
  getOxygenSaturationStatus,
  getRespiratoryRateStatus,
  hasAnyVitals,
} from "@/lib/vitals-utils";

interface VitalsBadgesProps {
  vitals: VitalsData;
  size?: "sm" | "md";
}

/**
 * Compact row of vital sign pills for note cards and activity feeds.
 */
export function VitalsBadges({ vitals, size = "sm" }: VitalsBadgesProps) {
  if (!hasAnyVitals(vitals)) return null;

  const tempStatus = getTemperatureStatus(vitals.temperature, vitals.temperatureUnit || "F");
  const bpStatus = getBloodPressureStatus(vitals.bloodPressureSys, vitals.bloodPressureDia);
  const hrStatus = getHeartRateStatus(vitals.heartRate);
  const spo2Status = getOxygenSaturationStatus(vitals.oxygenSaturation);
  const rrStatus = getRespiratoryRateStatus(vitals.respiratoryRate);

  const isSmall = size === "sm";

  return (
    <div className="flex flex-wrap items-center gap-1.5 my-2">
      {/* Temperature */}
      {vitals.temperature !== undefined && vitals.temperature !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border font-medium ${
            isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          } ${tempStatus?.badgeClass || "bg-slate-50 text-slate-700 border-slate-200"}`}
          title={`Temperature: ${vitals.temperature}°${vitals.temperatureUnit || "F"} (${tempStatus?.label || "Recorded"})`}
        >
          <Thermometer className="w-3 h-3 shrink-0" />
          <span>
            {vitals.temperature}°{vitals.temperatureUnit || "F"}
          </span>
          {tempStatus && tempStatus.status !== "normal" && (
            <span className="font-bold underline ml-0.5">({tempStatus.label})</span>
          )}
        </span>
      )}

      {/* Blood Pressure */}
      {vitals.bloodPressureSys !== undefined && vitals.bloodPressureSys !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border font-medium ${
            isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          } ${bpStatus?.badgeClass || "bg-slate-50 text-slate-700 border-slate-200"}`}
          title={`Blood Pressure: ${vitals.bloodPressureSys}/${vitals.bloodPressureDia || "--"} mmHg (${bpStatus?.label || "Recorded"})`}
        >
          <Activity className="w-3 h-3 shrink-0" />
          <span>
            BP {vitals.bloodPressureSys}/{vitals.bloodPressureDia || "--"}
          </span>
          {bpStatus && bpStatus.status !== "normal" && (
            <span className="font-bold underline ml-0.5">({bpStatus.label})</span>
          )}
        </span>
      )}

      {/* Heart Rate */}
      {vitals.heartRate !== undefined && vitals.heartRate !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border font-medium ${
            isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          } ${hrStatus?.badgeClass || "bg-slate-50 text-slate-700 border-slate-200"}`}
          title={`Heart Rate: ${vitals.heartRate} BPM (${hrStatus?.label || "Recorded"})`}
        >
          <Heart className="w-3 h-3 shrink-0" />
          <span>{vitals.heartRate} BPM</span>
          {hrStatus && hrStatus.status !== "normal" && (
            <span className="font-bold underline ml-0.5">({hrStatus.label})</span>
          )}
        </span>
      )}

      {/* Oxygen Saturation */}
      {vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border font-medium ${
            isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          } ${spo2Status?.badgeClass || "bg-slate-50 text-slate-700 border-slate-200"}`}
          title={`SpO2: ${vitals.oxygenSaturation}% (${spo2Status?.label || "Recorded"})`}
        >
          <span>SpO2 {vitals.oxygenSaturation}%</span>
          {spo2Status && spo2Status.status !== "normal" && (
            <span className="font-bold underline ml-0.5">({spo2Status.label})</span>
          )}
        </span>
      )}

      {/* Respiratory Rate */}
      {vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border font-medium ${
            isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          } ${rrStatus?.badgeClass || "bg-slate-50 text-slate-700 border-slate-200"}`}
          title={`Respiratory Rate: ${vitals.respiratoryRate} bpm (${rrStatus?.label || "Recorded"})`}
        >
          <Wind className="w-3 h-3 shrink-0" />
          <span>{vitals.respiratoryRate} bpm</span>
          {rrStatus && rrStatus.status !== "normal" && (
            <span className="font-bold underline ml-0.5">({rrStatus.label})</span>
          )}
        </span>
      )}
    </div>
  );
}

interface VitalsTableProps {
  notes: any[];
}

/**
 * Chronological table of vital signs with soft conditional highlighting for client details.
 */
export function VitalsTable({ notes }: VitalsTableProps) {
  const notesWithVitals = notes.filter((n) => hasAnyVitals(n));

  if (notesWithVitals.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-xs">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          No Vital Signs Recorded Yet
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Vital signs recorded by caregivers during visit logs will be logged in this chronological flow sheet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>Vital Signs Flowsheet & History</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Chronological log of clinical observations. Amber/Red indicators identify abnormal readings.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Normal
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Borderline/Elevated
          </span>
          <span className="flex items-center gap-1 font-medium text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> High/Abnormal
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-2.5 px-3 whitespace-nowrap">Date & Time</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Caregiver</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Temperature</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Blood Pressure</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Heart Rate</th>
              <th className="py-2.5 px-3 whitespace-nowrap">SpO2 Oxygen</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Respiration</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Clinical Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notesWithVitals.map((n) => {
              const tempStatus = getTemperatureStatus(n.temperature, n.temperatureUnit || "F");
              const bpStatus = getBloodPressureStatus(n.bloodPressureSys, n.bloodPressureDia);
              const hrStatus = getHeartRateStatus(n.heartRate);
              const spo2Status = getOxygenSaturationStatus(n.oxygenSaturation);
              const rrStatus = getRespiratoryRateStatus(n.respiratoryRate);

              return (
                <tr key={n.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Date & Time */}
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                    <div>
                      {new Date(n.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-slate-400">
                      {new Date(n.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>

                  {/* Caregiver */}
                  <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                    {n.employee?.name || "Caregiver"}
                  </td>

                  {/* Temperature */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {n.temperature !== undefined && n.temperature !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {n.temperature}°{n.temperatureUnit || "F"}
                        </span>
                        {tempStatus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tempStatus.badgeClass}`}
                          >
                            {tempStatus.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Blood Pressure */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {n.bloodPressureSys !== undefined && n.bloodPressureSys !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {n.bloodPressureSys}/{n.bloodPressureDia || "--"}
                        </span>
                        <span className="text-[10px] text-slate-400">mmHg</span>
                        {bpStatus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${bpStatus.badgeClass}`}
                          >
                            {bpStatus.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Heart Rate */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {n.heartRate !== undefined && n.heartRate !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{n.heartRate}</span>
                        <span className="text-[10px] text-slate-400">BPM</span>
                        {hrStatus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${hrStatus.badgeClass}`}
                          >
                            {hrStatus.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Oxygen Saturation */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {n.oxygenSaturation !== undefined && n.oxygenSaturation !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{n.oxygenSaturation}%</span>
                        {spo2Status && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${spo2Status.badgeClass}`}
                          >
                            {spo2Status.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Respiratory Rate */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {n.respiratoryRate !== undefined && n.respiratoryRate !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{n.respiratoryRate}</span>
                        <span className="text-[10px] text-slate-400">bpm</span>
                        {rrStatus && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${rrStatus.badgeClass}`}
                          >
                            {rrStatus.label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>

                  {/* Clinical Narrative snippet */}
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={n.content}>
                    {n.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

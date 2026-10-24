"use client";

import React from "react";
import {
  Thermometer,
  Activity,
  Heart,
  Wind,
  AlertCircle,
} from "lucide-react";
import {
  getTemperatureStatus,
  getBloodPressureStatus,
  getHeartRateStatus,
  getOxygenSaturationStatus,
  getRespiratoryRateStatus,
} from "@/lib/vitals-utils";

interface VitalsInputFieldsProps {
  temperature: string;
  setTemperature: (val: string) => void;
  temperatureUnit: "F" | "C";
  setTemperatureUnit: (val: "F" | "C") => void;
  bloodPressureSys: string;
  setBloodPressureSys: (val: string) => void;
  bloodPressureDia: string;
  setBloodPressureDia: (val: string) => void;
  heartRate: string;
  setHeartRate: (val: string) => void;
  oxygenSaturation: string;
  setOxygenSaturation: (val: string) => void;
  respiratoryRate: string;
  setRespiratoryRate: (val: string) => void;
  errors?: Record<string, string>;
}

export function VitalsInputFields({
  temperature,
  setTemperature,
  temperatureUnit,
  setTemperatureUnit,
  bloodPressureSys,
  setBloodPressureSys,
  bloodPressureDia,
  setBloodPressureDia,
  heartRate,
  setHeartRate,
  oxygenSaturation,
  setOxygenSaturation,
  respiratoryRate,
  setRespiratoryRate,
  errors = {},
}: VitalsInputFieldsProps) {
  const tempNum = temperature ? parseFloat(temperature) : null;
  const sysNum = bloodPressureSys ? parseInt(bloodPressureSys, 10) : null;
  const diaNum = bloodPressureDia ? parseInt(bloodPressureDia, 10) : null;
  const hrNum = heartRate ? parseInt(heartRate, 10) : null;
  const spo2Num = oxygenSaturation ? parseInt(oxygenSaturation, 10) : null;
  const rrNum = respiratoryRate ? parseInt(respiratoryRate, 10) : null;

  const tempStatus = getTemperatureStatus(tempNum, temperatureUnit);
  const bpStatus = getBloodPressureStatus(sysNum, diaNum);
  const hrStatus = getHeartRateStatus(hrNum);
  const spo2Status = getOxygenSaturationStatus(spo2Num);
  const rrStatus = getRespiratoryRateStatus(rrNum);

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/70 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>Structured Vital Signs</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Individual clinical numeric readings with real-time range evaluation and typo safeguards.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md self-start sm:self-auto">
          Optional for routine notes • Required for Vitals Checks
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* 1. Body Temperature */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-slate-500" />
              <span>Temperature</span>
            </label>
            {tempStatus && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tempStatus.badgeClass}`}
              >
                {tempStatus.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder={temperatureUnit === "F" ? "98.6" : "37.0"}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg py-2 px-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setTemperatureUnit("F")}
                className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  temperatureUnit === "F"
                    ? "bg-white text-rose-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                °F
              </button>
              <button
                type="button"
                onClick={() => setTemperatureUnit("C")}
                className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  temperatureUnit === "C"
                    ? "bg-white text-rose-600 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                °C
              </button>
            </div>
          </div>
          {errors.temperature && (
            <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.temperature}</span>
            </p>
          )}
        </div>

        {/* 2. Blood Pressure (Systolic / Diastolic) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>Blood Pressure</span>
            </label>
            {bpStatus && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${bpStatus.badgeClass}`}
              >
                {bpStatus.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex-1 relative">
              <input
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="Systolic (120)"
                value={bloodPressureSys}
                onChange={(e) => setBloodPressureSys(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg py-2 px-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
            <span className="text-slate-400 font-bold text-sm">/</span>
            <div className="flex-1 relative">
              <input
                type="number"
                step="1"
                inputMode="numeric"
                placeholder="Diastolic (80)"
                value={bloodPressureDia}
                onChange={(e) => setBloodPressureDia(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg py-2 px-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">mmHg</span>
          </div>
          {(errors.bloodPressureSys || errors.bloodPressureDia) && (
            <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.bloodPressureSys || errors.bloodPressureDia}</span>
            </p>
          )}
        </div>

        {/* 3. Heart Rate (Pulse) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Heart Rate / Pulse</span>
            </label>
            {hrStatus && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${hrStatus.badgeClass}`}
              >
                {hrStatus.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 72"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg py-2 px-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-400 font-medium shrink-0">BPM</span>
          </div>
          {errors.heartRate && (
            <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.heartRate}</span>
            </p>
          )}
        </div>

        {/* 4. Oxygen Saturation (SpO2) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Oxygen Saturation</span>
            </label>
            {spo2Status && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${spo2Status.badgeClass}`}
              >
                {spo2Status.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 98"
              value={oxygenSaturation}
              onChange={(e) => setOxygenSaturation(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg py-2 px-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-400 font-medium shrink-0">% SpO2</span>
          </div>
          {errors.oxygenSaturation && (
            <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.oxygenSaturation}</span>
            </p>
          )}
        </div>

        {/* 5. Respiratory Rate (Optional) */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-slate-500" />
              <span>Respiration (Optional)</span>
            </label>
            {rrStatus && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rrStatus.badgeClass}`}
              >
                {rrStatus.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 16"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg py-2 px-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-400 font-medium shrink-0">breaths/min</span>
          </div>
          {errors.respiratoryRate && (
            <p className="text-[10px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.respiratoryRate}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clinical Vitals Sign Constants, Validation & Threshold Highlighting
 * Standards based on standard adult clinical vitals guidelines for Home Care / Senior Care.
 */

export interface VitalsData {
  temperature?: number | null;
  temperatureUnit?: "F" | "C";
  bloodPressureSys?: number | null;
  bloodPressureDia?: number | null;
  heartRate?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  bloodGlucose?: number | null;
}

export interface VitalStatus {
  status: "normal" | "warning" | "critical";
  label: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
}

// Plausible clinical ranges for data entry validation (catches typos & out-of-bounds numbers)
export const VITALS_BOUNDS = {
  temperatureF: { min: 90.0, max: 110.0, step: 0.1 },
  temperatureC: { min: 32.0, max: 43.3, step: 0.1 },
  bloodPressureSys: { min: 60, max: 260, step: 1 },
  bloodPressureDia: { min: 30, max: 150, step: 1 },
  heartRate: { min: 30, max: 220, step: 1 },
  oxygenSaturation: { min: 50, max: 100, step: 1 },
  respiratoryRate: { min: 6, max: 60, step: 1 },
  bloodGlucose: { min: 20, max: 600, step: 1 },
};

/**
 * Validates entered vitals against physiologically plausible boundaries.
 * Returns an object with errors keyed by field name.
 */
export function validateVitals(vitals: VitalsData): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (vitals.temperature !== undefined && vitals.temperature !== null) {
    const unit = vitals.temperatureUnit || "F";
    const bounds = unit === "C" ? VITALS_BOUNDS.temperatureC : VITALS_BOUNDS.temperatureF;
    if (isNaN(vitals.temperature) || vitals.temperature < bounds.min || vitals.temperature > bounds.max) {
      errors.temperature = `Temperature must be between ${bounds.min}°${unit} and ${bounds.max}°${unit}.`;
    }
  }

  if (vitals.bloodPressureSys !== undefined && vitals.bloodPressureSys !== null) {
    if (
      isNaN(vitals.bloodPressureSys) ||
      vitals.bloodPressureSys < VITALS_BOUNDS.bloodPressureSys.min ||
      vitals.bloodPressureSys > VITALS_BOUNDS.bloodPressureSys.max
    ) {
      errors.bloodPressureSys = `Systolic BP must be between ${VITALS_BOUNDS.bloodPressureSys.min} and ${VITALS_BOUNDS.bloodPressureSys.max} mmHg.`;
    }
  }

  if (vitals.bloodPressureDia !== undefined && vitals.bloodPressureDia !== null) {
    if (
      isNaN(vitals.bloodPressureDia) ||
      vitals.bloodPressureDia < VITALS_BOUNDS.bloodPressureDia.min ||
      vitals.bloodPressureDia > VITALS_BOUNDS.bloodPressureDia.max
    ) {
      errors.bloodPressureDia = `Diastolic BP must be between ${VITALS_BOUNDS.bloodPressureDia.min} and ${VITALS_BOUNDS.bloodPressureDia.max} mmHg.`;
    }
  }

  if (
    vitals.bloodPressureSys !== undefined &&
    vitals.bloodPressureSys !== null &&
    vitals.bloodPressureDia !== undefined &&
    vitals.bloodPressureDia !== null
  ) {
    if (vitals.bloodPressureDia >= vitals.bloodPressureSys) {
      errors.bloodPressureDia = "Diastolic BP must be lower than Systolic BP.";
    }
  }

  if (vitals.heartRate !== undefined && vitals.heartRate !== null) {
    if (
      isNaN(vitals.heartRate) ||
      vitals.heartRate < VITALS_BOUNDS.heartRate.min ||
      vitals.heartRate > VITALS_BOUNDS.heartRate.max
    ) {
      errors.heartRate = `Heart rate must be between ${VITALS_BOUNDS.heartRate.min} and ${VITALS_BOUNDS.heartRate.max} BPM.`;
    }
  }

  if (vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation !== null) {
    if (
      isNaN(vitals.oxygenSaturation) ||
      vitals.oxygenSaturation < VITALS_BOUNDS.oxygenSaturation.min ||
      vitals.oxygenSaturation > VITALS_BOUNDS.oxygenSaturation.max
    ) {
      errors.oxygenSaturation = `Oxygen saturation must be between ${VITALS_BOUNDS.oxygenSaturation.min}% and ${VITALS_BOUNDS.oxygenSaturation.max}%.`;
    }
  }

  if (vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null) {
    if (
      isNaN(vitals.respiratoryRate) ||
      vitals.respiratoryRate < VITALS_BOUNDS.respiratoryRate.min ||
      vitals.respiratoryRate > VITALS_BOUNDS.respiratoryRate.max
    ) {
      errors.respiratoryRate = `Respiratory rate must be between ${VITALS_BOUNDS.respiratoryRate.min} and ${VITALS_BOUNDS.respiratoryRate.max} breaths/min.`;
    }
  }

  if (vitals.bloodGlucose !== undefined && vitals.bloodGlucose !== null) {
    if (
      isNaN(vitals.bloodGlucose) ||
      vitals.bloodGlucose < VITALS_BOUNDS.bloodGlucose.min ||
      vitals.bloodGlucose > VITALS_BOUNDS.bloodGlucose.max
    ) {
      errors.bloodGlucose = `Blood glucose must be between ${VITALS_BOUNDS.bloodGlucose.min} and ${VITALS_BOUNDS.bloodGlucose.max} mg/dL.`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Checks if a note contains any recorded vitals.
 */
export function hasAnyVitals(vitals: VitalsData): boolean {
  return (
    (vitals.temperature !== undefined && vitals.temperature !== null) ||
    (vitals.bloodPressureSys !== undefined && vitals.bloodPressureSys !== null) ||
    (vitals.bloodPressureDia !== undefined && vitals.bloodPressureDia !== null) ||
    (vitals.heartRate !== undefined && vitals.heartRate !== null) ||
    (vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation !== null) ||
    (vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null) ||
    (vitals.bloodGlucose !== undefined && vitals.bloodGlucose !== null)
  );
}

// ----------------------------------------------------------------------------
// CLINICAL THRESHOLD EVALUATION (Soft Amber / Red Badges)
// ----------------------------------------------------------------------------

export function getTemperatureStatus(
  temp?: number | null,
  unit: "F" | "C" = "F"
): VitalStatus | null {
  if (temp === undefined || temp === null || isNaN(temp)) return null;

  const tempF = unit === "C" ? (temp * 9) / 5 + 32 : temp;

  // Hypothermia (< 95.0°F)
  if (tempF < 95.0) {
    return {
      status: "critical",
      label: "Hypothermia",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }

  // Mild Low (95.0 - 96.9°F)
  if (tempF < 97.0) {
    return {
      status: "warning",
      label: "Low Temp",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  // Normal (97.0 - 99.0°F)
  if (tempF <= 99.0) {
    return {
      status: "normal",
      label: "Normal",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      textClass: "text-emerald-700",
      borderClass: "border-emerald-200",
    };
  }

  // Low-grade fever / Elevated (99.1 - 100.3°F)
  if (tempF < 100.4) {
    return {
      status: "warning",
      label: "Elevated",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  // Clinical Fever (>= 100.4°F)
  return {
    status: "critical",
    label: "Fever",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    textClass: "text-rose-700",
    borderClass: "border-rose-300",
  };
}

export function getBloodPressureStatus(
  sys?: number | null,
  dia?: number | null
): VitalStatus | null {
  if (
    (sys === undefined || sys === null || isNaN(sys)) &&
    (dia === undefined || dia === null || isNaN(dia))
  ) {
    return null;
  }

  const s = sys ?? 120;
  const d = dia ?? 80;

  // Hypertensive Crisis
  if (s >= 180 || d >= 120) {
    return {
      status: "critical",
      label: "Crisis Level",
      badgeClass: "bg-rose-100 text-rose-900 border-rose-300 font-bold",
      textClass: "text-rose-800",
      borderClass: "border-rose-400",
    };
  }

  // Stage 2 HTN
  if (s >= 140 || d >= 90) {
    return {
      status: "critical",
      label: "High BP (Stage 2)",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }

  // Stage 1 HTN
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) {
    return {
      status: "warning",
      label: "Stage 1 HTN",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  // Elevated
  if (s >= 120 && s <= 129 && d < 80) {
    return {
      status: "warning",
      label: "Elevated",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  // Hypotension (Low BP)
  if (s < 90 || d < 60) {
    return {
      status: "warning",
      label: "Low BP",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  // Normal (<120 and <80)
  return {
    status: "normal",
    label: "Normal",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  };
}

export function getHeartRateStatus(hr?: number | null): VitalStatus | null {
  if (hr === undefined || hr === null || isNaN(hr)) return null;

  if (hr < 50) {
    return {
      status: "critical",
      label: "Severe Bradycardia",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }

  if (hr < 60) {
    return {
      status: "warning",
      label: "Low HR (Bradycardia)",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  if (hr <= 100) {
    return {
      status: "normal",
      label: "Normal",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      textClass: "text-emerald-700",
      borderClass: "border-emerald-200",
    };
  }

  if (hr < 120) {
    return {
      status: "warning",
      label: "Elevated HR",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  return {
    status: "critical",
    label: "High HR (Tachycardia)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    textClass: "text-rose-700",
    borderClass: "border-rose-300",
  };
}

export function getOxygenSaturationStatus(spo2?: number | null): VitalStatus | null {
  if (spo2 === undefined || spo2 === null || isNaN(spo2)) return null;

  if (spo2 < 90) {
    return {
      status: "critical",
      label: "Low SpO2 (Hypoxemia)",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }

  if (spo2 < 95) {
    return {
      status: "warning",
      label: "Borderline SpO2",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  return {
    status: "normal",
    label: "Normal",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  };
}

export function getRespiratoryRateStatus(rr?: number | null): VitalStatus | null {
  if (rr === undefined || rr === null || isNaN(rr)) return null;

  if (rr < 12) {
    return {
      status: "warning",
      label: "Low RR (Bradypnea)",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  if (rr <= 20) {
    return {
      status: "normal",
      label: "Normal",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      textClass: "text-emerald-700",
      borderClass: "border-emerald-200",
    };
  }

  if (rr <= 25) {
    return {
      status: "warning",
      label: "Elevated RR",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }

  return {
    status: "critical",
    label: "High RR (Tachypnea)",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    textClass: "text-rose-700",
    borderClass: "border-rose-300",
  };
}

export function getBloodGlucoseStatus(glucose?: number | null): VitalStatus | null {
  if (glucose === undefined || glucose === null || isNaN(glucose)) return null;

  if (glucose < 60) {
    return {
      status: "critical",
      label: "Low (Hypo)",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }
  if (glucose >= 200) {
    return {
      status: "critical",
      label: "High (Hyper)",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      textClass: "text-rose-700",
      borderClass: "border-rose-300",
    };
  }
  if (glucose < 70 || glucose >= 140) {
    return {
      status: "warning",
      label: glucose < 70 ? "Slightly Low" : "Elevated",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      textClass: "text-amber-700",
      borderClass: "border-amber-300",
    };
  }
  return {
    status: "normal",
    label: "Normal",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  };
}

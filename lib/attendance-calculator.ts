export interface AttendanceStats {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  totalConducted: number;
  physicallyAttended: number;
  odApproved: number;
  unexcusedAbsent: number;
  physicalPercentage: number;
  odPercentage: number;
  tier: "SAFE" | "MEDICAL_SAFE" | "EXTRACURRICULAR_SAFE" | "CRITICAL";
  tierDescription: string;
  safeToMissFor85: number;
  safeToMissFor75: number;
  safeToMissFor40: number;
}

export interface StudentDualAttendanceSummary {
  studentId: string;
  overallPhysicalPercentage: number;
  overallODPercentage: number;
  overallTier: "SAFE" | "MEDICAL_SAFE" | "EXTRACURRICULAR_SAFE" | "CRITICAL";
  subjects: AttendanceStats[];
  highImportanceAtRiskCount: number;
}

/**
 * Categorize attendance percentage into flexible tiers based on requirements
 */
export function categorizeTier(percentage: number): {
  tier: "SAFE" | "MEDICAL_SAFE" | "EXTRACURRICULAR_SAFE" | "CRITICAL";
  description: string;
} {
  if (percentage >= 85) {
    return {
      tier: "SAFE",
      description: "Safe & Compliant (>= 85%)",
    };
  } else if (percentage >= 75) {
    return {
      tier: "MEDICAL_SAFE",
      description: "Medical Concession Range (75% - 84.9%)",
    };
  } else if (percentage >= 40) {
    return {
      tier: "EXTRACURRICULAR_SAFE",
      description: "Extracurricular / Internship Concession Range (40% - 74.9%)",
    };
  } else {
    return {
      tier: "CRITICAL",
      description: "Critical Risk (< 40%) - Urgent Attendance Needed",
    };
  }
}

/**
 * Calculates how many future classes can be missed before falling below a target percentage threshold.
 * Formula: Floor((CurrentAttended - Target * CurrentConducted) / Target)
 */
export function calculateSafeBunks(attended: number, conducted: number, targetPercent: number): number {
  if (conducted === 0) return 0;
  const targetFraction = targetPercent / 100;
  if (attended / conducted < targetFraction) {
    return 0; // Already below threshold
  }
  // If we conduct `k` more classes and attend 0 of them:
  // (attended) / (conducted + k) >= targetFraction
  // attended >= targetFraction * conducted + targetFraction * k
  // k <= (attended - targetFraction * conducted) / targetFraction
  const safeClasses = Math.floor((attended - targetFraction * conducted) / targetFraction);
  return Math.max(0, safeClasses);
}

/**
 * Calculates attendance needed to recover to target percent if currently below.
 */
export function calculateClassesNeededToRecover(attended: number, conducted: number, targetPercent: number): number {
  if (conducted === 0) return 0;
  const targetFraction = targetPercent / 100;
  if (attended / conducted >= targetFraction) {
    return 0; // Already above
  }
  // If we attend next `n` classes:
  // (attended + n) / (conducted + n) >= targetFraction
  // attended + n >= targetFraction * conducted + targetFraction * n
  // n * (1 - targetFraction) >= targetFraction * conducted - attended
  // n = ceil((targetFraction * conducted - attended) / (1 - targetFraction))
  const needed = Math.ceil((targetFraction * conducted - attended) / (1 - targetFraction));
  return Math.max(0, needed);
}

/**
 * Compute dual attendance metrics for a single subject
 */
export function computeSubjectAttendance(params: {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  baselineConducted: number;
  baselineAttended: number;
  ongoingConducted: number;
  ongoingAttended: number;
  ongoingOD: number;
}): AttendanceStats {
  const totalConducted = params.baselineConducted + params.ongoingConducted;
  const physicallyAttended = params.baselineAttended + params.ongoingAttended;
  const odApproved = params.ongoingOD;
  const totalWithOD = physicallyAttended + odApproved;
  const unexcusedAbsent = Math.max(0, totalConducted - totalWithOD);

  const physicalPercentage = totalConducted > 0 
    ? Number(((physicallyAttended / totalConducted) * 100).toFixed(1)) 
    : 100;

  const odPercentage = totalConducted > 0 
    ? Number((Math.min(100, (totalWithOD / totalConducted) * 100)).toFixed(1)) 
    : 100;

  const { tier, description } = categorizeTier(odPercentage);

  return {
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    subjectCode: params.subjectCode,
    importance: params.importance,
    totalConducted,
    physicallyAttended,
    odApproved,
    unexcusedAbsent,
    physicalPercentage,
    odPercentage,
    tier,
    tierDescription: description,
    safeToMissFor85: calculateSafeBunks(totalWithOD, totalConducted, 85),
    safeToMissFor75: calculateSafeBunks(totalWithOD, totalConducted, 75),
    safeToMissFor40: calculateSafeBunks(totalWithOD, totalConducted, 40),
  };
}

/**
 * Simulation helper: What happens to subject attendance if student misses planned sessions?
 */
export function simulateMissImpact(
  current: AttendanceStats,
  plannedMissedClasses: number,
  isCoveredByOD: boolean
): {
  projectedPhysicalPercentage: number;
  projectedODPercentage: number;
  projectedTier: "SAFE" | "MEDICAL_SAFE" | "EXTRACURRICULAR_SAFE" | "CRITICAL";
  warning: string | null;
} {
  const newConducted = current.totalConducted + plannedMissedClasses;
  const newPhysicallyAttended = current.physicallyAttended;
  const newOD = current.odApproved + (isCoveredByOD ? plannedMissedClasses : 0);
  const newTotalWithOD = newPhysicallyAttended + newOD;

  const projectedPhysicalPercentage = Number(((newPhysicallyAttended / newConducted) * 100).toFixed(1));
  const projectedODPercentage = Number((Math.min(100, (newTotalWithOD / newConducted) * 100)).toFixed(1));
  const { tier } = categorizeTier(projectedODPercentage);

  let warning: string | null = null;
  if (current.importance === "HIGH" && projectedPhysicalPercentage < 75) {
    warning = `Warning: ${current.subjectName} is marked HIGH IMPORTANCE and projected physical attendance will drop to ${projectedPhysicalPercentage}% (independent of OD concessions).`;
  } else if (projectedODPercentage < 40) {
    warning = `Critical: Projected attendance in ${current.subjectName} (${projectedODPercentage}%) will breach the minimum 40% threshold!`;
  }

  return {
    projectedPhysicalPercentage,
    projectedODPercentage,
    projectedTier: tier,
    warning,
  };
}

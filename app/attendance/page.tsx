"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getStudentDashboard, getUsersAndRoles } from "@/app/actions";
import {
  TrendingUp,
  Layers,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { simulateMissImpact } from "@/lib/attendance-calculator";
import { BaselineAttendanceModal } from "@/components/BaselineAttendanceModal";

export default function AttendancePage() {
  const { userId, user } = useCurrentUser();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);

  // Simulator state
  const [simSubjectId, setSimSubjectId] = useState("");
  const [simMissedClasses, setSimMissedClasses] = useState(2);
  const [simIsOD, setSimIsOD] = useState(true);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let studentId = userId;
      if (user?.role !== "STUDENT") {
        const users = await getUsersAndRoles();
        const firstStudent = users.find((u) => u.role === "STUDENT");
        if (firstStudent) studentId = firstStudent.id;
      }
      const res = await getStudentDashboard(studentId);
      setData(res);
      if (res.attendance.subjects.length > 0 && !simSubjectId) {
        setSimSubjectId(res.attendance.subjects[0].subjectId);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const subjects = data?.attendance.subjects || [];
  const selectedSimSubject = subjects.find((s: any) => s.subjectId === simSubjectId) || subjects[0];
  const simResult = selectedSimSubject
    ? simulateMissImpact(selectedSimSubject, simMissedClasses, simIsOD)
    : null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "SAFE":
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "MEDICAL_SAFE":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "EXTRACURRICULAR_SAFE":
        return "text-amber-800 bg-amber-50 border-amber-200";
      default:
        return "text-rose-700 bg-rose-50 border-rose-200";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Dual Attendance Tracking
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Physical In-Person vs Standard On-Duty
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              Subject Attendance &amp; Safe-to-Miss Simulator
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Monitor subject strictness, track attendance thresholds, and simulate absences before taking leave.
            </p>
          </div>

          <button
            onClick={() => setIsBaselineModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-2 self-start sm:self-auto transition shadow-xs"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Update Semester Baseline</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Computing dual attendance metrics...</span>
          </div>
        ) : (
          <>
            {/* Subject Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((sub: any) => (
                <div
                  key={sub.subjectId}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{sub.subjectName}</h4>
                          <span className="text-xs font-mono text-slate-500">({sub.subjectCode})</span>
                        </div>
                        <div className="mt-1">
                          {sub.importance === "HIGH" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              HIGH IMPORTANCE
                            </span>
                          ) : sub.importance === "MEDIUM" ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              MEDIUM
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              LOW
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(
                          sub.tier
                        )}`}
                      >
                        {sub.tier.replace("_", " ")}
                      </span>
                    </div>

                    {/* Dual Progress Bars */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                        <span className="text-[11px] text-indigo-900 font-medium block">Total OD Attendance</span>
                        <span className="text-xl font-bold font-mono text-indigo-700">
                          {sub.odPercentage}%
                        </span>
                        <div className="w-full bg-indigo-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min(100, sub.odPercentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[11px] text-slate-600 font-medium block">Physical In-Person</span>
                        <span className="text-xl font-bold font-mono text-slate-800">
                          {sub.physicalPercentage}%
                        </span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-slate-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, sub.physicalPercentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600 flex items-center justify-between">
                      <span>
                        Conducted: <strong>{sub.totalConducted}</strong> &bull; Attended:{" "}
                        <strong>{sub.physicallyAttended}</strong> &bull; OD:{" "}
                        <strong className="text-indigo-700">{sub.odApproved}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Safe to miss chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Safe to miss:</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-bold">
                        {sub.safeToMissFor85} for &ge;85%
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold">
                        {sub.safeToMissFor75} for &ge;75%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Safe-to-Miss Simulator */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Safe-to-Miss &amp; Leave Simulator</h3>
                  <p className="text-xs text-slate-500">
                    Test the numerical effect of missing lectures before committing to hackathons or events
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Subject
                    </label>
                    <select
                      value={simSubjectId}
                      onChange={(e) => setSimSubjectId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 shadow-xs"
                    >
                      {subjects.map((s: any) => (
                        <option key={s.subjectId} value={s.subjectId}>
                          {s.subjectName} ({s.subjectCode}) - [{s.importance}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Classes to Miss: {simMissedClasses}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={simMissedClasses}
                      onChange={(e) => setSimMissedClasses(parseInt(e.target.value) || 1)}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                      <span>1 class</span>
                      <span>6 classes</span>
                      <span>12 classes</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Covered by On-Duty (OD)?
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Extracurricular leave
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={simIsOD}
                      onChange={(e) => setSimIsOD(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {selectedSimSubject && simResult && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500 font-medium">Target Subject</span>
                          <h4 className="text-base font-bold text-slate-900">
                            {selectedSimSubject.subjectName}
                          </h4>
                        </div>
                        {selectedSimSubject.importance === "HIGH" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            HIGH IMPORTANCE
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Current OD %</span>
                          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                            {selectedSimSubject.odPercentage}%
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 shadow-xs">
                          <span className="text-[10px] text-indigo-700 uppercase font-bold">Projected OD %</span>
                          <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                            {simResult.projectedODPercentage}%
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Physical Presence</span>
                          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                            {simResult.projectedPhysicalPercentage}%
                          </div>
                        </div>
                      </div>

                      {simResult.warning ? (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <strong className="block font-bold">Attendance Caution:</strong>
                            <span>{simResult.warning}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>
                            Safe to miss! Your attendance remains comfortably compliant within the {simResult.projectedTier.replace("_", " ")} tier.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {data?.student && (
        <BaselineAttendanceModal
          isOpen={isBaselineModalOpen}
          onClose={() => setIsBaselineModalOpen(false)}
          studentId={data.student.id}
          subjects={subjects}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

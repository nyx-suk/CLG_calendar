"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Award,
  CheckCircle,
  AlertTriangle,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  GitCommit,
  Info,
} from "lucide-react";

interface LecturerViewProps {
  data: {
    lecturer: any;
    subjects: any[];
    dateStr: string;
    roster: any[];
  };
  currentDate: string;
  onDateChange: (date: string) => void;
}

export function LecturerView({ data, currentDate, onDateChange }: LecturerViewProps) {
  const { lecturer, subjects, roster } = data;
  const [filter, setFilter] = useState<"ALL" | "ON_DUTY" | "ABSENT" | "PRESENT">("ALL");

  const filteredRoster = roster.filter((st) => {
    if (filter === "ALL") return true;
    return st.statusBadge === filter;
  });

  const onDutyCount = roster.filter((r) => r.statusBadge === "ON_DUTY").length;
  const absentCount = roster.filter((r) => r.statusBadge === "ABSENT").length;
  const presentCount = roster.filter((r) => r.statusBadge === "PRESENT").length;

  const handleStepDay = (delta: number) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    onDateChange(dt.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Faculty Transparency Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Subjects: {subjects.map((s) => `${s.name} (${s.code})`).join(", ")}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {lecturer.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Forming an objective view on students &bull; Distinguishing verified project builders from unexcused absences.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] text-blue-800 uppercase font-bold block">On-Duty</span>
              <span className="text-xl font-extrabold font-mono text-blue-900">{onDutyCount}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-800 uppercase font-bold block">Present</span>
              <span className="text-xl font-extrabold font-mono text-emerald-900">{presentCount}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-[10px] text-rose-800 uppercase font-bold block">Unexcused</span>
              <span className="text-xl font-extrabold font-mono text-rose-900">{absentCount}</span>
            </div>
          </div>
        </div>

        {/* Philosophy Note Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Transparency vs Prejudice:</strong> This view reveals when students are missing class for verified hackathons, competitions, or open-source sprints. Faculty can reach out to mentors or students directly to encourage their learning while staying updated on their academic standing.
          </span>
        </div>
      </div>

      {/* Date Controls & Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleStepDay(-1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-base font-bold text-slate-900 font-mono">{currentDate}</span>
          </div>
          <button
            onClick={() => handleStepDay(1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition font-semibold ${
              filter === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Students ({roster.length})
          </button>
          <button
            onClick={() => setFilter("ON_DUTY")}
            className={`px-3 py-1.5 rounded-xl transition font-semibold ${
              filter === "ON_DUTY"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
            }`}
          >
            Verified On-Duty ({onDutyCount})
          </button>
          <button
            onClick={() => setFilter("ABSENT")}
            className={`px-3 py-1.5 rounded-xl transition font-semibold ${
              filter === "ABSENT"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            Unexcused ({absentCount})
          </button>
        </div>
      </div>

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoster.map((st) => (
          <div
            key={st.studentId}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{st.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Roll: <span className="font-mono text-slate-700 font-bold">{st.rollNumber}</span> &bull; Section {st.section}
                  </p>
                </div>

                <div>
                  {st.statusBadge === "ON_DUTY" && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> On-Duty
                    </span>
                  )}
                  {st.statusBadge === "PRESENT" && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Present
                    </span>
                  )}
                  {st.statusBadge === "ABSENT" && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Unexcused Absent
                    </span>
                  )}
                </div>
              </div>

              {/* Status Explanation Context */}
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 block mb-0.5 font-bold">Activity Status:</span>
                <p className="text-slate-800 font-medium">{st.contextNote}</p>

                {st.activeApplication && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Event: <strong className="text-blue-800">{st.activeApplication.title}</strong></span>
                    {st.activeApplication.proofType === "GITHUB_REPO" && (
                      <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                        <GitCommit className="w-3 h-3" /> Dev Project Commits Verified
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mentor Coordination */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Mentor: <strong className="text-slate-800">{st.mentorName || "N/A"}</strong></span>
              {st.mentorEmail && (
                <a
                  href={`mailto:${st.mentorEmail}?subject=Regarding student ${st.name} attendance`}
                  className="text-amber-800 hover:text-amber-950 font-bold hover:underline flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Contact Mentor</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

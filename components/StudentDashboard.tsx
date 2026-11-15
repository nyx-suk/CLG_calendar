"use client";

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  GitCommit,
  Award,
  Layers,
  FileCheck,
  Building,
} from "lucide-react";
import { AttendanceStats, simulateMissImpact } from "@/lib/attendance-calculator";
import { ResolvedDaySchedule } from "@/lib/calendar-generator";
import { EventApplicationModal } from "./EventApplicationModal";
import { BaselineAttendanceModal } from "./BaselineAttendanceModal";

interface StudentDashboardProps {
  data: {
    student: {
      id: string;
      name: string;
      email: string;
      rollNumber?: string | null;
      department?: string | null;
      semester?: number | null;
      section?: string | null;
      githubUsername?: string | null;
      mentor?: { id: string; name: string; email: string } | null;
    };
    attendance: {
      overallPhysicalPercentage: number;
      overallODPercentage: number;
      overallTier: "SAFE" | "MEDICAL_SAFE" | "EXTRACURRICULAR_SAFE" | "CRITICAL";
      overallTierDescription: string;
      subjects: AttendanceStats[];
    };
    daySchedule: ResolvedDaySchedule;
    applications: any[];
    catalogEvents: any[];
    coeEvents: any[];
  };
  currentDate: string;
  onDateChange: (newDate: string) => void;
  onRefresh: () => void;
}

export function StudentDashboard({
  data,
  currentDate,
  onDateChange,
  onRefresh,
}: StudentDashboardProps) {
  const { student, attendance, daySchedule, applications, catalogEvents, coeEvents } = data;

  const [activeTab, setActiveTab] = useState<"CALENDAR" | "SUBJECTS" | "SIMULATOR" | "HUB" | "APPLICATIONS">("CALENDAR");
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | undefined>(currentDate);

  // Simulator state
  const [simSubjectId, setSimSubjectId] = useState(attendance.subjects[0]?.subjectId || "");
  const [simMissedClasses, setSimMissedClasses] = useState(2);
  const [simIsOD, setSimIsOD] = useState(true);

  const selectedSimSubject = attendance.subjects.find((s) => s.subjectId === simSubjectId) || attendance.subjects[0];
  const simResult = selectedSimSubject
    ? simulateMissImpact(selectedSimSubject, simMissedClasses, simIsOD)
    : null;

  const handleStepDay = (delta: number) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    onDateChange(dt.toISOString().split("T")[0]);
  };

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

  const getImportanceBadge = (imp: string) => {
    switch (imp) {
      case "HIGH":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            HIGH IMPORTANCE
          </span>
        );
      case "MEDIUM":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Semester {student.semester || 5} &bull; Section {student.section || "5A"}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Roll: {student.rollNumber || "N/A"}
              </span>
              {student.mentor && (
                <span className="text-xs text-slate-600 font-medium">
                  Mentor: <strong className="text-slate-900">{student.mentor.name}</strong>
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 tracking-tight">
              Welcome back, {student.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Dual attendance tracking active. Balance your lectures and extracurriculars with institutional confidence.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setSelectedSlotDate(currentDate);
                setIsApplyModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ File Event / OD</span>
            </button>

            <button
              onClick={() => setIsBaselineModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs"
              title="Update previous classes attended snapshot"
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Baseline Ingestion</span>
            </button>
          </div>
        </div>

        {/* Dual Attendance Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          {/* Card 1: Total OD Attendance */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Standard On-Duty Attendance</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(attendance.overallTier)}`}>
                {attendance.overallTier.replace("_", " ")}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">
                {attendance.overallODPercentage}%
              </span>
              <span className="text-xs text-slate-500 font-medium">with approved OD</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, attendance.overallODPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Raw Physical Attendance */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Raw In-Person Attendance</span>
              <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                Physical Only
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-700 font-mono">
                {attendance.overallPhysicalPercentage}%
              </span>
              <span className="text-xs text-slate-500 font-medium">classroom presence</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-slate-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, attendance.overallPhysicalPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Tier Policy Context */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Compliance Tier Safety</span>
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xs text-slate-800 mt-2 font-medium">
              {attendance.overallTierDescription}
            </p>
            <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between pt-2 border-t border-slate-200">
              <span>Standard Safe: &ge;85%</span>
              <span>Internship: &ge;40%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab("CALENDAR")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "CALENDAR"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Virtual Calendar &amp; Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("SUBJECTS")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "SUBJECTS"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Subject Attendance ({attendance.subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SIMULATOR")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "SIMULATOR"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Safe-to-Miss Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab("HUB")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "HUB"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Extracurricular Hub</span>
        </button>

        <button
          onClick={() => setActiveTab("APPLICATIONS")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "APPLICATIONS"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>My Applications ({applications.length})</span>
        </button>
      </div>

      {/* TAB 1: VIRTUAL CALENDAR & DAILY TIMETABLE */}
      {activeTab === "CALENDAR" && (
        <div className="space-y-4">
          {/* Day Navigation & Quick Picks */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleStepDay(-1)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">
                    {daySchedule.dayName}, {daySchedule.date}
                  </span>
                  {daySchedule.isCOEOverridden && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        daySchedule.coeHighlight === "YELLOW"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      COE: {daySchedule.coeType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {daySchedule.slots.length} class slot(s) scheduled for this date
                </p>
              </div>
              <button
                onClick={() => handleStepDay(1)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Quick COE test days */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Quick Dates:</span>
              <button
                onClick={() => onDateChange("2026-10-19")}
                className={`px-2.5 py-1 rounded-lg border font-medium transition ${
                  currentDate === "2026-10-19"
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Today (Mon 19)
              </button>
              <button
                onClick={() => onDateChange("2026-10-21")}
                className={`px-2.5 py-1 rounded-lg border font-medium transition ${
                  currentDate === "2026-10-21"
                    ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                    : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                }`}
                title="Wednesday follows Monday schedule"
              >
                Oct 21 (COE Swap)
              </button>
              <button
                onClick={() => onDateChange("2026-10-23")}
                className={`px-2.5 py-1 rounded-lg border font-medium transition ${
                  currentDate === "2026-10-23"
                    ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                    : "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100"
                }`}
                title="Internal Assessment Test"
              >
                Oct 23 (COE IAT)
              </button>
            </div>
          </div>

          {/* COE Special Banner (Yellow / Grey) */}
          {daySchedule.isCOEOverridden && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
                daySchedule.coeHighlight === "YELLOW"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-100 border-slate-300 text-slate-800"
              }`}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <h4 className="font-bold text-sm">
                  Calendar of Events (COE) Notice: {daySchedule.coeTitle}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">{daySchedule.coeNotes}</p>
                {daySchedule.coeType === "TIMETABLE_SWAP" && (
                  <p className="text-xs font-semibold mt-1 text-amber-950">
                    &bull; Effective Schedule: Following Monday Timetable periods.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Timetable Slot List */}
          {daySchedule.slots.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No regular lecture slots today</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {daySchedule.coeType === "IAT"
                  ? "Internal Assessment Test (IAT) day. Regular lecture attendance is exempt."
                  : "Weekend or holiday. Enjoy your time to work on personal projects and hackathons!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {daySchedule.slots.map((slot) => {
                const getStatusPill = (status: string) => {
                  switch (status) {
                    case "ATTENDED":
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Attended
                        </span>
                      );
                    case "ON_DUTY":
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> On-Duty ({slot.eventCategory || "OD"})
                        </span>
                      );
                    case "ABSENT":
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Unexcused Absent
                        </span>
                      );
                    default:
                      return (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Scheduled
                        </span>
                      );
                  }
                };

                return (
                  <div
                    key={slot.slotId}
                    className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center w-16 h-14 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs">
                        <span className="font-bold text-slate-900">{slot.startTime}</span>
                        <span className="text-[10px] text-slate-400">{slot.endTime}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{slot.subjectName}</h4>
                          <span className="text-xs font-mono text-slate-500">({slot.subjectCode})</span>
                          {getImportanceBadge(slot.importance)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          {slot.room && <span>Room: {slot.room}</span>}
                          {slot.lecturerName && <span>Faculty: {slot.lecturerName}</span>}
                          {slot.eventApplicationTitle && (
                            <span className="text-blue-700 font-semibold">
                              &bull; Event: {slot.eventApplicationTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {getStatusPill(slot.status)}
                      <button
                        onClick={() => {
                          setSelectedSlotDate(daySchedule.date);
                          setIsApplyModalOpen(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition font-medium"
                        title="File an event covering this period"
                      >
                        + File OD
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBJECT-WISE DUAL ATTENDANCE */}
      {activeTab === "SUBJECTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attendance.subjects.map((sub) => {
            return (
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
                      <div className="mt-1">{getImportanceBadge(sub.importance)}</div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(
                        sub.tier
                      )}`}
                    >
                      {sub.tier.replace("_", " ")}
                    </span>
                  </div>

                  {/* Dual Meters */}
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

                {/* Safe-to-miss Chips */}
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
            );
          })}
        </div>
      )}

      {/* TAB 3: SAFE-TO-MISS SIMULATOR */}
      {activeTab === "SIMULATOR" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Safe-to-Miss &amp; Event Simulator</h3>
              <p className="text-xs text-slate-500">
                Check whether attending an upcoming hackathon or missing lectures will risk your attendance tiers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Input Controls */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Subject to Simulate
                </label>
                <select
                  value={simSubjectId}
                  onChange={(e) => setSimSubjectId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 shadow-xs"
                >
                  {attendance.subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.subjectName} ({s.subjectCode}) - [{s.importance} IMPORTANCE]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Classes Planned to Miss: {simMissedClasses}
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
                    Will this be On-Duty (OD)?
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Extracurricular / Hackathon leave
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

            {/* Simulation Results Display */}
            <div className="lg:col-span-2 space-y-4">
              {selectedSimSubject && simResult && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Simulation Target</span>
                      <h4 className="text-base font-bold text-slate-900">
                        {selectedSimSubject.subjectName}
                      </h4>
                    </div>
                    {getImportanceBadge(selectedSimSubject.importance)}
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

                  {/* Warning box if high importance or below safe zone */}
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

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-medium">
                    &bull; Note: Professors value physical classroom attendance independently of OD concessions. Keep high-importance subject presence strong!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXTRACURRICULAR HUB */}
      {activeTab === "HUB" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Extracurricular &amp; Innovation Feed</h3>
            <p className="text-xs text-slate-500">
              Discover sanctioned hackathons, sports tournaments, and webinars with automatic OD credit eligibility
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {evt.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono font-medium">
                      {new Date(evt.startDate).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 mt-2">{evt.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{evt.description}</p>

                  {evt.location && (
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5 font-medium">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {evt.link ? (
                    <a
                      href={evt.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                    >
                      <span>Official Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <span />}

                  <button
                    onClick={() => {
                      setSelectedSlotDate(new Date(evt.startDate).toISOString().split("T")[0]);
                      setIsApplyModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                  >
                    Apply for OD Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MY APPLICATIONS */}
      {activeTab === "APPLICATIONS" && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Filed Event Applications</h3>
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
            >
              + File New Event
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No event applications filed yet. Click "+ File Event" to apply for On-Duty leave.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{app.title}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {app.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dates: {new Date(app.startDate).toLocaleDateString()} to{" "}
                        {new Date(app.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      {app.status === "APPROVED" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Mentor Approved
                        </span>
                      )}
                      {app.status === "PENDING_APPROVAL" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          ⏳ Pending Mentor Review
                        </span>
                      )}
                      {app.status === "FLAGGED_BY_COORDINATOR" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          🚩 Flagged by Coordinator
                        </span>
                      )}
                      {app.status === "REJECTED" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proof and Remarks context */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {app.proofType === "GITHUB_REPO" && (
                        <div className="flex items-center gap-1.5 text-indigo-700 font-mono text-[11px] bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                          <GitCommit className="w-3.5 h-3.5" />
                          <span>{app.githubCommitCount ?? 0} commits verified</span>
                        </div>
                      )}
                      {app.proofUrl && (
                        <a
                          href={app.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>View Attached Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {!app.proofUrl && !app.githubRepoUrl && (
                        <span className="text-amber-700 text-[11px] font-medium">
                          ⚠️ No proof attached yet (Required for approval)
                        </span>
                      )}
                    </div>

                    {app.mentorRemarks && (
                      <span className="text-slate-500 text-[11px]">
                        Mentor Note: <em className="text-slate-800 font-medium not-italic">{app.mentorRemarks}</em>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EventApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        studentId={student.id}
        initialDate={selectedSlotDate}
        onSuccess={onRefresh}
      />

      <BaselineAttendanceModal
        isOpen={isBaselineModalOpen}
        onClose={() => setIsBaselineModalOpen(false)}
        studentId={student.id}
        subjects={attendance.subjects}
        onSuccess={onRefresh}
      />
    </div>
  );
}

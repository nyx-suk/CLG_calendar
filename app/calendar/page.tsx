"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getStudentDashboard, getUsersAndRoles } from "@/app/actions";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Award,
  PlusCircle,
  Building,
  Loader2,
} from "lucide-react";
import { EventApplicationModal } from "@/components/EventApplicationModal";

export default function CalendarPage() {
  const { userId, user, loading: userLoading } = useCurrentUser();
  const [currentDate, setCurrentDate] = useState("2026-10-19");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState(currentDate);

  const loadSchedule = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let studentId = userId;
      if (user?.role !== "STUDENT") {
        const users = await getUsersAndRoles();
        const firstStudent = users.find((u) => u.role === "STUDENT");
        if (firstStudent) studentId = firstStudent.id;
      }
      const res = await getStudentDashboard(studentId, currentDate);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadSchedule();
    }
  }, [userId, currentDate]);

  const handleStepDay = (delta: number) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    setCurrentDate(dt.toISOString().split("T")[0]);
  };

  const daySchedule = data?.daySchedule;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Virtual Calendar Engine
              </span>
              <span className="text-xs text-slate-500 font-medium">
                COE Timetable Swaps &bull; IAT Exams &bull; Active OD Blocks
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              Class Schedule &amp; Calendar of Events
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Accurately maps daily lecture slots with college highlight shifts and your extracurricular commitments.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedSlotDate(currentDate);
              setIsApplyModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 self-start sm:self-auto transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ File Event / OD</span>
          </button>
        </div>

        {/* Date Stepper & Quick COE Test Days */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
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
                  {daySchedule?.dayName || "Loading..."}, {currentDate}
                </span>
                {daySchedule?.isCOEOverridden && (
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
              <p className="text-xs text-slate-500 font-medium">
                {daySchedule?.slots.length ?? 0} class slot(s) resolved for this date
              </p>
            </div>
            <button
              onClick={() => handleStepDay(1)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Test COE Dates:</span>
            <button
              onClick={() => setCurrentDate("2026-10-19")}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition ${
                currentDate === "2026-10-19"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Today (Mon 19)
            </button>
            <button
              onClick={() => setCurrentDate("2026-10-21")}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition ${
                currentDate === "2026-10-21"
                  ? "bg-amber-600 border-amber-600 text-white shadow-xs"
                  : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
              }`}
              title="Wednesday follows Monday schedule"
            >
              Oct 21 (COE Timetable Swap)
            </button>
            <button
              onClick={() => setCurrentDate("2026-10-23")}
              className={`px-3 py-1.5 rounded-xl border font-semibold transition ${
                currentDate === "2026-10-23"
                  ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                  : "bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100"
              }`}
              title="Internal Assessment Test"
            >
              Oct 23 (COE IAT Exam)
            </button>
          </div>
        </div>

        {/* COE Highlight Banner */}
        {daySchedule?.isCOEOverridden && (
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
                COE Special Event Notice: {daySchedule.coeTitle}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">{daySchedule.coeNotes}</p>
              {daySchedule.coeType === "TIMETABLE_SWAP" && (
                <p className="text-xs font-semibold mt-1 text-amber-950">
                  &bull; Timetable Override: Running Monday schedule periods today.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Daily Schedule Slots */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Resolving daily timetable slots...</span>
          </div>
        ) : daySchedule?.slots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No regular lecture slots today</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {daySchedule?.coeType === "IAT"
                ? "Internal Assessment Test (IAT) day. Regular lecture attendance is exempt."
                : "Weekend or holiday. Enjoy your time to work on personal projects and hackathons!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {daySchedule.slots.map((slot: any) => {
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
                        {slot.importance === "HIGH" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            HIGH IMPORTANCE
                          </span>
                        )}
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
      </main>

      {/* Modal */}
      {data?.student && (
        <EventApplicationModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          studentId={data.student.id}
          initialDate={selectedSlotDate}
          onSuccess={loadSchedule}
        />
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StudentDashboard } from "@/components/StudentDashboard";
import { MentorDashboard } from "@/components/MentorDashboard";
import { LecturerView } from "@/components/LecturerView";
import { CoordinatorDashboard } from "@/components/CoordinatorDashboard";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  getStudentDashboard,
  getMentorDashboard,
  getLecturerRoster,
  getCoordinatorAudit,
} from "@/app/actions";
import { Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const { userId, user, loading: userLoading } = useCurrentUser();
  const [currentDate, setCurrentDate] = useState<string>("2026-10-19");
  const [loading, setLoading] = useState<boolean>(true);
  const [roleData, setRoleData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId || !user) return;

    setLoading(true);
    setError(null);
    try {
      if (user.role === "STUDENT") {
        const data = await getStudentDashboard(userId, currentDate);
        setRoleData(data);
      } else if (user.role === "MENTOR") {
        const data = await getMentorDashboard(userId);
        setRoleData(data);
      } else if (user.role === "LECTURER") {
        const data = await getLecturerRoster(userId, currentDate);
        setRoleData(data);
      } else if (user.role === "COORDINATOR") {
        const data = await getCoordinatorAudit();
        setRoleData(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [userId, user, currentDate]);

  useEffect(() => {
    if (userId && user) {
      loadData();
    }
  }, [userId, user, currentDate, loadData]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {(loading || userLoading) && !roleData ? (
          <div className="py-28 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs sm:text-sm font-semibold">Resolving calendar &amp; attendance metrics...</p>
          </div>
        ) : (
          <>
            {user?.role === "STUDENT" && roleData && (
              <StudentDashboard
                data={roleData}
                currentDate={currentDate}
                onDateChange={(d) => setCurrentDate(d)}
                onRefresh={loadData}
              />
            )}

            {user?.role === "MENTOR" && roleData && (
              <MentorDashboard data={roleData} onRefresh={loadData} />
            )}

            {user?.role === "LECTURER" && roleData && (
              <LecturerView
                data={roleData}
                currentDate={currentDate}
                onDateChange={(d) => setCurrentDate(d)}
              />
            )}

            {user?.role === "COORDINATOR" && roleData && (
              <CoordinatorDashboard data={roleData} onRefresh={loadData} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500 font-medium">
        CampusFlow &bull; The Attendance &amp; Extracurricular Manager &bull; Built for fair, transparent student &amp; faculty collaboration
      </footer>
    </div>
  );
}

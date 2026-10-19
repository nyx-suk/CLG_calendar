"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { StudentDashboard } from "@/components/StudentDashboard";
import { MentorDashboard } from "@/components/MentorDashboard";
import { LecturerView } from "@/components/LecturerView";
import { CoordinatorDashboard } from "@/components/CoordinatorDashboard";
import {
  getUsersAndRoles,
  getStudentDashboard,
  getMentorDashboard,
  getLecturerRoster,
  getCoordinatorAudit,
} from "@/app/actions";
import { Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("2026-10-19");
  const [loading, setLoading] = useState<boolean>(true);
  const [roleData, setRoleData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial load: Fetch all demo users
  useEffect(() => {
    async function init() {
      try {
        const userList = await getUsersAndRoles();
        setUsers(userList);
        // Default to first student (Aarav Sharma)
        const defaultStudent = userList.find((u) => u.role === "STUDENT");
        if (defaultStudent) {
          setCurrentUserId(defaultStudent.id);
        } else if (userList.length > 0) {
          setCurrentUserId(userList[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize app");
      }
    }
    init();
  }, []);

  // Fetch active role data whenever currentUserId or currentDate changes
  const loadData = useCallback(async () => {
    if (!currentUserId) return;
    const currentUser = users.find((u) => u.id === currentUserId);
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    try {
      if (currentUser.role === "STUDENT") {
        const data = await getStudentDashboard(currentUserId, currentDate);
        setRoleData(data);
      } else if (currentUser.role === "MENTOR") {
        const data = await getMentorDashboard(currentUserId);
        setRoleData(data);
      } else if (currentUser.role === "LECTURER") {
        const data = await getLecturerRoster(currentUserId, currentDate);
        setRoleData(data);
      } else if (currentUser.role === "COORDINATOR") {
        const data = await getCoordinatorAudit();
        setRoleData(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentDate, users]);

  useEffect(() => {
    if (currentUserId && users.length > 0) {
      loadData();
    }
  }, [currentUserId, currentDate, users, loadData]);

  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        users={users}
        currentUserId={currentUserId}
        onSelectUser={(newId) => setCurrentUserId(newId)}
        activeRole={currentUser?.role || "STUDENT"}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !roleData ? (
          <div className="py-28 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs sm:text-sm font-medium">Resolving calendar &amp; attendance metrics...</p>
          </div>
        ) : (
          <>
            {currentUser?.role === "STUDENT" && roleData && (
              <StudentDashboard
                data={roleData}
                currentDate={currentDate}
                onDateChange={(d) => setCurrentDate(d)}
                onRefresh={loadData}
              />
            )}

            {currentUser?.role === "MENTOR" && roleData && (
              <MentorDashboard data={roleData} onRefresh={loadData} />
            )}

            {currentUser?.role === "LECTURER" && roleData && (
              <LecturerView
                data={roleData}
                currentDate={currentDate}
                onDateChange={(d) => setCurrentDate(d)}
              />
            )}

            {currentUser?.role === "COORDINATOR" && roleData && (
              <CoordinatorDashboard data={roleData} onRefresh={loadData} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        CampusFlow &bull; The Attendance &amp; Extracurricular Manager &bull; Built for fair, transparent student &amp; faculty collaboration
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getLecturerRoster, getUsersAndRoles } from "@/app/actions";
import { LecturerView } from "@/components/LecturerView";
import { Loader2 } from "lucide-react";

export default function LecturerPage() {
  const { userId, user } = useCurrentUser();
  const [currentDate, setCurrentDate] = useState("2026-10-19");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      let lecturerId = userId;
      if (user?.role !== "LECTURER") {
        const users = await getUsersAndRoles();
        const firstLecturer = users.find((u) => u.role === "LECTURER");
        if (firstLecturer) lecturerId = firstLecturer.id;
      }
      if (lecturerId) {
        const res = await getLecturerRoster(lecturerId, currentDate);
        setData(res);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, user, currentDate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            <span className="text-xs font-medium">Loading faculty transparency roster...</span>
          </div>
        ) : data ? (
          <LecturerView
            data={data}
            currentDate={currentDate}
            onDateChange={(d) => setCurrentDate(d)}
          />
        ) : null}
      </main>
    </div>
  );
}

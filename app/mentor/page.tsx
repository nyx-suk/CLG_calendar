"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getMentorDashboard, getUsersAndRoles } from "@/app/actions";
import { MentorDashboard } from "@/components/MentorDashboard";
import { Loader2 } from "lucide-react";

export default function MentorPage() {
  const { userId, user } = useCurrentUser();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      let mentorId = userId;
      if (user?.role !== "MENTOR") {
        const users = await getUsersAndRoles();
        const firstMentor = users.find((u) => u.role === "MENTOR");
        if (firstMentor) mentorId = firstMentor.id;
      }
      if (mentorId) {
        const res = await getMentorDashboard(mentorId);
        setData(res);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, user]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Loading mentor review queue...</span>
          </div>
        ) : data ? (
          <MentorDashboard data={data} onRefresh={loadData} />
        ) : null}
      </main>
    </div>
  );
}

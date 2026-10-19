"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { getCoordinatorAudit } from "@/app/actions";
import { CoordinatorDashboard } from "@/components/CoordinatorDashboard";
import { Loader2 } from "lucide-react";

export default function CoordinatorPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCoordinatorAudit();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            <span className="text-xs font-medium">Loading institutional audit console...</span>
          </div>
        ) : data ? (
          <CoordinatorDashboard data={data} onRefresh={loadData} />
        ) : null}
      </main>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Shield,
  Search,
  ExternalLink,
  Flag,
  AlertTriangle,
  GitCommit,
  FileText,
  Loader2,
} from "lucide-react";
import { flagApplicationByCoordinator } from "@/app/actions";

interface CoordinatorProps {
  data: {
    coordinator: any;
    applications: any[];
  };
  onRefresh: () => void;
}

export function CoordinatorDashboard({ data, onRefresh }: CoordinatorProps) {
  const { coordinator, applications } = data;
  const [search, setSearch] = useState("");
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagNotes, setFlagNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = applications.filter((app) => {
    const q = search.toLowerCase();
    return (
      app.title.toLowerCase().includes(q) ||
      app.student.name.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q)
    );
  });

  const handleFlag = async (appId: string) => {
    if (!flagNotes.trim()) {
      alert("Please provide audit notes explaining the concern.");
      return;
    }
    setSubmitting(true);
    try {
      await flagApplicationByCoordinator({
        applicationId: appId,
        flagNotes,
      });
      setFlaggingId(null);
      setFlagNotes("");
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Institutional Audit Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">{coordinator?.department}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {coordinator?.name || "Institutional Coordinator"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Auditing proof authenticity &bull; Secondary verification console to prevent fraudulent leaves.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
            <span className="text-xs text-rose-800 font-semibold block">Total Auditable Records</span>
            <span className="text-2xl font-extrabold font-mono text-rose-900">{applications.length}</span>
          </div>
        </div>
      </div>

      {/* Search & Audit Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, event, or category..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} applications
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Event &amp; Student</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Proof Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{app.title}</div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {app.student.name} ({app.student.rollNumber || "N/A"}) &bull; Mentor:{" "}
                      {app.student.mentor?.name || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {app.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-medium">
                    {new Date(app.startDate).toLocaleDateString()} -{" "}
                    {new Date(app.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {app.proofType === "GITHUB_REPO" ? (
                      <div className="flex items-center gap-1.5 text-indigo-700 font-mono text-[11px] font-semibold">
                        <GitCommit className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600" />
                        <a
                          href={app.githubRepoUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{app.githubCommitCount ?? 0} commits</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ) : app.proofUrl ? (
                      <a
                        href={app.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Inspect Document</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-amber-700 text-[11px] font-medium">No proof file</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {app.status === "APPROVED" && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Approved
                      </span>
                    )}
                    {app.status === "FLAGGED_BY_COORDINATOR" && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Flagged
                      </span>
                    )}
                    {app.status === "PENDING_APPROVAL" && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {app.status === "FLAGGED_BY_COORDINATOR" ? (
                      <span className="text-[11px] text-rose-700 font-bold">Flagged</span>
                    ) : (
                      <button
                        onClick={() => setFlaggingId(app.id)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 transition text-[11px] font-semibold flex items-center gap-1 ml-auto shadow-xs"
                      >
                        <Flag className="w-3 h-3 text-rose-600" />
                        <span>Flag Proof</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagging Modal */}
      {flaggingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Flag Application for Investigation</span>
            </div>
            <p className="text-xs text-slate-600">
              Provide reasoning for the mentor and institutional records regarding why this proof is suspected of irregularity.
            </p>
            <textarea
              rows={3}
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              placeholder="e.g. Commit dates do not match student activity; document seal appears invalid..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setFlaggingId(null);
                  setFlagNotes("");
                }}
                className="px-3.5 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleFlag(flaggingId)}
                disabled={submitting}
                className="px-4 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                <span>Confirm Flag</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

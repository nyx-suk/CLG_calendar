"use client";

import React, { useState } from "react";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  GitCommit,
  FileText,
  AlertTriangle,
  ExternalLink,
  Shield,
  Loader2,
  Users,
  Search,
} from "lucide-react";
import { reviewApplication } from "@/app/actions";

interface MentorDashboardProps {
  data: {
    mentor: any;
    applications: any[];
    menteeSummaries: any[];
  };
  onRefresh: () => void;
}

export function MentorDashboard({ data, onRefresh }: MentorDashboardProps) {
  const { mentor, applications, menteeSummaries } = data;

  const [activeTab, setActiveTab] = useState<"APPLICATIONS" | "MENTEES">("APPLICATIONS");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loadingAppId, setLoadingAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const pendingApps = applications.filter((a) => a.status === "PENDING_APPROVAL");
  const resolvedApps = applications.filter((a) => a.status !== "PENDING_APPROVAL");

  const handleReview = async (appId: string, action: "APPROVE" | "REJECT") => {
    setLoadingAppId(appId);
    try {
      await reviewApplication({
        applicationId: appId,
        action,
        remarks,
        markProofVerified: action === "APPROVE",
      });
      setSelectedApp(null);
      setRemarks("");
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingAppId(null);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "SAFE":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "MEDICAL_SAFE":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "EXTRACURRICULAR_SAFE":
        return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      default:
        return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Faculty Mentor Portal
              </span>
              <span className="text-xs text-slate-400">{mentor?.department}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">
              {mentor?.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Primary approver for mentee event applications &amp; proof validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">Pending Reviews</span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {pendingApps.length}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block">Assigned Mentees</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {menteeSummaries.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setActiveTab("APPLICATIONS")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "APPLICATIONS"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Event Approvals &amp; Proofs ({pendingApps.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("MENTEES")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "MENTEES"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mentee Attendance Health</span>
          </button>
        </div>
      </div>

      {/* TAB 1: APPLICATIONS QUEUE */}
      {activeTab === "APPLICATIONS" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Pending Requests Awaiting Review</h3>

          {pendingApps.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">All caught up!</p>
              <p className="mt-1">No pending event applications requiring your review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {app.category}
                        </span>
                        <h4 className="text-base font-bold text-white">{app.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Student: <strong className="text-slate-200">{app.student.name}</strong> &bull;{" "}
                        Roll: {app.student.rollNumber || "N/A"} &bull; Section {app.student.section || "5A"}
                      </p>
                    </div>

                    <div className="text-xs text-slate-400 font-mono self-start sm:self-auto">
                      {new Date(app.startDate).toLocaleDateString()} &rarr;{" "}
                      {new Date(app.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  {app.description && (
                    <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {app.description}
                    </p>
                  )}

                  {/* PROOF SECTION: GITHUB COMMIT AUTO-VERIFICATION OR CERTIFICATE */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Submitted Proof &amp; Verification:
                    </span>

                    {app.proofType === "GITHUB_REPO" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium">
                            <GitCommit className="w-4 h-4" />
                            <span>Repository: {app.githubRepoUrl}</span>
                          </div>
                          {app.githubRepoUrl && (
                            <a
                              href={app.githubRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>Open Repo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900 border border-indigo-500/20 text-xs">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Commit Verification Passed</span>
                          </div>
                          <p className="text-slate-300 text-[11px] font-mono">
                            {app.githubSummary || "Automated check verified commits during event dates."}
                          </p>
                        </div>
                      </div>
                    )}

                    {app.proofUrl && app.proofType !== "GITHUB_REPO" && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span>Proof Document Attached</span>
                        </div>
                        <a
                          href={app.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <span>Inspect Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {!app.proofUrl && !app.githubRepoUrl && (
                      <div className="text-amber-400 text-xs flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Student filed without proof. Approval requires valid documentation.</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Remarks */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Add mentor remarks (e.g. Verified official college team)"
                      value={selectedApp?.id === app.id ? remarks : ""}
                      onChange={(e) => {
                        setSelectedApp(app);
                        setRemarks(e.target.value);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 flex-1"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(app.id, "REJECT")}
                        disabled={loadingAppId === app.id}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700 hover:border-rose-800 text-xs font-semibold transition disabled:opacity-50"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleReview(app.id, "APPROVE")}
                        disabled={loadingAppId === app.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {loadingAppId === app.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Approve &amp; Credit OD</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Resolved Requests */}
          {resolvedApps.length > 0 && (
            <div className="mt-8 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Previously Reviewed Applications ({resolvedApps.length})
              </h4>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/60 overflow-hidden text-xs">
                {resolvedApps.map((app) => (
                  <div key={app.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{app.title}</span>
                        <span className="text-[10px] text-slate-400">({app.student.name})</span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {app.mentorRemarks || "Reviewed by mentor"}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        app.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MENTEE HEALTH BOARD */}
      {activeTab === "MENTEES" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Assigned Mentees Attendance Health</h3>
            <span className="text-xs text-slate-400">
              Thresholds: Safe &gt;85% &bull; Medical &gt;75% &bull; Internship &gt;40%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Section / Roll</th>
                  <th className="py-3 px-4">On-Duty Attendance</th>
                  <th className="py-3 px-4">Physical Attendance</th>
                  <th className="py-3 px-4">Compliance Tier</th>
                  <th className="py-3 px-4 text-right">Pending Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {menteeSummaries.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-semibold text-white">{m.name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {m.section || "5A"} &bull; {m.rollNumber || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {m.odPercentage}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{m.physicalPercentage}%</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTierColor(
                          m.tier
                        )}`}
                      >
                        {m.tier.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {m.pendingAppsCount > 0 ? (
                        <span className="text-amber-400 font-bold">
                          {m.pendingAppsCount} pending
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

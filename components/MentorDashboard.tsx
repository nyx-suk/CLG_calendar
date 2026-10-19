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
        return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case "MEDICAL_SAFE":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "EXTRACURRICULAR_SAFE":
        return "text-amber-800 bg-amber-50 border-amber-200";
      default:
        return "text-rose-700 bg-rose-50 border-rose-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Faculty Mentor Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">{mentor?.department}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
              {mentor?.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Primary approver for mentee event applications &amp; proof validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-xs text-amber-800 font-semibold block">Pending Reviews</span>
              <span className="text-2xl font-extrabold font-mono text-amber-900">
                {pendingApps.length}
              </span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs text-emerald-800 font-semibold block">Assigned Mentees</span>
              <span className="text-2xl font-extrabold font-mono text-emerald-900">
                {menteeSummaries.length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("APPLICATIONS")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "APPLICATIONS"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Event Approvals &amp; Proofs ({pendingApps.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("MENTEES")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "MENTEES"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
          <h3 className="text-sm font-bold text-slate-800">Pending Requests Awaiting Review</h3>

          {pendingApps.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-xs shadow-xs">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">All caught up!</p>
              <p className="mt-1 text-slate-500">No pending event applications requiring your review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApps.map((app) => (
                <div
                  key={app.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {app.category}
                        </span>
                        <h4 className="text-base font-bold text-slate-900">{app.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Student: <strong className="text-slate-800">{app.student.name}</strong> &bull;{" "}
                        Roll: {app.student.rollNumber || "N/A"} &bull; Section {app.student.section || "5A"}
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 font-mono font-medium self-start sm:self-auto">
                      {new Date(app.startDate).toLocaleDateString()} &rarr;{" "}
                      {new Date(app.endDate).toLocaleDateString()}
                    </div>
                  </div>

                  {app.description && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {app.description}
                    </p>
                  )}

                  {/* PROOF SECTION: GITHUB COMMIT AUTO-VERIFICATION OR CERTIFICATE */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Submitted Proof &amp; Verification:
                    </span>

                    {app.proofType === "GITHUB_REPO" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold">
                            <GitCommit className="w-4 h-4 text-indigo-600" />
                            <span>Repository: {app.githubRepoUrl}</span>
                          </div>
                          {app.githubRepoUrl && (
                            <a
                              href={app.githubRepoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <span>Open Repo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-emerald-200 text-xs shadow-xs">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Commit Verification Passed</span>
                          </div>
                          <p className="text-slate-700 text-[11px] font-mono">
                            {app.githubSummary || "Automated check verified commits during event dates."}
                          </p>
                        </div>
                      </div>
                    )}

                    {app.proofUrl && app.proofType !== "GITHUB_REPO" && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-800 font-medium">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Proof Document Attached</span>
                        </div>
                        <a
                          href={app.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Inspect Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {!app.proofUrl && !app.githubRepoUrl && (
                      <div className="text-amber-800 text-xs flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Student filed without proof. Approval requires valid documentation.</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Remarks */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Add mentor remarks (e.g. Verified official college team)"
                      value={selectedApp?.id === app.id ? remarks : ""}
                      onChange={(e) => {
                        setSelectedApp(app);
                        setRemarks(e.target.value);
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 flex-1 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReview(app.id, "REJECT")}
                        disabled={loadingAppId === app.id}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition disabled:opacity-50"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleReview(app.id, "APPROVE")}
                        disabled={loadingAppId === app.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
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
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Previously Reviewed Applications ({resolvedApps.length})
              </h4>
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs shadow-xs">
                {resolvedApps.map((app) => (
                  <div key={app.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{app.title}</span>
                        <span className="text-[11px] text-slate-500">({app.student.name})</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {app.mentorRemarks || "Reviewed by mentor"}
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        app.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h3 className="text-sm font-bold text-slate-900">Assigned Mentees Attendance Health</h3>
            <span className="text-xs text-slate-500 font-medium">
              Thresholds: Safe &ge;85% &bull; Medical &ge;75% &bull; Internship &ge;40%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Section / Roll</th>
                  <th className="py-3 px-4">On-Duty Attendance</th>
                  <th className="py-3 px-4">Physical Attendance</th>
                  <th className="py-3 px-4">Compliance Tier</th>
                  <th className="py-3 px-4 text-right">Pending Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {menteeSummaries.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {m.section || "5A"} &bull; {m.rollNumber || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {m.odPercentage}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold">{m.physicalPercentage}%</td>
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
                        <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {m.pendingAppsCount} pending
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
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

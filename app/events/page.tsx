"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getStudentDashboard, getUsersAndRoles } from "@/app/actions";
import {
  Award,
  PlusCircle,
  ExternalLink,
  GitCommit,
  Building,
  Loader2,
  Calendar,
  FileCheck,
} from "lucide-react";
import { EventApplicationModal } from "@/components/EventApplicationModal";

export default function EventsPage() {
  const { userId, user } = useCurrentUser();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"FEED" | "MY_APPLICATIONS">("FEED");

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let studentId = userId;
      if (user?.role !== "STUDENT") {
        const users = await getUsersAndRoles();
        const firstStudent = users.find((u) => u.role === "STUDENT");
        if (firstStudent) studentId = firstStudent.id;
      }
      const res = await getStudentDashboard(studentId);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const catalog = data?.catalogEvents || [];
  const applications = data?.applications || [];

  const filteredCatalog = catalog.filter((evt: any) => {
    if (categoryFilter === "ALL") return true;
    return evt.category === categoryFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Extracurricular Hub &bull; On-Duty Applications
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              Sanctioned Events &amp; Leaves
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Explore sanctioned hackathons, open source sprints, tournaments, and track your submitted applications.
            </p>
          </div>

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 self-start sm:self-auto transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ File New Event</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("FEED")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "FEED"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Events Feed ({catalog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("MY_APPLICATIONS")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "MY_APPLICATIONS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>My Applications ({applications.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading events...</span>
          </div>
        ) : activeTab === "FEED" ? (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
              {["ALL", "HACKATHON", "PROJECT", "SPORTS", "WEBINAR", "INTERNSHIP"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat === "ALL" ? "All Categories" : cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCatalog.map((evt: any) => (
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
                      onClick={() => setIsApplyModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
                    >
                      Apply for OD Leave
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-900">Your Submitted Applications</h3>
              <span className="text-xs text-slate-500 font-medium">
                {applications.length} filed record(s)
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                No applications submitted yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app: any) => (
                  <div key={app.id} className="p-5 hover:bg-slate-50/70 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{app.title}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {app.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
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

                    <div className="pt-2 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-500">
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
                            <span>Inspect Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {app.mentorRemarks && (
                        <span className="text-slate-600 text-[11px]">
                          Mentor Remark: <strong className="text-slate-800 font-medium">{app.mentorRemarks}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      {data?.student && (
        <EventApplicationModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          studentId={data.student.id}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

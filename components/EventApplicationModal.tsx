"use client";

import React, { useState } from "react";
import { X, Calendar, GitCommit, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { fileEventApplication } from "@/app/actions";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  initialDate?: string;
  onSuccess: () => void;
}

export function EventApplicationModal({
  isOpen,
  onClose,
  studentId,
  initialDate,
  onSuccess,
}: EventModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("HACKATHON");
  const [startDate, setStartDate] = useState(initialDate || "2026-10-20");
  const [endDate, setEndDate] = useState(initialDate || "2026-10-21");
  const [description, setDescription] = useState("");
  const [proofType, setProofType] = useState<"GITHUB_REPO" | "CERTIFICATE" | "MEDICAL_SLIP" | "TICKET" | "NONE">("GITHUB_REPO");
  const [proofUrl, setProofUrl] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("https://github.com/facebook/rocksdb");
  const [githubUsername, setGithubUsername] = useState("aarav-code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await fileEventApplication({
        studentId,
        title,
        category,
        startDate: `${startDate}T09:00:00Z`,
        endDate: `${endDate}T18:00:00Z`,
        description,
        proofType: proofType === "NONE" ? undefined : proofType,
        proofUrl: proofType !== "GITHUB_REPO" && proofType !== "NONE" ? proofUrl : undefined,
        githubRepoUrl: proofType === "GITHUB_REPO" ? githubRepoUrl : undefined,
        githubUsername: proofType === "GITHUB_REPO" ? githubUsername : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">File Extracurricular / Event</h3>
              <p className="text-xs text-slate-500">Request On-Duty (OD) attendance credit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Smart India Hackathon 2026, Linux Kernel Sprint"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value === "PROJECT") setProofType("GITHUB_REPO");
                  else if (e.target.value === "MEDICAL") setProofType("MEDICAL_SLIP");
                  else setProofType("CERTIFICATE");
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="HACKATHON">🏆 Hackathon</option>
                <option value="PROJECT">💻 Development / Open Source Project</option>
                <option value="SPORTS">⚽ Sports Tournament</option>
                <option value="MEDICAL">🏥 Medical Leave</option>
                <option value="INTERNSHIP">💼 Internship (&gt;40% Flexible Tier)</option>
                <option value="EXAM">📝 External / Makeup Exam</option>
                <option value="WEBINAR">🎓 Technical Webinar / Conference</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Proof Method
              </label>
              <select
                value={proofType}
                onChange={(e) => setProofType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="GITHUB_REPO">GitHub Commits (Auto-Verified)</option>
                <option value="CERTIFICATE">Certificate / Document Link</option>
                <option value="MEDICAL_SLIP">Medical Prescription / Slip</option>
                <option value="TICKET">Registration Ticket / Admit Card</option>
                <option value="NONE">File Without Proof (Add Later)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Conditional Proof Inputs */}
          {proofType === "GITHUB_REPO" && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <GitCommit className="w-4 h-4 text-indigo-600" />
                <span>Automated GitHub Commit Verification</span>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">GitHub Repo URL</label>
                <input
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">GitHub Username (optional)</label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. aarav-code"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Our engine automatically queries public commits made between start and end dates.
              </p>
            </div>
          )}

          {proofType !== "GITHUB_REPO" && proofType !== "NONE" && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Proof URL or Cloud Storage Link</span>
              </div>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {proofType === "NONE" && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Filing without proof is allowed, but <strong>Mentor approval requires valid proof</strong>. You can attach proof later.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context regarding your participation..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition text-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting &amp; Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit to Mentor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

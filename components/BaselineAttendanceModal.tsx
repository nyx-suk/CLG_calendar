"use client";

import React, { useState } from "react";
import { X, Layers, Save, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { updateBaselines } from "@/app/actions";
import { AttendanceStats } from "@/lib/attendance-calculator";

interface BaselineModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  subjects: AttendanceStats[];
  onSuccess: () => void;
}

export function BaselineAttendanceModal({
  isOpen,
  onClose,
  studentId,
  subjects,
  onSuccess,
}: BaselineModalProps) {
  const [items, setItems] = useState(
    subjects.map((s) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      baselineConducted: s.totalConducted - s.odApproved,
      baselineAttended: s.physicallyAttended,
    }))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (index: number, field: "baselineConducted" | "baselineAttended", val: number) => {
    const updated = [...items];
    updated[index][field] = Math.max(0, val);
    setItems(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateBaselines(studentId, items);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update baseline attendance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Mid-Semester Baseline Ingestion
              </h3>
              <p className="text-xs text-slate-500">
                Update prior attendance counts without entering old classes manually
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950">Ongoing Semester Snapshot:</span>
              <p className="mt-0.5 text-emerald-800">
                Enter your total classes conducted and attended so far from your college ERP/portal.
                New upcoming lectures on your virtual calendar will dynamically increment on top of this snapshot.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 w-32">Conducted So Far</th>
                  <th className="py-2.5 px-3 w-32">Attended So Far</th>
                  <th className="py-2.5 px-3 w-24 text-right">Current %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => {
                  const pct =
                    item.baselineConducted > 0
                      ? ((item.baselineAttended / item.baselineConducted) * 100).toFixed(1)
                      : "100.0";
                  return (
                    <tr key={item.subjectId} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{item.subjectName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.subjectCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.baselineConducted}
                          onChange={(e) =>
                            handleChange(idx, "baselineConducted", parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.baselineAttended}
                          onChange={(e) =>
                            handleChange(idx, "baselineAttended", parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-2 text-xs transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Baseline Attendance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

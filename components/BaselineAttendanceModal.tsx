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
      baselineConducted: s.totalConducted - s.odApproved, // approximate past snapshot
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Mid-Semester Baseline Ingestion
              </h3>
              <p className="text-xs text-slate-400">
                Update prior attendance counts without entering old classes manually
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300">Ongoing Semester Snapshot:</span>
              <p className="mt-0.5 text-slate-400">
                Enter your total classes conducted and attended so far from your college portal / ERP.
                The virtual calendar engine will automatically track new upcoming lectures on top of this baseline.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3 w-32">Conducted So Far</th>
                  <th className="py-2.5 px-3 w-32">Attended So Far</th>
                  <th className="py-2.5 px-3 w-24 text-right">Current %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {items.map((item, idx) => {
                  const pct =
                    item.baselineConducted > 0
                      ? ((item.baselineAttended / item.baselineConducted) * 100).toFixed(1)
                      : "100.0";
                  return (
                    <tr key={item.subjectId} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-200">{item.subjectName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.subjectCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={item.baselineConducted}
                          onChange={(e) =>
                            handleChange(idx, "baselineConducted", parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
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
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-300">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/30 flex items-center gap-2 text-xs transition disabled:opacity-50"
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

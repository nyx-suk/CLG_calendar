"use client";

import React from "react";
import { UserCheck, Shield, GraduationCap, BookOpen, Award, Sparkles } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  section?: string | null;
  rollNumber?: string | null;
}

interface HeaderProps {
  users: UserOption[];
  currentUserId: string;
  onSelectUser: (userId: string) => void;
  activeRole: string;
}

export function Header({ users, currentUserId, onSelectUser, activeRole }: HeaderProps) {
  const currentUser = users.find((u) => u.id === currentUserId);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "STUDENT":
        return <GraduationCap className="w-5 h-5 text-indigo-400" />;
      case "MENTOR":
        return <UserCheck className="w-5 h-5 text-emerald-400" />;
      case "LECTURER":
        return <BookOpen className="w-5 h-5 text-amber-400" />;
      case "COORDINATOR":
        return <Shield className="w-5 h-5 text-rose-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
              CampusFlow &bull; Attendance &amp; OD Manager
            </h1>
            <p className="text-xs text-slate-400">
              Balancing academics &amp; extracurriculars with zero bias
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">
            Active Persona:
          </span>
          <div className="relative flex-1 sm:w-72">
            <select
              value={currentUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              className="w-full bg-slate-900 text-slate-100 text-xs sm:text-sm rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none font-medium cursor-pointer"
            >
              <optgroup label="Students">
                {users
                  .filter((u) => u.role === "STUDENT")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      👨‍🎓 {u.name} ({u.rollNumber || "Student"} - Sec {u.section || "5A"})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Faculty & Staff">
                {users
                  .filter((u) => u.role === "MENTOR")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🧑‍🏫 {u.name} (Mentor)
                    </option>
                  ))}
                {users
                  .filter((u) => u.role === "LECTURER")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      📖 {u.name} (Lecturer)
                    </option>
                  ))}
                {users
                  .filter((u) => u.role === "COORDINATOR")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      🛡️ {u.name} (Coordinator)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
            {getRoleIcon(activeRole)}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {activeRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

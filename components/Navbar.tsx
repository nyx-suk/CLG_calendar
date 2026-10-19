"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Calendar,
  TrendingUp,
  Sparkles,
  Users,
  BookOpen,
  Shield,
  LayoutDashboard,
  GraduationCap,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { getUsersAndRoles } from "@/app/actions";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const list = await getUsersAndRoles();
      setUsers(list);

      // Check saved user ID in localStorage or default to student
      const savedId = typeof window !== "undefined" ? localStorage.getItem("campusflow_user_id") : null;
      if (savedId && list.some((u) => u.id === savedId)) {
        setCurrentUserId(savedId);
      } else {
        const defaultStudent = list.find((u) => u.role === "STUDENT") || list[0];
        if (defaultStudent) {
          setCurrentUserId(defaultStudent.id);
          localStorage.setItem("campusflow_user_id", defaultStudent.id);
        }
      }
    }
    load();
  }, []);

  const handleSelectUser = (id: string) => {
    setCurrentUserId(id);
    localStorage.setItem("campusflow_user_id", id);
    // Dispatch a custom event so pages can re-render immediately
    window.dispatchEvent(new CustomEvent("campusflow_user_changed", { detail: { userId: id } }));
    
    // If switching role, optionally route to their natural home
    const selected = users.find((u) => u.id === id);
    if (selected) {
      if (selected.role === "MENTOR" && pathname === "/") router.push("/mentor");
      else if (selected.role === "LECTURER" && pathname === "/") router.push("/lecturer");
      else if (selected.role === "COORDINATOR" && pathname === "/") router.push("/coordinator");
      else if (selected.role === "STUDENT" && (pathname === "/mentor" || pathname === "/lecturer" || pathname === "/coordinator")) {
        router.push("/");
      }
    }
  };

  const currentUser = users.find((u) => u.id === currentUserId);

  const navLinks = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Virtual Calendar", href: "/calendar", icon: Calendar },
    { label: "Dual Attendance", href: "/attendance", icon: TrendingUp },
    { label: "Extracurriculars", href: "/events", icon: Award },
    { label: "Mentor Portal", href: "/mentor", icon: Users, badge: "Staff" },
    { label: "Lecturer View", href: "/lecturer", icon: BookOpen, badge: "Faculty" },
    { label: "Audit Console", href: "/coordinator", icon: Shield, badge: "Admin" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg block leading-none">
                CampusFlow
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block mt-0.5">
                Attendance &amp; OD Manager
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Persona Switcher & Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-medium text-slate-500 px-2 hidden sm:inline">
                Persona:
              </span>
              <select
                value={currentUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="bg-white text-slate-800 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
              >
                <optgroup label="Students">
                  {users
                    .filter((u) => u.role === "STUDENT")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        👨‍🎓 {u.name} ({u.section || "5A"})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Faculty & Staff">
                  {users
                    .filter((u) => u.role !== "STUDENT")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.role === "MENTOR"
                          ? `🧑‍🏫 ${u.name} (Mentor)`
                          : u.role === "LECTURER"
                          ? `📖 ${u.name} (Lecturer)`
                          : `🛡️ ${u.name} (Coord)`}
                      </option>
                    ))}
                </optgroup>
              </select>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase hidden md:inline">
                {currentUser?.role || "STUDENT"}
              </span>
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-indigo-600" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

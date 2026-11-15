"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Calendar,
  TrendingUp,
  Users,
  BookOpen,
  Shield,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  LogIn,
} from "lucide-react";
import { getUsersAndRoles } from "@/app/actions";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const isDemo =
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.DEMO_MODE === "true");

  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      if (isDemo) {
        try {
          const list = await getUsersAndRoles();
          setUsers(list);

          const savedId = typeof window !== "undefined" ? localStorage.getItem("campusflow_user_id") : null;
          let active = list.find((u) => u.id === savedId);
          if (!active) {
            active = list.find((u) => u.role === "STUDENT") || list[0];
            if (active && typeof window !== "undefined") {
              localStorage.setItem("campusflow_user_id", active.id);
              document.cookie = `campusflow_user_id=${active.id}; path=/; SameSite=Lax`;
            }
          }
          if (active) {
            setCurrentUser(active);
            if (typeof document !== "undefined") {
              document.cookie = `campusflow_user_id=${active.id}; path=/; SameSite=Lax`;
            }
          }
        } catch {
          // Fallback
        }
      } else {
        try {
          const res = await fetch("/api/auth/session");
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data?.user || null);
          }
        } catch {
          setCurrentUser(null);
        }
      }
    }
    load();
  }, [isDemo]);

  const handleSelectUser = (id: string) => {
    if (!isDemo) return;
    localStorage.setItem("campusflow_user_id", id);
    document.cookie = `campusflow_user_id=${id}; path=/; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("campusflow_user_changed", { detail: { userId: id } }));

    const selected = users.find((u) => u.id === id);
    if (selected) {
      setCurrentUser(selected);
      if (selected.role === "MENTOR" && pathname === "/") router.push("/mentor");
      else if (selected.role === "LECTURER" && pathname === "/") router.push("/lecturer");
      else if (selected.role === "COORDINATOR" && pathname === "/") router.push("/coordinator");
      else if (selected.role === "STUDENT" && (pathname === "/mentor" || pathname === "/lecturer" || pathname === "/coordinator")) {
        router.push("/");
      }
    }
  };

  const navLinks = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Virtual Calendar", href: "/calendar", icon: Calendar },
    { label: "Dual Attendance", href: "/attendance", icon: TrendingUp },
    { label: "Extracurriculars", href: "/events", icon: Award },
    { label: "Mentor Portal", href: "/mentor", icon: Users, badge: "Staff" },
    { label: "Lecturer View", href: "/lecturer", icon: BookOpen, badge: "Faculty" },
    { label: "Coordinator", href: "/coordinator", icon: Shield, badge: "Admin" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              CF
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-none">
                CampusFlow
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                RVCE CSE Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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

          {/* Persona Switcher (Demo Only) or Auth Session (Production) */}
          <div className="flex items-center gap-2">
            {isDemo ? (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 px-2 hidden sm:inline">
                  Persona:
                </span>
                <select
                  value={currentUser?.id || ""}
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
            ) : (
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{currentUser.role}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 uppercase">
                      {currentUser.role}
                    </span>
                    <Link
                      href="/api/auth/signout"
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/api/auth/signin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            )}

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
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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

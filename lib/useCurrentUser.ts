"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsersAndRoles } from "@/app/actions";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isDemo =
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.DEMO_MODE === "true");

  const syncUser = useCallback(async () => {
    try {
      if (isDemo) {
        // In local development demo mode, read saved demo persona
        const users = await getUsersAndRoles();
        const savedId = typeof window !== "undefined" ? localStorage.getItem("campusflow_user_id") : null;
        let targetUser = users.find((u: any) => u.id === savedId);
        if (!targetUser) {
          targetUser = users.find((u: any) => u.role === "STUDENT") || users[0];
          if (targetUser && typeof window !== "undefined") {
            localStorage.setItem("campusflow_user_id", targetUser.id);
            // Set cookie so server actions/routes in demo mode can read it
            document.cookie = `campusflow_user_id=${targetUser.id}; path=/; SameSite=Lax`;
          }
        }
        if (targetUser) {
          setUserId(targetUser.id);
          setUser(targetUser);
          if (typeof document !== "undefined") {
            document.cookie = `campusflow_user_id=${targetUser.id}; path=/; SameSite=Lax`;
          }
        } else {
          setUserId("");
          setUser(null);
        }
      } else {
        // In production, derive identity purely from server-verified Auth.js session
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.id) {
            setUserId(session.user.id);
            setUser(session.user);
            return;
          }
        }
        setUserId("");
        setUser(null);
      }
    } catch {
      setUserId("");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    syncUser();

    // Event listener is exclusively registered in development demo mode
    if (isDemo && typeof window !== "undefined") {
      const handleUserChange = (e: any) => {
        if (e.detail?.userId) {
          setUserId(e.detail.userId);
          document.cookie = `campusflow_user_id=${e.detail.userId}; path=/; SameSite=Lax`;
          syncUser();
        }
      };

      window.addEventListener("campusflow_user_changed", handleUserChange);
      return () => {
        window.removeEventListener("campusflow_user_changed", handleUserChange);
      };
    }
  }, [syncUser, isDemo]);

  return { userId, user, loading, refreshUser: syncUser };
}

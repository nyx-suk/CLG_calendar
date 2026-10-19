"use client";

import { useEffect, useState } from "react";
import { getUsersAndRoles } from "@/app/actions";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const syncUser = async () => {
    try {
      const users = await getUsersAndRoles();
      const savedId = typeof window !== "undefined" ? localStorage.getItem("campusflow_user_id") : null;
      let targetUser = users.find((u) => u.id === savedId);
      if (!targetUser) {
        targetUser = users.find((u) => u.role === "STUDENT") || users[0];
        if (targetUser && typeof window !== "undefined") {
          localStorage.setItem("campusflow_user_id", targetUser.id);
        }
      }
      if (targetUser) {
        setUserId(targetUser.id);
        setUser(targetUser);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncUser();

    const handleUserChange = (e: any) => {
      if (e.detail?.userId) {
        setUserId(e.detail.userId);
        syncUser();
      }
    };

    window.addEventListener("campusflow_user_changed", handleUserChange);
    return () => {
      window.removeEventListener("campusflow_user_changed", handleUserChange);
    };
  }, []);

  return { userId, user, loading, refreshUser: syncUser };
}

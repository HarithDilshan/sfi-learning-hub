"use client";

import { useEffect, useState } from "react";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import { useBadges } from "@/hooks/useBadges";
import { getUser } from "@/lib/auth";

export default function PWARegister() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUser().then((user) => setUserId(user?.id ?? null));
  }, []);

  const { unlockedBadges } = useBadges(userId);

  // Fire local notifications on quiz completion, XP milestones, etc.
  useInAppNotifications({ unlockedBadges });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered:", reg.scope);

          // Check for updates every 30 minutes
          setInterval(() => {
            reg.update();
          }, 30 * 60 * 1000);
        })
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return null;
}
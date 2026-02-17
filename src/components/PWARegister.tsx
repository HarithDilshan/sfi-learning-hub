"use client";

import { useEffect } from "react";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";


export default function PWARegister() {
   // Fire local notifications on quiz completion, XP milestones, etc.
  useInAppNotifications();
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
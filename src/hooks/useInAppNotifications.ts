"use client";

/**
 * useInAppNotifications
 *
 * Listens to the existing "progress-update" window event and fires
 * local (service-worker) notifications when interesting things happen:
 *  - Quiz / exercise completed
 *  - Streak incremented
 *  - XP milestone crossed
 *  - New badge unlocked
 *
 * Usage: call once at app root level, e.g. inside PWARegister or layout.tsx:
 *   useInAppNotifications();
 */

import { useEffect, useRef } from "react";
import { getProgress } from "@/lib/progress";
import { getUnlockedBadges } from "@/lib/badges";

// We use the SW to show notifications so they work even when the tab isn't focused.
async function showNotification(title: string, body: string, options?: {
  tag?: string;
  url?: string;
  icon?: string;
}) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: options?.icon ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: options?.tag ?? "in-app",
      renotify: false,
      data: { url: options?.url ?? "/" },
      silent: true, // No sound for in-app events — less intrusive
    });
  } catch {
    // Silently fail if notification can't be shown
  }
}

// XP thresholds that deserve a notification
const XP_MILESTONES = [50, 100, 250, 500, 1000, 2000, 5000];

export function useInAppNotifications() {
  // Track previous state so we can detect changes
  const prevRef = useRef<{
    xp: number;
    streak: number;
    topicCount: number;
    badgeIds: Set<string>;
  } | null>(null);

  useEffect(() => {
    // Initialise previous state from current progress
    const init = getProgress();
    prevRef.current = {
      xp: init.xp,
      streak: init.streak,
      topicCount: Object.keys(init.completedTopics).length,
      badgeIds: new Set(getUnlockedBadges(init).map((b) => b.id)),
    };

    async function handleProgressUpdate() {
      const prev = prevRef.current;
      if (!prev) return;

      const current = getProgress();
      const now = {
        xp: current.xp,
        streak: current.streak,
        topicCount: Object.keys(current.completedTopics).length,
        badgeIds: new Set(getUnlockedBadges(current).map((b) => b.id)),
      };

      // ── 1. New badge unlocked ──────────────────────────────────────
      const newBadges = getUnlockedBadges(current).filter(
        (b) => !prev.badgeIds.has(b.id)
      );
      for (const badge of newBadges) {
        await showNotification(
          `${badge.icon} Nytt märke upplåst!`,
          `${badge.nameSv} — ${badge.description}`,
          { tag: `badge-${badge.id}`, url: "/profile" }
        );
      }

      // ── 2. Streak incremented ──────────────────────────────────────
      if (now.streak > prev.streak) {
        const s = now.streak;
        const emoji = s >= 30 ? "🏆" : s >= 14 ? "🔥" : s >= 7 ? "⚡" : "🔥";
        await showNotification(
          `${emoji} ${s} dagars streak!`,
          s === 1
            ? "Bra start — kom tillbaka imorgon!"
            : `Imponerande! ${s} dagar i rad. Fortsätt så!`,
          { tag: "streak", url: "/daily" }
        );
      }

      // ── 3. XP milestone crossed ────────────────────────────────────
      const crossedMilestone = XP_MILESTONES.find(
        (m) => prev.xp < m && now.xp >= m
      );
      if (crossedMilestone) {
        await showNotification(
          `⭐ ${crossedMilestone} XP uppnått!`,
          `Du har tjänat ${crossedMilestone} XP. Fortsätt öva för att nå nästa nivå!`,
          { tag: "xp-milestone", url: "/profile" }
        );
      }

      // ── 4. Topic / quiz completed ──────────────────────────────────
      // Detect a newly completed topic (topicCount increased)
      if (now.topicCount > prev.topicCount) {
        // Find which topic was just added
        const newTopicId = Object.keys(current.completedTopics).find(
          (id) => !prev.badgeIds.has(id) // reuse badgeIds as a Set proxy isn't ideal,
          // but topicCount diff is the real guard above
        );

        const topic = current.completedTopics[
          Object.keys(current.completedTopics).at(-1) ?? ""
        ];

        if (topic) {
          const pct = topic.bestScore;
          const isPerfect = pct === 100;
          const isGood = pct >= 80;

          if (isPerfect) {
            await showNotification(
              "💯 Perfekt resultat!",
              "Du fick 100% på övningen — fantastiskt jobbat!",
              { tag: "quiz-perfect", url: "/review" }
            );
          } else if (isGood) {
            await showNotification(
              "🎉 Bra jobbat!",
              `Du fick ${pct}% — ett starkt resultat!`,
              { tag: "quiz-done", url: "/review" }
            );
          }
          // Don't spam notifications for poor results
        }
      }

      // Update stored previous state
      prevRef.current = now;
    }

    window.addEventListener("progress-update", handleProgressUpdate);
    return () => window.removeEventListener("progress-update", handleProgressUpdate);
  }, []);
}
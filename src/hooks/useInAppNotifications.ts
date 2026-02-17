"use client";
/**
 * useInAppNotifications
 *
 * Listens to "progress-update" and fires local notifications only when
 * something genuinely changes (badge, streak, XP milestone, quiz result).
 *
 * Fixes: ignores all events for 2s after mount (initial load flood),
 * and debounces rapid-fire events so only one check runs per action.
 */
import { useEffect, useRef } from "react";
import { getProgress } from "@/lib/progress";
import { getUnlockedBadges } from "@/lib/badges";
async function showNotification(
  title: string,
  body: string,
  options?: { tag?: string; url?: string }
) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: options?.tag ?? "in-app",
      silent: true,
      data: { url: options?.url ?? "/" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch {
    // Never crash the app for a notification
  }
}
const XP_MILESTONES = [50, 100, 250, 500, 1000, 2000, 5000];
type Snapshot = {
  xp: number;
  streak: number;
  topicCount: number;
  badgeIds: Set<string>;
};
function takeSnapshot(): Snapshot {
  const p = getProgress();
  return {
    xp: p.xp,
    streak: p.streak,
    topicCount: Object.keys(p.completedTopics).length,
    badgeIds: new Set(getUnlockedBadges(p).map((b) => b.id)),
  };
}
export function useInAppNotifications() {
  const prevRef = useRef<Snapshot | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef(false);
  useEffect(() => {
    // Delay 2s so all page-load progress-update events settle before
    // we start watching. Without this, every stored value looks like
    // a "new" change and fires ~30 notifications on startup.
    const initTimer = setTimeout(() => {
      prevRef.current = takeSnapshot();
      readyRef.current = true;
    }, 2000);
    async function handleProgressUpdate() {
      // Ignore events during the initial 2s settle window
      if (!readyRef.current || !prevRef.current) return;
      // Debounce: if multiple events fire in quick succession (e.g. XP +
      // streak + topic all at once), only run the check once after 300ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runCheck(), 300);
    }
    async function runCheck() {
      const prev = prevRef.current;
      if (!prev) return;
      const current = getProgress();
      const now = takeSnapshot();
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
      // ── 4. Quiz / topic completed (80%+) ──────────────────────────
      if (now.topicCount > prev.topicCount) {
        const latestKey = Object.keys(current.completedTopics).at(-1) ?? "";
        const topic = current.completedTopics[latestKey];
        if (topic) {
          const pct = topic.bestScore;
          if (pct === 100) {
            await showNotification(
              "💯 Perfekt resultat!",
              "Du fick 100% på övningen — fantastiskt jobbat!",
              { tag: "quiz-perfect", url: "/review" }
            );
          } else if (pct >= 80) {
            await showNotification(
              "🎉 Bra jobbat!",
              `Du fick ${pct}% — ett starkt resultat!`,
              { tag: "quiz-done", url: "/review" }
            );
          }
        }
      }
      // Save new snapshot as baseline for next event
      prevRef.current = now;
    }
    window.addEventListener("progress-update", handleProgressUpdate);
    return () => {
      clearTimeout(initTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("progress-update", handleProgressUpdate);
    };
  }, []);
}
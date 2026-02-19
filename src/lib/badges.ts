"use client";

import { ProgressData } from "./progress";

// ════════════════════════════════════════════════════
// TYPES
// Badge metadata comes from Supabase (badges table).
// Only the check/progress logic lives here in code.
// ════════════════════════════════════════════════════

export interface BadgeMetadata {
  id: string;
  icon: string;
  name: string;
  name_sv: string;
  description: string;
  category: "beginner" | "progress" | "mastery" | "streak" | "special";
  sort_order: number;
}

export interface BadgeWithStatus extends BadgeMetadata {
  unlocked: boolean;
  unlockedAt?: string;
  progressPct: number; // 0–100, for locked badges
}

// ════════════════════════════════════════════════════
// LOGIC REGISTRY
// Keyed by badge id. Add a new badge to Supabase?
// Just add its check/progress functions here too.
// ════════════════════════════════════════════════════

interface BadgeLogic {
  check: (p: ProgressData, topicMap: Record<string, string[]>) => boolean;
  progress: (p: ProgressData, topicMap: Record<string, string[]>) => number;
}

export const badgeLogic: Record<string, BadgeLogic> = {
  // ─── BEGINNER ───
  "first-quiz": {
    check: (p) => Object.keys(p.completedTopics).length >= 1,
    progress: (p) => Math.min(Object.keys(p.completedTopics).length / 1, 1),
  },
  "first-perfect": {
    check: (p) => Object.values(p.completedTopics).some((t) => t.bestScore === 100),
    progress: (p) => {
      const best = Math.max(0, ...Object.values(p.completedTopics).map((t) => t.bestScore));
      return best / 100;
    },
  },
  "word-learner": {
    check: (p) => Object.keys(p.wordHistory).length >= 10,
    progress: (p) => Math.min(Object.keys(p.wordHistory).length / 10, 1),
  },
  "first-steps": {
    check: (p) => p.xp >= 50,
    progress: (p) => Math.min(p.xp / 50, 1),
  },

  // ─── PROGRESS ───
  "five-topics": {
    check: (p) => Object.keys(p.completedTopics).length >= 5,
    progress: (p) => Math.min(Object.keys(p.completedTopics).length / 5, 1),
  },
  "ten-topics": {
    check: (p) => Object.keys(p.completedTopics).length >= 10,
    progress: (p) => Math.min(Object.keys(p.completedTopics).length / 10, 1),
  },
  "twenty-topics": {
    check: (p) => Object.keys(p.completedTopics).length >= 20,
    progress: (p) => Math.min(Object.keys(p.completedTopics).length / 20, 1),
  },
  "xp-100": {
    check: (p) => p.xp >= 100,
    progress: (p) => Math.min(p.xp / 100, 1),
  },
  "xp-500": {
    check: (p) => p.xp >= 500,
    progress: (p) => Math.min(p.xp / 500, 1),
  },
  "xp-1000": {
    check: (p) => p.xp >= 1000,
    progress: (p) => Math.min(p.xp / 1000, 1),
  },
  "xp-5000": {
    check: (p) => p.xp >= 5000,
    progress: (p) => Math.min(p.xp / 5000, 1),
  },

  // ─── MASTERY ───
 "kurs-a-complete": {
  check: (p, tm) => {
    const topics = tm["A"] ?? [];
    return topics.length > 0 && topics.every((id) => p.completedTopics[id]);
  },
  progress: (p, tm) => {
    const topics = tm["A"] ?? [];
    if (topics.length === 0) return 0;
    return topics.filter((id) => p.completedTopics[id]).length / topics.length;
  },
},
  "kurs-b-complete": {
    check: (p, tm) => {
      const topics = tm["B"] ?? [];
      return topics.length > 0 && topics.every((id) => p.completedTopics[id]);
    },
    progress: (p, tm) => {
      const topics = tm["B"] ?? [];
      if (topics.length === 0) return 0;
      return topics.filter((id) => p.completedTopics[id]).length / topics.length;
    },
  },
  "kurs-c-complete": {
    check: (p, tm) => {
      const topics = tm["C"] ?? [];
      return topics.length > 0 && topics.every((id) => p.completedTopics[id]);
    },
    progress: (p, tm) => {
      const topics = tm["C"] ?? [];
      if (topics.length === 0) return 0;
      return topics.filter((id) => p.completedTopics[id]).length / topics.length;
    },
  },
  "kurs-d-complete": {
    check: (p, tm) => {
      const topics = tm["D"] ?? [];
      return topics.length > 0 && topics.every((id) => p.completedTopics[id]);
    },
    progress: (p, tm) => {
      const topics = tm["D"] ?? [];
      if (topics.length === 0) return 0;
      return topics.filter((id) => p.completedTopics[id]).length / topics.length;
    },
  },
"all-courses": {
  check: (p, tm) => {
    const topics = tm["all"] ?? [];
    return topics.length > 0 && topics.every((id) => p.completedTopics[id]);
  },
  progress: (p, tm) => {
    const topics = tm["all"] ?? [];
    if (topics.length === 0) return 0;
    return topics.filter((id) => p.completedTopics[id]).length / topics.length;
  },
},
  "vocab-50": {
    check: (p) => Object.keys(p.wordHistory).length >= 50,
    progress: (p) => Math.min(Object.keys(p.wordHistory).length / 50, 1),
  },
  "vocab-100": {
    check: (p) => Object.keys(p.wordHistory).length >= 100,
    progress: (p) => Math.min(Object.keys(p.wordHistory).length / 100, 1),
  },
  "accuracy-90": {
    check: (p) => {
      const topics = Object.values(p.completedTopics);
      if (topics.length < 5) return false;
      return topics.reduce((s, t) => s + t.bestScore, 0) / topics.length >= 90;
    },
    progress: (p) => {
      const topics = Object.values(p.completedTopics);
      if (topics.length === 0) return 0;
      const topicPct = Math.min(topics.length / 5, 1) * 0.5;
      const avgPct = (topics.reduce((s, t) => s + t.bestScore, 0) / topics.length / 90) * 0.5;
      return Math.min(topicPct + avgPct, 1);
    },
  },

  // ─── STREAK ───
  "streak-3":  { check: (p) => p.streak >= 3,  progress: (p) => Math.min(p.streak / 3,  1) },
  "streak-7":  { check: (p) => p.streak >= 7,  progress: (p) => Math.min(p.streak / 7,  1) },
  "streak-14": { check: (p) => p.streak >= 14, progress: (p) => Math.min(p.streak / 14, 1) },
  "streak-30": { check: (p) => p.streak >= 30, progress: (p) => Math.min(p.streak / 30, 1) },

  // ─── SPECIAL ───
  "daily-champion": {
    check: (p) => Object.keys(p.completedTopics).filter((k) => k.startsWith("daily-")).length >= 5,
    progress: (p) => Math.min(Object.keys(p.completedTopics).filter((k) => k.startsWith("daily-")).length / 5, 1),
  },
  "daily-legend": {
    check: (p) => Object.keys(p.completedTopics).filter((k) => k.startsWith("daily-")).length >= 30,
    progress: (p) => Math.min(Object.keys(p.completedTopics).filter((k) => k.startsWith("daily-")).length / 30, 1),
  },
  "night-owl": {
    check: (p) => {
      const hour = p.lastStudyHour ?? new Date(p.lastActivity).getHours();
      return hour >= 23 || hour < 4;
    },
    progress: () => 0, // binary — either you did or you didn't
  },
  "early-bird": {
    check: (p) => {
      const hour = p.lastStudyHour ?? new Date(p.lastActivity).getHours();
      return hour >= 4 && hour < 7;
    },
    progress: () => 0,
  },
};

// ════════════════════════════════════════════════════
// HELPERS — used by useBadges hook and badge UI
// ════════════════════════════════════════════════════

/** Run all badge checks against current progress. Returns ids that pass. */
export function evaluateBadges(
  allBadges: BadgeMetadata[],
  progress: ProgressData,
  topicMap: Record<string, string[]>
): string[] {
  return allBadges
    .filter(({ id }) => {
      const logic = badgeLogic[id];
      return logic ? logic.check(progress, topicMap) : false;
    })
    .map((b) => b.id);
}

export function getBadgeProgress(
  id: string,
  progress: ProgressData,
  topicMap: Record<string, string[]>
): number {
  const logic = badgeLogic[id];
  if (!logic) return 0;
  return Math.round(logic.progress(progress, topicMap) * 100);
}

/** Merge badge metadata from Supabase with unlock status. */
export function mergeBadgeStatus(
  metadata: BadgeMetadata[],
  unlockedIds: Set<string>,
  unlockedAt: Record<string, string>,
  progress: ProgressData,
  topicMap: Record<string, string[]>
): BadgeWithStatus[] {
  return metadata
    .map((badge) => ({
      ...badge,
      unlocked: unlockedIds.has(badge.id),
      unlockedAt: unlockedAt[badge.id],
      progressPct: unlockedIds.has(badge.id) ? 100 : getBadgeProgress(badge.id, progress, topicMap),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getNextBadges(
  metadata: BadgeMetadata[],
  unlockedIds: Set<string>,
  progress: ProgressData,
  topicMap: Record<string, string[]>,
  count = 3
): BadgeWithStatus[] {
  return metadata
    .filter((b) => !unlockedIds.has(b.id))
    .map((b) => ({
      ...b,
      unlocked: false,
      progressPct: getBadgeProgress(b.id, progress, topicMap),
    }))
    .sort((a, b) => b.progressPct - a.progressPct)
    .slice(0, count);
}

/** Get all badges that a user has unlocked, with full status. */
export function getUnlockedBadges(
  metadata: BadgeMetadata[],
  unlockedIds: Set<string>,
  unlockedAt: Record<string, string>
): BadgeWithStatus[] {
  return metadata
    .filter((b) => unlockedIds.has(b.id))
    .map((b) => ({
      ...b,
      unlocked: true,
      unlockedAt: unlockedAt[b.id],
      progressPct: 100,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}
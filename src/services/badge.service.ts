"use client";
// Badge evaluation logic + DB operations in one place
// Previously split across: lib/badges.ts, service/badgeService.ts, hooks/useBadges.ts (DB calls)

import type { ProgressData } from "@/types/progress.types";
import type { BadgeMetadata, BadgeWithStatus } from "@/types/badge.types";
import { fetchAllBadges, fetchUserBadges, awardBadges, fetchTopicIdsByLevel } from "@/lib/db/badges.db";

export type { BadgeMetadata, BadgeWithStatus };

// ─── Logic registry ───────────────────────────────────────────────────────────
interface BadgeLogic {
  check: (p: ProgressData, topicMap: Record<string, string[]>) => boolean;
  progress: (p: ProgressData, topicMap: Record<string, string[]>) => number;
}

const BADGE_LOGIC: Record<string, BadgeLogic> = {
  "first-quiz": { check: (p) => Object.keys(p.completedTopics).length >= 1, progress: (p) => Math.min(Object.keys(p.completedTopics).length, 1) },
  "first-perfect": { check: (p) => Object.values(p.completedTopics).some((t) => t.bestScore === 100), progress: (p) => Math.max(0, ...Object.values(p.completedTopics).map((t) => t.bestScore)) / 100 },
  "word-learner": { check: (p) => Object.keys(p.wordHistory).length >= 10, progress: (p) => Math.min(Object.keys(p.wordHistory).length / 10, 1) },
  "first-steps": { check: (p) => p.xp >= 50, progress: (p) => Math.min(p.xp / 50, 1) },
  "half-century": { check: (p) => p.xp >= 500, progress: (p) => Math.min(p.xp / 500, 1) },
  "century": { check: (p) => p.xp >= 1000, progress: (p) => Math.min(p.xp / 1000, 1) },
  "xp-500": { check: (p) => p.xp >= 500, progress: (p) => Math.min(p.xp / 500, 1) },
  "xp-1000": { check: (p) => p.xp >= 1000, progress: (p) => Math.min(p.xp / 1000, 1) },
  "xp-5000": { check: (p) => p.xp >= 5000, progress: (p) => Math.min(p.xp / 5000, 1) },
  "xp-10000": { check: (p) => p.xp >= 10000, progress: (p) => Math.min(p.xp / 10000, 1) },
  "ten-topics": { check: (p) => Object.keys(p.completedTopics).length >= 10, progress: (p) => Math.min(Object.keys(p.completedTopics).length / 10, 1) },
  "twenty-five-topics": { check: (p) => Object.keys(p.completedTopics).length >= 25, progress: (p) => Math.min(Object.keys(p.completedTopics).length / 25, 1) },
  "fifty-topics": { check: (p) => Object.keys(p.completedTopics).length >= 50, progress: (p) => Math.min(Object.keys(p.completedTopics).length / 50, 1) },
  "course-a-complete": { check: (p, tm) => (tm["A"] || []).every((id) => id in p.completedTopics), progress: (p, tm) => Math.min((tm["A"] || []).filter((id) => id in p.completedTopics).length / Math.max(1, (tm["A"] || []).length), 1) },
  "course-b-complete": { check: (p, tm) => (tm["B"] || []).every((id) => id in p.completedTopics), progress: (p, tm) => Math.min((tm["B"] || []).filter((id) => id in p.completedTopics).length / Math.max(1, (tm["B"] || []).length), 1) },
  "course-c-complete": { check: (p, tm) => (tm["C"] || []).every((id) => id in p.completedTopics), progress: (p, tm) => Math.min((tm["C"] || []).filter((id) => id in p.completedTopics).length / Math.max(1, (tm["C"] || []).length), 1) },
  "course-d-complete": { check: (p, tm) => (tm["D"] || []).every((id) => id in p.completedTopics), progress: (p, tm) => Math.min((tm["D"] || []).filter((id) => id in p.completedTopics).length / Math.max(1, (tm["D"] || []).length), 1) },
  "streak-3": { check: (p) => p.streak >= 3, progress: (p) => Math.min(p.streak / 3, 1) },
  "streak-7": { check: (p) => p.streak >= 7, progress: (p) => Math.min(p.streak / 7, 1) },
  "streak-14": { check: (p) => p.streak >= 14, progress: (p) => Math.min(p.streak / 14, 1) },
  "streak-30": { check: (p) => p.streak >= 30, progress: (p) => Math.min(p.streak / 30, 1) },
  "streak-100": { check: (p) => p.streak >= 100, progress: (p) => Math.min(p.streak / 100, 1) },
  "perfect-streak": { check: (p) => Object.values(p.completedTopics).filter((t) => t.bestScore === 100).length >= 5, progress: (p) => Math.min(Object.values(p.completedTopics).filter((t) => t.bestScore === 100).length / 5, 1) },
  "word-master": { check: (p) => Object.keys(p.wordHistory).length >= 100, progress: (p) => Math.min(Object.keys(p.wordHistory).length / 100, 1) },
  "vocab-500": { check: (p) => Object.keys(p.wordHistory).length >= 500, progress: (p) => Math.min(Object.keys(p.wordHistory).length / 500, 1) },
  "all-perfect": { check: (p) => Object.keys(p.completedTopics).length >= 10 && Object.values(p.completedTopics).every((t) => t.bestScore === 100), progress: (p) => Math.min(Object.values(p.completedTopics).filter((t) => t.bestScore === 100).length / Math.max(1, Object.keys(p.completedTopics).length), 1) },
  "early-bird": { check: (p) => typeof p.lastStudyHour === "number" && p.lastStudyHour >= 5 && p.lastStudyHour < 9, progress: (p) => (typeof p.lastStudyHour === "number" && p.lastStudyHour >= 5 && p.lastStudyHour < 9) ? 1 : 0 },
  "night-owl": { check: (p) => typeof p.lastStudyHour === "number" && p.lastStudyHour >= 22, progress: (p) => (typeof p.lastStudyHour === "number" && p.lastStudyHour >= 22) ? 1 : 0 },
};

// ─── Evaluation helpers ───────────────────────────────────────────────────────
export function evaluateBadges(
  metadata: BadgeMetadata[],
  progress: ProgressData,
  topicMap: Record<string, string[]>
): BadgeWithStatus[] {
  return metadata.map((badge) => {
    const logic = BADGE_LOGIC[badge.id];
    const unlocked = logic ? logic.check(progress, topicMap) : false;
    const progressPct = logic ? Math.round(logic.progress(progress, topicMap) * 100) : 0;
    return { ...badge, unlocked, progressPct };
  });
}

export function mergeBadgeStatus(
  evaluated: BadgeWithStatus[],
  unlockedIds: Set<string>,
  unlockedAt: Record<string, string>
): BadgeWithStatus[] {
  return evaluated.map((b) => ({
    ...b,
    unlocked: b.unlocked || unlockedIds.has(b.id),
    unlockedAt: unlockedAt[b.id],
  }));
}

export function getNextBadges(badges: BadgeWithStatus[], count = 3): BadgeWithStatus[] {
  return badges.filter((b) => !b.unlocked).sort((a, b) => b.progressPct - a.progressPct).slice(0, count);
}

// ─── DB operations re-exported from db layer ──────────────────────────────────
export { fetchAllBadges, fetchUserBadges, awardBadges, fetchTopicIdsByLevel };

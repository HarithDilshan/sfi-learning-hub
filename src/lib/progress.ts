"use client";

import { syncProgressToCloud, syncTopicScore, loadProgressFromCloud, loadTopicScores } from "./sync";
import { loadWeeklyGoal, updateWeeklyProgress } from "./weekly-goals";

export interface ProgressData {
  xp: number;
  streak: number;
  completedTopics: Record<string, { score: number; bestScore: number; attempts: number,completedAt: string; }>;
  wordHistory: Record<string, { correct: number; wrong: number; lastSeen: string }>;
  lastActivity: string;
  userId: string | null;
}

let currentProgress: ProgressData = {
  xp: 0,
  streak: 0,
  completedTopics: {},
  wordHistory: {},
  lastActivity: new Date().toISOString(),
  userId: null,
};

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("sfi_progress");
    if (saved) {
      const parsed = JSON.parse(saved);
      currentProgress = { ...currentProgress, ...parsed, userId: null };
    }
  } catch { }
}

export function getProgress(): ProgressData {
  return currentProgress;
}

export function setUserId(userId: string | null) {
  if (!userId) {
    currentProgress = {
      xp: 0,
      streak: 0,
      completedTopics: {},
      wordHistory: {},
      lastActivity: new Date().toISOString(),
      userId: null,
    };
    window.dispatchEvent(new Event("progress-update"));
    return;
  }
  currentProgress.userId = userId;
}

export function addXP(amount: number): ProgressData {
  currentProgress.xp += amount;
  currentProgress.lastActivity = new Date().toISOString();

  if (typeof window !== "undefined") {
    try { localStorage.setItem("sfi_progress", JSON.stringify(currentProgress)); } catch { }
  }

  if (currentProgress.userId) {
    syncProgressToCloud(currentProgress.userId, {
      xp: currentProgress.xp,
      streak: currentProgress.streak,
      lastActivity: currentProgress.lastActivity,
    });
  }

  window.dispatchEvent(new Event("progress-update"));
  return currentProgress;
}

export function incrementStreak(): ProgressData {
  currentProgress.streak += 1;
  currentProgress.lastActivity = new Date().toISOString();

  if (typeof window !== "undefined") {
    try { localStorage.setItem("sfi_progress", JSON.stringify(currentProgress)); } catch { }
  }

  if (currentProgress.userId) {
    syncProgressToCloud(currentProgress.userId, {
      xp: currentProgress.xp,
      streak: currentProgress.streak,
      lastActivity: currentProgress.lastActivity,
    });
  }

  window.dispatchEvent(new Event("progress-update"));
  return currentProgress;
}

export function markTopicComplete(
  topicId: string,
  score: number,
  total: number
): ProgressData {
  const existing = currentProgress.completedTopics[topicId];
  const pct = Math.round((score / total) * 100);
  const bestScore = existing ? Math.max(existing.bestScore, pct) : pct;
  const attempts = existing ? existing.attempts + 1 : 1;
  const xpEarned = score * 10;

  currentProgress.completedTopics[topicId] = { score: pct, bestScore, attempts,completedAt: existing?.completedAt || new Date().toISOString(), };
  currentProgress.xp += xpEarned;
  currentProgress.lastActivity = new Date().toISOString();

  if (typeof window !== "undefined") {
    try { localStorage.setItem("sfi_progress", JSON.stringify(currentProgress)); } catch { }
  }

  if (currentProgress.userId) {
    syncTopicScore(currentProgress.userId, topicId, pct, bestScore, attempts, xpEarned);

    loadWeeklyGoal(currentProgress.userId).then((goal) => {
      updateWeeklyProgress(
        currentProgress.userId!,
        goal.xpEarned + xpEarned,
        goal.topicsCompleted + 1
      );
    });
  }

  window.dispatchEvent(new Event("progress-update"));
  return currentProgress;
}

// Load everything from Supabase on login
export async function loadCloudProgress(userId: string) {
  setUserId(userId);

  const cloudProfile = await loadProgressFromCloud(userId);
  const cloudTopics = await loadTopicScores(userId);

  if (cloudProfile) {
    currentProgress.xp = cloudProfile.xp || 0;
    currentProgress.streak = cloudProfile.streak || 0;
  }

  for (const ct of cloudTopics) {
    currentProgress.completedTopics[ct.topic_id] = {
      score: ct.score,
      bestScore: ct.best_score,
      attempts: ct.attempts,
      completedAt: ct.completedAt,
    };
  }

  window.dispatchEvent(new Event("progress-update"));
}

export function recordWordAttempt(
  wordSv: string,
  correct: boolean
): ProgressData {
  const existing = currentProgress.wordHistory[wordSv] || {
    correct: 0,
    wrong: 0,
    lastSeen: "",
  };

  currentProgress.wordHistory[wordSv] = {
    correct: existing.correct + (correct ? 1 : 0),
    wrong: existing.wrong + (correct ? 0 : 1),
    lastSeen: new Date().toISOString(),
  };

  currentProgress.lastActivity = new Date().toISOString();

  if (typeof window !== "undefined") {
    try { localStorage.setItem("sfi_progress", JSON.stringify(currentProgress)); } catch { }
  }

  window.dispatchEvent(new Event("progress-update"));
  return currentProgress;
}

export function saveProgress(data: Partial<ProgressData>) {
  currentProgress = { ...currentProgress, ...data };

  // Persist to localStorage for guest users
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sfi_progress", JSON.stringify(currentProgress));
    } catch { }
  }

  window.dispatchEvent(new Event("progress-update"));
}
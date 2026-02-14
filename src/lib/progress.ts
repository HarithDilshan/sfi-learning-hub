"use client";

import { syncProgressToCloud, syncTopicScore, loadProgressFromCloud, loadTopicScores } from "./sync";

export interface ProgressData {
  xp: number;
  streak: number;
  completedTopics: Record<string, { score: number; bestScore: number; attempts: number }>;
  lastActivity: string;
  userId: string | null;
}

// In-memory only — resets on page refresh, loaded from Supabase on login
let currentProgress: ProgressData = {
  xp: 0,
  streak: 0,
  completedTopics: {},
  lastActivity: new Date().toISOString(),
  userId: null,
};

export function getProgress(): ProgressData {
  return currentProgress;
}

export function setUserId(userId: string | null) {
  if (!userId) {
    // Clear everything on logout
    currentProgress = {
      xp: 0,
      streak: 0,
      completedTopics: {},
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

  currentProgress.completedTopics[topicId] = { score: pct, bestScore, attempts };
  currentProgress.lastActivity = new Date().toISOString();

  if (currentProgress.userId) {
    syncTopicScore(currentProgress.userId, topicId, pct, bestScore, attempts, score * 10);
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
    };
  }

  window.dispatchEvent(new Event("progress-update"));
}
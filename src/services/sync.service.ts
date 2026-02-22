"use client";
// High-level sync orchestration — calls db layer, coordinates with progress store
// Previously: lib/sync.ts getUserStats()

import { fetchProfile } from "@/lib/db/profiles.db";
import { fetchTopicScores } from "@/lib/db/progress.db";
import { fetchUserWordStats } from "@/lib/db/spaced-repetition.db";

export async function getUserStats(userId: string) {
  const [profile, topics, wordStats] = await Promise.all([
    fetchProfile(userId),
    fetchTopicScores(userId),
    fetchUserWordStats(userId),
  ]);

  return {
    xp: profile?.xp || 0,
    streak: profile?.streak || 0,
    topicsCompleted: topics.length,
    totalAttempts: topics.reduce((sum, t) => sum + t.attempts, 0),
    averageScore: topics.length ? Math.round(topics.reduce((sum, t) => sum + t.best_score, 0) / topics.length) : 0,
    wordsLearned: wordStats.count,
    wordsMastered: wordStats.mastered,
  };
}

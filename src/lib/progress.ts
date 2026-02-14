"use client";

export interface ProgressData {
  xp: number;
  streak: number;
  completedTopics: Record<string, { score: number; bestScore: number; attempts: number }>;
  lastActivity: string;
  wordHistory: Record<string, { correct: number; wrong: number; lastSeen: string }>;
}

const STORAGE_KEY = "sfi-progress";

const defaultProgress: ProgressData = {
  xp: 0,
  streak: 0,
  completedTopics: {},
  lastActivity: new Date().toISOString(),
  wordHistory: {},
};

export function getProgress(): ProgressData {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(stored) };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(data: Partial<ProgressData>) {
  if (typeof window === "undefined") return;
  const current = getProgress();
  const updated = { ...current, ...data, lastActivity: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function addXP(amount: number): ProgressData {
  const current = getProgress();
  return saveProgress({ xp: current.xp + amount }) as ProgressData;
}

export function incrementStreak(): ProgressData {
  const current = getProgress();
  return saveProgress({ streak: current.streak + 1 }) as ProgressData;
}

export function markTopicComplete(
  topicId: string,
  score: number,
  total: number
): ProgressData {
  const current = getProgress();
  const existing = current.completedTopics[topicId];
  const pct = Math.round((score / total) * 100);
  return saveProgress({
    completedTopics: {
      ...current.completedTopics,
      [topicId]: {
        score: pct,
        bestScore: existing ? Math.max(existing.bestScore, pct) : pct,
        attempts: existing ? existing.attempts + 1 : 1,
      },
    },
  }) as ProgressData;
}

export function recordWordAttempt(
  wordSv: string,
  correct: boolean
): ProgressData {
  const current = getProgress();
  const existing = current.wordHistory[wordSv] || {
    correct: 0,
    wrong: 0,
    lastSeen: "",
  };
  return saveProgress({
    wordHistory: {
      ...current.wordHistory,
      [wordSv]: {
        correct: existing.correct + (correct ? 1 : 0),
        wrong: existing.wrong + (correct ? 0 : 1),
        lastSeen: new Date().toISOString(),
      },
    },
  }) as ProgressData;
}

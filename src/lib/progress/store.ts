"use client";

import type { ProgressData } from "@/types/progress.types";
import { upsertProfile, fetchProfile } from "@/lib/db/profiles.db";
import { upsertTopicScore, fetchTopicScores } from "@/lib/db/progress.db";
import { fetchWeeklyGoal, upsertWeeklyGoal } from "@/lib/db/goals.db";

const LS_KEY = "sfi_progress";

function persistToLS(data: ProgressData) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { }
}

function loadFromLS(): Partial<ProgressData> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}

function dispatch() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("progress-update"));
}

let state: ProgressData = {
  xp: 0,
  streak: 0,
  completedTopics: {},
  wordHistory: {},
  lastActivity: new Date().toISOString(),
  userId: null,
};

if (typeof window !== "undefined") {
  state = { ...state, ...loadFromLS(), userId: null };
}

export function getProgress(): ProgressData {
  return state;
}

export function setUserId(userId: string | null) {
  if (!userId) {
    state = { xp: 0, streak: 0, completedTopics: {}, wordHistory: {}, lastActivity: new Date().toISOString(), userId: null };
    dispatch();
    return;
  }
  state.userId = userId;
}

export function addXP(amount: number): ProgressData {
  state.xp += amount;
  state.lastActivity = new Date().toISOString();
  persistToLS(state);
  if (state.userId) upsertProfile(state.userId, { xp: state.xp, streak: state.streak, lastActivity: state.lastActivity });
  dispatch();
  return state;
}

export function incrementStreak(): ProgressData {
  const today = new Date().toISOString().split("T")[0];
  const lastDate = state.lastActivity?.split("T")[0] ?? null;

  if (lastDate === today) return state;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  state.streak = lastDate === yesterdayStr ? state.streak + 1 : 1;
  state.lastActivity = new Date().toISOString();

  persistToLS(state);
  if (state.userId) upsertProfile(state.userId, { xp: state.xp, streak: state.streak, lastActivity: state.lastActivity });
  dispatch();
  return state;
}

export function markTopicComplete(topicId: string, score: number, total: number): ProgressData {
  const existing = state.completedTopics[topicId];
  const pct = Math.round((score / total) * 100);
  const bestScore = existing ? Math.max(existing.bestScore, pct) : pct;
  const attempts = existing ? existing.attempts + 1 : 1;
  const xpEarned = score * 10;

  state.completedTopics[topicId] = {
    score: pct, bestScore, attempts,
    completedAt: existing?.completedAt || new Date().toISOString(),
  };
  state.xp += xpEarned;
  state.lastActivity = new Date().toISOString();
  state.lastStudyHour = new Date().getHours();

  persistToLS(state);

  if (state.userId) {
    upsertTopicScore(state.userId, topicId, pct, bestScore, attempts, xpEarned);

    if (!existing) {
      fetchWeeklyGoal(state.userId).then((goal) => {
        if (!goal) return;
        upsertWeeklyGoal(state.userId!, { ...goal, xpEarned: goal.xpEarned + xpEarned, topicsCompleted: goal.topicsCompleted + 1 });
      });
    }
  }

  dispatch();
  return state;
}

export function recordWordAttempt(wordSv: string, correct: boolean): ProgressData {
  const existing = state.wordHistory[wordSv] || { correct: 0, wrong: 0, lastSeen: "" };
  state.wordHistory[wordSv] = {
    correct: existing.correct + (correct ? 1 : 0),
    wrong: existing.wrong + (correct ? 0 : 1),
    lastSeen: new Date().toISOString(),
  };
  state.lastActivity = new Date().toISOString();
  persistToLS(state);
  dispatch();
  return state;
}

export function saveProgress(data: Partial<ProgressData>) {
  state = { ...state, ...data };
  persistToLS(state);
  dispatch();
}

export async function loadCloudProgress(userId: string) {
  setUserId(userId);
  const [cloudProfile, cloudTopics] = await Promise.all([
    fetchProfile(userId),
    fetchTopicScores(userId),
  ]);

  if (cloudProfile) {
    state.xp = Math.max(state.xp, cloudProfile.xp || 0);
    state.streak = Math.max(state.streak, cloudProfile.streak || 0);
  }

  for (const ct of cloudTopics) {
    const local = state.completedTopics[ct.topic_id];
    if (!local || ct.best_score > local.bestScore) {
      state.completedTopics[ct.topic_id] = {
        score: ct.score,
        bestScore: ct.best_score,
        attempts: ct.attempts,
        completedAt: ct.last_attempted || new Date().toISOString(),
      };
    }
  }

  persistToLS(state);
  dispatch();
}

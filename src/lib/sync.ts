"use client";

import { supabase, isSupabaseConfigured } from "./supabase";

// Save progress to Supabase when user is logged in
export async function syncProgressToCloud(userId: string, progress: {
  xp: number;
  streak: number;
  lastActivity: string;
}) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      xp: progress.xp,
      streak: progress.streak,
      last_activity: progress.lastActivity,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) console.error("Sync profile error:", error.message);
}

// Load progress from Supabase
export async function loadProgressFromCloud(userId: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

// Save topic completion
export async function syncTopicScore(userId: string, topicId: string, score: number, bestScore: number, attempts: number, xpEarned: number) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from("user_progress")
    .upsert({
      user_id: userId,
      topic_id: topicId,
      score,
      best_score: bestScore,
      attempts,
      xp_earned: xpEarned,
      completed: true,
      last_attempted: new Date().toISOString(),
    }, { onConflict: "user_id,topic_id" });

  if (error) console.error("Sync topic error:", error.message);
}

// Load all topic scores for a user
export async function loadTopicScores(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);

  if (error) return [];
  return data || [];
}

// Save word attempt for spaced repetition
export async function syncWordAttempt(userId: string, wordSv: string, wordEn: string, correct: boolean) {
  if (!isSupabaseConfigured) return;

  // Get existing record
  const { data: existing } = await supabase
    .from("spaced_repetition")
    .select("*")
    .eq("user_id", userId)
    .eq("word_sv", wordSv)
    .single();

  if (existing) {
    // Update with spaced repetition algorithm
    let { ease_factor, interval, repetitions } = existing;

    if (correct) {
      repetitions += 1;
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 3;
      else interval = Math.round(interval * ease_factor);
      ease_factor = Math.max(1.3, ease_factor + 0.1 - 0.5 * (5 - 4) * (0.08 + (5 - 4) * 0.02));
    } else {
      repetitions = 0;
      interval = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    await supabase
      .from("spaced_repetition")
      .update({
        ease_factor,
        interval,
        repetitions,
        next_review: nextReview.toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create new record
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1);

    await supabase
      .from("spaced_repetition")
      .insert({
        user_id: userId,
        word_sv: wordSv,
        word_en: wordEn,
        ease_factor: 2.5,
        interval: 1,
        repetitions: correct ? 1 : 0,
        next_review: nextReview.toISOString(),
      });
  }
}

// Get words due for review
export async function getWordsForReview(userId: string, limit: number = 20) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("spaced_repetition")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review", new Date().toISOString())
    .order("next_review", { ascending: true })
    .limit(limit);

  if (error) return [];
  return data || [];
}

// Get user stats summary
export async function getUserStats(userId: string) {
  if (!isSupabaseConfigured) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: topics } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);

  const { data: words, count } = await supabase
    .from("spaced_repetition")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  return {
    xp: profile?.xp || 0,
    streak: profile?.streak || 0,
    topicsCompleted: topics?.length || 0,
    totalAttempts: topics?.reduce((sum: number, t: { attempts: number }) => sum + t.attempts, 0) || 0,
    averageScore: topics?.length
      ? Math.round(topics.reduce((sum: number, t: { best_score: number }) => sum + t.best_score, 0) / topics.length)
      : 0,
    wordsLearned: count || 0,
    wordsMastered: words?.filter((w: { repetitions: number }) => w.repetitions >= 5).length || 0,
  };
}
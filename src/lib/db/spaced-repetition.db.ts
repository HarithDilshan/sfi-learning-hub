"use client";

import { supabase, isSupabaseConfigured } from "./client";
import type { SpacedRepetitionCard } from "@/types/database.types";

export async function syncWordAttempt(userId: string, wordSv: string, wordEn: string, correct: boolean) {
  if (!isSupabaseConfigured) return;

  const { data: existing } = await supabase
    .from("spaced_repetition")
    .select("*")
    .eq("user_id", userId)
    .eq("word_sv", wordSv)
    .single();

  if (existing) {
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
    await supabase.from("spaced_repetition").update({ ease_factor, interval, repetitions, next_review: nextReview.toISOString() }).eq("id", existing.id);
  } else {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1);
    await supabase.from("spaced_repetition").insert({ user_id: userId, word_sv: wordSv, word_en: wordEn, ease_factor: 2.5, interval: 1, repetitions: correct ? 1 : 0, next_review: nextReview.toISOString() });
  }
}

export async function fetchWordsForReview(userId: string, limit: number = 20): Promise<SpacedRepetitionCard[]> {
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

export async function fetchUserWordStats(userId: string) {
  if (!isSupabaseConfigured) return { count: 0, mastered: 0 };
  const { data, count } = await supabase
    .from("spaced_repetition")
    .select("*", { count: "exact" })
    .eq("user_id", userId);
  return {
    count: count || 0,
    mastered: (data || []).filter((w: SpacedRepetitionCard) => w.repetitions >= 5).length,
  };
}

"use client";

import { supabase, isSupabaseConfigured } from "./client";
import type { UserProgressRow } from "@/types/database.types";

export async function fetchTopicScores(userId: string): Promise<UserProgressRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) return [];
  return data || [];
}

export async function upsertTopicScore(
  userId: string,
  topicId: string,
  score: number,
  bestScore: number,
  attempts: number,
  xpEarned: number
) {
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
  if (error) console.error("[progress.db] upsertTopicScore:", error.message);
}

"use client";

import { supabase, isSupabaseConfigured } from "./client";

export interface WeeklyGoalRow {
  userId: string;
  targetXp: number;
  targetTopics: number;
  xpEarned: number;
  topicsCompleted: number;
  weekStart: string;
}

export async function fetchWeeklyGoal(userId: string): Promise<WeeklyGoalRow | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return {
    userId: data.user_id,
    targetXp: data.target_xp,
    targetTopics: data.target_topics,
    xpEarned: data.xp_earned,
    topicsCompleted: data.topics_completed,
    weekStart: data.week_start,
  };
}

export async function upsertWeeklyGoal(userId: string, goal: WeeklyGoalRow) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("weekly_goals")
    .upsert({
      user_id: userId,
      target_xp: goal.targetXp,
      target_topics: goal.targetTopics,
      xp_earned: goal.xpEarned,
      topics_completed: goal.topicsCompleted,
      week_start: goal.weekStart,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) console.error("[goals.db] upsertWeeklyGoal:", error.message);
}

export async function fetchGoalHistory(userId: string, limit: number = 8): Promise<WeeklyGoalRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((d) => ({
    userId: d.user_id,
    targetXp: d.target_xp ?? d.xp_target,
    targetTopics: d.target_topics ?? d.topics_target,
    xpEarned: d.xp_earned,
    topicsCompleted: d.topics_completed,
    weekStart: d.week_start,
  }));
}

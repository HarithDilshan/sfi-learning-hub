"use client";

import { supabase, isSupabaseConfigured } from "./client";
import type { LeaderboardEntry } from "@/types/database.types";

export async function fetchLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured) return [];

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, xp, streak, last_activity")
    .order("xp", { ascending: false })
    .limit(limit);

  if (error || !profiles) return [];

  const userIds = profiles.filter(p => p.xp > 0).map(p => p.user_id);
  const { data: topicCounts } = await supabase
    .from("user_progress")
    .select("user_id")
    .in("user_id", userIds);

  const countMap: Record<string, number> = {};
  for (const row of topicCounts || []) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + 1;
  }

  return profiles
    .filter(p => p.xp > 0)
    .map(p => ({
      user_id: p.user_id,
      display_name: p.display_name || "Anonym elev",
      xp: p.xp || 0,
      streak: p.streak || 0,
      topics_completed: countMap[p.user_id] || 0,
      last_activity: p.last_activity,
    }));
}

export async function fetchUserRank(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, xp")
    .order("xp", { ascending: false });
  if (!data) return 0;
  const idx = data.findIndex((p) => p.user_id === userId);
  return idx >= 0 ? idx + 1 : 0;
}

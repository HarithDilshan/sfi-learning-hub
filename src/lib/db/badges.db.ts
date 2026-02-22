"use client";

import { supabase } from "./client";
import type { BadgeMetadata } from "@/types/badge.types";

export async function fetchAllBadges(): Promise<BadgeMetadata[]> {
  const { data, error } = await supabase.from("badges").select("*").order("sort_order");
  if (error) { console.error("[badges.db] fetchAllBadges:", error.message); return []; }
  return data as BadgeMetadata[];
}

export async function fetchUserBadges(userId: string): Promise<{ badge_id: string; unlocked_at: string }[]> {
  const { data, error } = await supabase.from("user_badges").select("badge_id, unlocked_at").eq("user_id", userId);
  if (error) { console.error("[badges.db] fetchUserBadges:", error.message); return []; }
  return data;
}

export async function awardBadges(userId: string, badgeIds: string[]): Promise<string[]> {
  if (badgeIds.length === 0) return [];
  const rows = badgeIds.map((badge_id) => ({ user_id: userId, badge_id }));
  const { data, error } = await supabase
    .from("user_badges")
    .upsert(rows, { onConflict: "user_id,badge_id", ignoreDuplicates: true })
    .select("badge_id");
  if (error) { console.error("[badges.db] awardBadges:", error.message); return []; }
  return (data ?? []).map((r: { badge_id: string }) => r.badge_id);
}

export async function fetchTopicIdsByLevel(level?: string): Promise<string[]> {
  const query = supabase.from("topics").select("id");
  if (level) query.eq("course_id", level);
  const { data, error } = await query;
  if (error) { console.error("[badges.db] fetchTopicIdsByLevel:", error.message); return []; }
  return data.map((t: { id: string }) => t.id);
}

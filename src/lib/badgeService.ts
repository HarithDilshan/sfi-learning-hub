"use client";

import { supabase } from "./supabase";
import { BadgeMetadata } from "./badges";

// ─── Fetch all badge metadata from Supabase ───
export async function fetchAllBadges(): Promise<BadgeMetadata[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("[badgeService] fetchAllBadges:", error.message);
    return [];
  }
  return data as BadgeMetadata[];
}

// ─── Fetch badge ids already unlocked by a user ───
export async function fetchUserBadges(
  userId: string
): Promise<{ badge_id: string; unlocked_at: string }[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badge_id, unlocked_at")
    .eq("user_id", userId);

  if (error) {
    console.error("[badgeService] fetchUserBadges:", error.message);
    return [];
  }
  return data;
}

// ─── Award a single badge to a user (safe — ignores duplicates) ───
export async function awardBadge(
  userId: string,
  badgeId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badgeId })
    .select()
    .maybeSingle();

  if (error) {
    // 23505 = unique constraint violation → badge already awarded, that's fine
    if (error.code === "23505") return false;
    console.error("[badgeService] awardBadge:", error.message);
    return false;
  }
  return true; // true means it was newly awarded
}

// ─── Award multiple badges at once (used after bulk evaluation) ───
export async function awardBadges(
  userId: string,
  badgeIds: string[]
): Promise<string[]> {
  if (badgeIds.length === 0) return [];

  const rows = badgeIds.map((badge_id) => ({ user_id: userId, badge_id }));

  const { data, error } = await supabase
    .from("user_badges")
    .upsert(rows, { onConflict: "user_id,badge_id", ignoreDuplicates: true })
    .select("badge_id");

  if (error) {
    console.error("[badgeService] awardBadges:", error.message);
    return [];
  }

  // Return only the ids that were actually newly inserted
  return (data ?? []).map((r: { badge_id: string }) => r.badge_id);
}

// Fetch all topic IDs for a given level (or all levels if omitted)
export async function fetchTopicIdsByLevel(level?: string): Promise<string[]> {
  const query = supabase.from("topics").select("id");
  if (level) query.eq("level", level);
  
  const { data, error } = await query;
  if (error) {
    console.error("[badgeService] fetchTopicIdsByLevel:", error.message);
    return [];
  }
  return data.map((t: { id: string }) => t.id);
}
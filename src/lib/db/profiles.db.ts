"use client";

import { supabase, isSupabaseConfigured } from "./client";
import type { UserProfileRow } from "@/types/database.types";

export async function fetchProfile(userId: string): Promise<UserProfileRow | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as UserProfileRow;
}

export async function upsertProfile(userId: string, updates: {
  xp: number;
  streak: number;
  lastActivity: string;
}) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      user_id: userId,
      xp: updates.xp,
      streak: updates.streak,
      last_activity: updates.lastActivity,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) console.error("[profiles.db] upsertProfile:", error.message);
}

export async function updateDisplayName(userId: string, name: string) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("user_profiles")
    .update({ display_name: name })
    .eq("user_id", userId);
  if (error) console.error("[profiles.db] updateDisplayName:", error.message);
}

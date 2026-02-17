"use client";

import { supabase, isSupabaseConfigured } from "./supabase";

export interface WeeklyGoal {
  xpTarget: number;
  xpEarned: number;
  weekStart: string; // ISO date of Monday
  topicsTarget: number;
  topicsCompleted: number;
}

// Get the Monday of the current week
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

// Get days remaining in the week
export function getDaysRemaining(): number {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 0 : 7 - day;
}

// Get current week label
export function getWeekLabel(): string {
  const start = getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${new Date(start).toLocaleDateString("sv-SE", opts)} – ${end.toLocaleDateString("sv-SE", opts)}`;
}

// Default goal
const DEFAULT_GOAL: WeeklyGoal = {
  xpTarget: 100,
  xpEarned: 0,
  weekStart: getWeekStart(),
  topicsTarget: 3,
  topicsCompleted: 0,
};

// Save goal to Supabase
export async function saveWeeklyGoal(userId: string, goal: WeeklyGoal) {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from("weekly_goals").upsert(
    {
      user_id: userId,
      week_start: goal.weekStart,
      xp_target: goal.xpTarget,
      xp_earned: goal.xpEarned,
      topics_target: goal.topicsTarget,
      topics_completed: goal.topicsCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" }
  );

  if (error) console.error("Save goal error:", error.message);
}

// Load current week's goal from Supabase
export async function loadWeeklyGoal(userId: string): Promise<WeeklyGoal> {
  if (!isSupabaseConfigured) return { ...DEFAULT_GOAL, weekStart: getWeekStart() };

  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  if (error || !data) {
    return { ...DEFAULT_GOAL, weekStart };
  }

  return {
    xpTarget: data.xp_target,
    xpEarned: data.xp_earned,
    weekStart: data.week_start,
    topicsTarget: data.topics_target,
    topicsCompleted: data.topics_completed,
  };
}

// Load past weeks' goals for history
export async function loadGoalHistory(
  userId: string,
  limit: number = 8
): Promise<WeeklyGoal[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    xpTarget: d.xp_target,
    xpEarned: d.xp_earned,
    weekStart: d.week_start,
    topicsTarget: d.topics_target,
    topicsCompleted: d.topics_completed,
  }));
}

// Update progress for current week
export async function updateWeeklyProgress(
  userId: string,
  xpEarned: number,
  topicsCompleted: number
) {
  if (!isSupabaseConfigured) return;

  const weekStart = getWeekStart();

  // First ensure the row exists
  const existing = await loadWeeklyGoal(userId);

  await saveWeeklyGoal(userId, {
    ...existing,
    weekStart,
    xpEarned,
    topicsCompleted,
  });
}

// Preset goals
export const goalPresets = [
  { label: "Lätt (Easy)", xp: 50, topics: 2, desc: "Perfekt för att börja" },
  { label: "Lagom (Moderate)", xp: 100, topics: 3, desc: "Bra balans" },
  { label: "Ambitiös (Ambitious)", xp: 200, topics: 5, desc: "Utmana dig själv" },
  { label: "Intensiv (Intense)", xp: 500, topics: 10, desc: "Maximalt lärande" },
];

// Get encouragement message based on progress
export function getEncouragement(goal: WeeklyGoal): {
  message: string;
  emoji: string;
  color: string;
} {
  const xpPct = goal.xpTarget > 0 ? goal.xpEarned / goal.xpTarget : 0;
  const topicsPct =
    goal.topicsTarget > 0 ? goal.topicsCompleted / goal.topicsTarget : 0;
  const avgPct = (xpPct + topicsPct) / 2;
  const daysLeft = getDaysRemaining();

  if (xpPct >= 1 && topicsPct >= 1) {
    return {
      message: "Du nådde ditt mål! Fantastiskt! 🎉",
      emoji: "🏆",
      color: "var(--correct)",
    };
  }

  if (avgPct >= 0.75) {
    return {
      message: "Nästan framme! Du klarar det!",
      emoji: "💪",
      color: "var(--correct)",
    };
  }

  if (avgPct >= 0.5) {
    return {
      message: "Bra tempo! Halvvägs redan.",
      emoji: "📈",
      color: "var(--blue)",
    };
  }

  if (avgPct >= 0.25) {
    return {
      message: `Bra start! ${daysLeft} dagar kvar.`,
      emoji: "🌱",
      color: "var(--forest)",
    };
  }

  if (avgPct > 0) {
    return {
      message: `Du har börjat! ${daysLeft} dagar kvar att nå målet.`,
      emoji: "🚀",
      color: "var(--blue)",
    };
  }

  return {
    message: `Ny vecka! Börja med en lektion idag.`,
    emoji: "📅",
    color: "var(--text-light)",
  };
}
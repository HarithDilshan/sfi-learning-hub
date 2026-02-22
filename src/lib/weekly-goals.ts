// SHIM: Backward compatibility — import from "@/lib/db/goals.db" in new code
import { fetchWeeklyGoal as _fetch, upsertWeeklyGoal as _upsert, type WeeklyGoalRow, fetchGoalHistory } from "@/lib/db/goals.db";

export async function loadWeeklyGoal(userId: string): Promise<WeeklyGoalRow> {
  const goal = await _fetch(userId);
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date(Date.now() - new Date().getDay() * 86400000).toISOString().split("T")[0];
  return goal || { userId, targetXp: 500, targetTopics: 5, xpEarned: 0, topicsCompleted: 0, weekStart };
}

export async function saveWeeklyGoal(userId: string, goal: WeeklyGoalRow) {
  return _upsert(userId, goal);
}

export async function updateWeeklyProgress(userId: string, xpEarned: number, topicsCompleted: number) {
  const goal = await _fetch(userId);
  if (!goal) return;
  return _upsert(userId, { ...goal, xpEarned, topicsCompleted });
}

export type { WeeklyGoalRow as WeeklyGoal };

export async function loadGoalHistory(userId: string, limit: number = 8): Promise<WeeklyGoalRow[]> {
  const rows = await fetchGoalHistory(userId, limit);
  return rows.map((r) => ({
    userId: r.userId,
    targetXp: r.targetXp,
    xpEarned: r.xpEarned,
    weekStart: r.weekStart,
    targetTopics: r.targetTopics,
    topicsCompleted: r.topicsCompleted,
  }));
}

export const goalPresets = [
  { label: "Lätt (Easy)", xp: 50, topics: 2, desc: "Perfekt för att börja" },
  { label: "Lagom (Moderate)", xp: 100, topics: 3, desc: "Bra balans" },
  { label: "Ambitiös (Ambitious)", xp: 200, topics: 5, desc: "Utmana dig själv" },
  { label: "Intensiv (Intense)", xp: 500, topics: 10, desc: "Maximalt lärande" },
];

// Get days remaining in the week
export function getDaysRemaining(): number {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 0 : 7 - day;
}

// Get encouragement message based on progress
export function getEncouragement(goal: WeeklyGoalRow): {
  message: string;
  emoji: string;
  color: string;
} {
  const xpPct = goal.targetXp > 0 ? goal.xpEarned / goal.targetXp : 0;
  const topicsPct =
    goal.targetTopics > 0 ? goal.topicsCompleted / goal.targetTopics : 0;
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

// Get the Monday of the current week
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

// Get current week label
export function getWeekLabel(): string {
  const start = getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${new Date(start).toLocaleDateString("sv-SE", opts)} – ${end.toLocaleDateString("sv-SE", opts)}`;
}

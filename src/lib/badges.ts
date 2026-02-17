"use client";

import { ProgressData } from "./progress";

export interface Badge {
  id: string;
  icon: string;
  name: string;
  nameSv: string;
  description: string;
  category: "beginner" | "progress" | "mastery" | "streak" | "special";
  check: (progress: ProgressData) => boolean;
}

export const allBadges: Badge[] = [
  // ─── BEGINNER ───
  {
    id: "first-quiz",
    icon: "🎯",
    name: "First Quiz",
    nameSv: "Första övningen",
    description: "Complete your first exercise",
    category: "beginner",
    check: (p) => Object.keys(p.completedTopics).length >= 1,
  },
  {
    id: "first-perfect",
    icon: "💯",
    name: "Perfect Score",
    nameSv: "Full pott",
    description: "Get 100% on any exercise",
    category: "beginner",
    check: (p) =>
      Object.values(p.completedTopics).some((t) => t.bestScore === 100),
  },
  {
    id: "word-learner",
    icon: "📖",
    name: "Word Learner",
    nameSv: "Ordlärling",
    description: "Practice 10 words in review mode",
    category: "beginner",
    check: (p) => Object.keys(p.wordHistory).length >= 10,
  },
  {
    id: "first-steps",
    icon: "👶",
    name: "First Steps",
    nameSv: "Första stegen",
    description: "Earn your first 50 XP",
    category: "beginner",
    check: (p) => p.xp >= 50,
  },

  // ─── PROGRESS ───
  {
    id: "five-topics",
    icon: "📚",
    name: "Bookworm",
    nameSv: "Bokmal",
    description: "Complete 5 different topics",
    category: "progress",
    check: (p) => Object.keys(p.completedTopics).length >= 5,
  },
  {
    id: "ten-topics",
    icon: "🎓",
    name: "Dedicated Student",
    nameSv: "Flitig elev",
    description: "Complete 10 different topics",
    category: "progress",
    check: (p) => Object.keys(p.completedTopics).length >= 10,
  },
  {
    id: "twenty-topics",
    icon: "🏅",
    name: "Topic Master",
    nameSv: "Ämnesmästare",
    description: "Complete 20 different topics",
    category: "progress",
    check: (p) => Object.keys(p.completedTopics).length >= 20,
  },
  {
    id: "xp-100",
    icon: "⭐",
    name: "Rising Star",
    nameSv: "Stigande stjärna",
    description: "Earn 100 XP total",
    category: "progress",
    check: (p) => p.xp >= 100,
  },
  {
    id: "xp-500",
    icon: "🌟",
    name: "Shining Star",
    nameSv: "Lysande stjärna",
    description: "Earn 500 XP total",
    category: "progress",
    check: (p) => p.xp >= 500,
  },
  {
    id: "xp-1000",
    icon: "✨",
    name: "Superstar",
    nameSv: "Superstjärna",
    description: "Earn 1000 XP total",
    category: "progress",
    check: (p) => p.xp >= 1000,
  },
  {
    id: "xp-5000",
    icon: "💎",
    name: "Diamond Learner",
    nameSv: "Diamantelev",
    description: "Earn 5000 XP total",
    category: "progress",
    check: (p) => p.xp >= 5000,
  },

  // ─── MASTERY ───
  {
    id: "kurs-a-complete",
    icon: "🇸🇪",
    name: "Kurs A Master",
    nameSv: "Kurs A klar",
    description: "Complete all Kurs A topics",
    category: "mastery",
    check: (p) => {
      const aTopics = ["a1", "a2", "a3", "a4"];
      return aTopics.every((id) => p.completedTopics[id]);
    },
  },
  {
    id: "kurs-b-complete",
    icon: "🏔️",
    name: "Kurs B Master",
    nameSv: "Kurs B klar",
    description: "Complete all Kurs B topics",
    category: "mastery",
    check: (p) => {
      const bTopics = ["b1", "b2", "b3"];
      return bTopics.every((id) => p.completedTopics[id]);
    },
  },
  {
    id: "kurs-c-complete",
    icon: "🏆",
    name: "Kurs C Master",
    nameSv: "Kurs C klar",
    description: "Complete all Kurs C topics",
    category: "mastery",
    check: (p) => {
      const cTopics = ["c1", "c2", "c3"];
      return cTopics.every((id) => p.completedTopics[id]);
    },
  },
  {
    id: "kurs-d-complete",
    icon: "👑",
    name: "Kurs D Master",
    nameSv: "Kurs D klar",
    description: "Complete all Kurs D topics",
    category: "mastery",
    check: (p) => {
      const dTopics = ["d1", "d2", "d3"];
      return dTopics.every((id) => p.completedTopics[id]);
    },
  },
  {
    id: "all-courses",
    icon: "🎖️",
    name: "SFI Graduate",
    nameSv: "SFI-examen",
    description: "Complete all courses A through D",
    category: "mastery",
    check: (p) => {
      const allTopics = ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "c1", "c2", "c3", "d1", "d2", "d3"];
      return allTopics.every((id) => p.completedTopics[id]);
    },
  },
  {
    id: "vocab-50",
    icon: "📝",
    name: "Vocabulary Builder",
    nameSv: "Ordbyggare",
    description: "Practice 50 different words",
    category: "mastery",
    check: (p) => Object.keys(p.wordHistory).length >= 50,
  },
  {
    id: "vocab-100",
    icon: "📕",
    name: "Word Collector",
    nameSv: "Ordsamlare",
    description: "Practice 100 different words",
    category: "mastery",
    check: (p) => Object.keys(p.wordHistory).length >= 100,
  },
  {
    id: "accuracy-90",
    icon: "🎯",
    name: "Sharpshooter",
    nameSv: "Prickskytt",
    description: "Average best score above 90% across 5+ topics",
    category: "mastery",
    check: (p) => {
      const topics = Object.values(p.completedTopics);
      if (topics.length < 5) return false;
      const avg =
        topics.reduce((s, t) => s + t.bestScore, 0) / topics.length;
      return avg >= 90;
    },
  },

  // ─── STREAK ───
  {
    id: "streak-3",
    icon: "🔥",
    name: "On Fire",
    nameSv: "Brinner!",
    description: "Reach a 3 streak",
    category: "streak",
    check: (p) => p.streak >= 3,
  },
  {
    id: "streak-7",
    icon: "🔥",
    name: "Week Warrior",
    nameSv: "Veckokämpe",
    description: "Reach a 7 streak",
    category: "streak",
    check: (p) => p.streak >= 7,
  },
  {
    id: "streak-14",
    icon: "🔥",
    name: "Fortnight Fighter",
    nameSv: "Tvåveckors kämpe",
    description: "Reach a 14 streak",
    category: "streak",
    check: (p) => p.streak >= 14,
  },
  {
    id: "streak-30",
    icon: "🔥",
    name: "Monthly Master",
    nameSv: "Månadsmästare",
    description: "Reach a 30 streak",
    category: "streak",
    check: (p) => p.streak >= 30,
  },

  // ─── SPECIAL ───
  {
    id: "daily-champion",
    icon: "📅",
    name: "Daily Champion",
    nameSv: "Dagsutmanare",
    description: "Complete 5 daily challenges",
    category: "special",
    check: (p) => {
      const dailyCount = Object.keys(p.completedTopics).filter((k) =>
        k.startsWith("daily-")
      ).length;
      return dailyCount >= 5;
    },
  },
  {
    id: "daily-legend",
    icon: "🌟",
    name: "Daily Legend",
    nameSv: "Dagslegend",
    description: "Complete 30 daily challenges",
    category: "special",
    check: (p) => {
      const dailyCount = Object.keys(p.completedTopics).filter((k) =>
        k.startsWith("daily-")
      ).length;
      return dailyCount >= 30;
    },
  },
  {
    id: "night-owl",
    icon: "🦉",
    name: "Night Owl",
    nameSv: "Nattuggla",
    description: "Study after 11 PM",
    category: "special",
    check: (p) => {
      const hour = new Date(p.lastActivity).getHours();
      return hour >= 23 || hour < 4;
    },
  },
  {
    id: "early-bird",
    icon: "🐦",
    name: "Early Bird",
    nameSv: "Morgonfågel",
    description: "Study before 7 AM",
    category: "special",
    check: (p) => {
      const hour = new Date(p.lastActivity).getHours();
      return hour >= 4 && hour < 7;
    },
  },
];

export function getUnlockedBadges(progress: ProgressData): Badge[] {
  return allBadges.filter((b) => b.check(progress));
}

export function getLockedBadges(progress: ProgressData): Badge[] {
  return allBadges.filter((b) => !b.check(progress));
}

export function getNextBadges(progress: ProgressData, count: number = 3): Badge[] {
  // Return locked badges that are closest to being unlocked
  const locked = getLockedBadges(progress);
  
  // Simple priority: beginner first, then progress, then others
  const priority: Record<string, number> = {
    beginner: 0,
    progress: 1,
    streak: 2,
    mastery: 3,
    special: 4,
  };

  return locked
    .sort((a, b) => (priority[a.category] || 5) - (priority[b.category] || 5))
    .slice(0, count);
}
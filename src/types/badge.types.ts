// Badge types

export interface BadgeMetadata {
  id: string;
  icon: string;
  name: string;
  name_sv: string;
  description: string;
  category: "beginner" | "progress" | "mastery" | "streak" | "special";
  sort_order: number;
}

export interface BadgeWithStatus extends BadgeMetadata {
  unlocked: boolean;
  unlockedAt?: string;
  progressPct: number; // 0–100
}

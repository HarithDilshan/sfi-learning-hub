// Database row types matching Supabase table schemas

export interface UserProfileRow {
  user_id: string;
  display_name: string | null;
  xp: number;
  streak: number;
  last_activity: string;
  updated_at: string;
}

export interface UserProgressRow {
  id: string;
  user_id: string;
  topic_id: string;
  score: number;
  best_score: number;
  completed: boolean;
  xp_earned: number;
  attempts: number;
  last_attempted: string;
}

export interface SpacedRepetitionCard {
  id: string;
  user_id: string;
  word_sv: string;
  word_en: string;
  ease_factor: number;
  interval: number;
  next_review: string;
  repetitions: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp: number;
  streak: number;
  topics_completed: number;
  last_activity: string;
}

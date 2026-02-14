import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database
export interface UserProgress {
  id: string;
  user_id: string;
  topic_id: string;
  score: number;
  completed: boolean;
  xp_earned: number;
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

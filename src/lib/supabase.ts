import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Only create client if credentials exist — avoids build errors
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a dummy placeholder that won't crash at build time
  supabase = new Proxy({} as SupabaseClient, {
    get: () => () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
  });
}

export { supabase };
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

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

export type { SupabaseClient } from "@supabase/supabase-js";
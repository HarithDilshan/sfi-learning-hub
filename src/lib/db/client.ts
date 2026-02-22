import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  supabase = new Proxy({} as SupabaseClient, {
    get: () => () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
  });
}

export { supabase };
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

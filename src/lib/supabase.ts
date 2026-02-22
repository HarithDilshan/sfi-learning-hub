// SHIM: Backward compatibility — import from "@/lib/db/client" in new code
export { supabase, isSupabaseConfigured } from "@/lib/db/client";
export type { SupabaseClient } from "@supabase/supabase-js";
// DB row types moved to @/types/database.types
export type { UserProgressRow as UserProgress, SpacedRepetitionCard } from "@/types/database.types";

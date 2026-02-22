// Re-export everything from store for easy importing
export {
  getProgress,
  setUserId,
  addXP,
  incrementStreak,
  markTopicComplete,
  recordWordAttempt,
  saveProgress,
  loadCloudProgress,
} from "./store";
export type { ProgressData } from "@/types/progress.types";

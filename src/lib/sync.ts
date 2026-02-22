// SHIM: Backward compatibility — import from "@/lib/db/*" or "@/services/sync.service" in new code
export { upsertProfile as syncProgressToCloud, fetchProfile as loadProgressFromCloud, updateDisplayName } from "@/lib/db/profiles.db";
export { fetchTopicScores as loadTopicScores, upsertTopicScore as syncTopicScore } from "@/lib/db/progress.db";
export { syncWordAttempt, fetchWordsForReview as getWordsForReview } from "@/lib/db/spaced-repetition.db";
export { fetchLeaderboard as getLeaderboard, fetchUserRank as getUserRank } from "@/lib/db/leaderboard.db";
export { getUserStats } from "@/services/sync.service";
export type { LeaderboardEntry } from "@/types/database.types";

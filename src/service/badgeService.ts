// SHIM: Backward compatibility — import from "@/services/badge.service" in new code
export { fetchAllBadges, fetchUserBadges, awardBadges, fetchTopicIdsByLevel } from "@/services/badge.service";
// awardBadge (singular) helper
import { awardBadges } from "@/services/badge.service";
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const awarded = await awardBadges(userId, [badgeId]);
  return awarded.length > 0;
}

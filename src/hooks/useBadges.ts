"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getProgress } from "@/lib/progress";
import {
  BadgeMetadata,
  BadgeWithStatus,
  evaluateBadges,
  mergeBadgeStatus,
  getNextBadges as computeNextBadges,
  fetchAllBadges,
  fetchUserBadges,
  awardBadges,
  fetchTopicIdsByLevel,
} from "@/services/badge.service";

interface UseBadgesReturn {
  allBadges: BadgeWithStatus[];
  unlockedBadges: BadgeWithStatus[];
  lockedBadges: BadgeWithStatus[];
  nextBadges: BadgeWithStatus[];
  newlyUnlocked: BadgeWithStatus[];
  clearNewlyUnlocked: () => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useBadges(userId: string | null): UseBadgesReturn {
  const [metadata, setMetadata] = useState<BadgeMetadata[]>([]);
  const [topicMap, setTopicMap] = useState<Record<string, string[]>>({});
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockedAt, setUnlockedAt] = useState<Record<string, string>>({});
  const [newlyUnlocked, setNewlyUnlocked] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const metadataLoaded = useRef(false);
  const prevUnlockedRef = useRef<Set<string>>(new Set());

  // Load badge metadata + topic map once per session
  useEffect(() => {
    if (metadataLoaded.current) return;
    metadataLoaded.current = true;
    (async () => {
      const [badges, aIds, bIds, cIds, dIds] = await Promise.all([
        fetchAllBadges(),
        fetchTopicIdsByLevel("A"),
        fetchTopicIdsByLevel("B"),
        fetchTopicIdsByLevel("C"),
        fetchTopicIdsByLevel("D"),
      ]);
      setMetadata(badges);
      setTopicMap({ A: aIds, B: bIds, C: cIds, D: dIds });
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || metadata.length === 0) { setLoading(false); return; }
    setLoading(true);
    const progress = getProgress();
    const userBadges = await fetchUserBadges(userId);
    const ids = new Set(userBadges.map((b) => b.badge_id));
    const at: Record<string, string> = {};
    userBadges.forEach((b) => { at[b.badge_id] = b.unlocked_at; });

    const evaluated = evaluateBadges(metadata, progress, topicMap);
    const newlyEarned = evaluated.filter((b) => b.unlocked && !ids.has(b.id)).map((b) => b.id);
    if (newlyEarned.length > 0) {
      const awarded = await awardBadges(userId, newlyEarned);
      const now = new Date().toISOString();
      awarded.forEach((id) => { ids.add(id); at[id] = now; });
      const toastBadges = evaluated.filter((b) => awarded.includes(b.id) && !prevUnlockedRef.current.has(b.id));
      if (toastBadges.length > 0) setNewlyUnlocked(toastBadges);
    }

    setUnlockedIds(new Set(ids));
    setUnlockedAt(at);
    prevUnlockedRef.current = new Set(ids);
    setLoading(false);
  }, [userId, metadata, topicMap]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("progress-update", handler);
    return () => window.removeEventListener("progress-update", handler);
  }, [refresh]);

  const evaluated = metadata.length > 0 ? evaluateBadges(metadata, getProgress(), topicMap) : [];
  const merged = mergeBadgeStatus(evaluated, unlockedIds, unlockedAt);

  return {
    allBadges: merged,
    unlockedBadges: merged.filter((b) => b.unlocked),
    lockedBadges: merged.filter((b) => !b.unlocked),
    nextBadges: computeNextBadges(merged),
    newlyUnlocked,
    clearNewlyUnlocked: () => setNewlyUnlocked([]),
    loading,
    refresh,
  };
}

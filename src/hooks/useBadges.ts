"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getProgress } from "../lib/progress";
import {
  BadgeMetadata,
  BadgeWithStatus,
  evaluateBadges,
  mergeBadgeStatus,
  getNextBadges as computeNextBadges,
} from "../lib/badges";
import {
  fetchAllBadges,
  fetchUserBadges,
  awardBadges,
  fetchTopicIdsByLevel
} from "../service/badgeService";

interface UseBadgesReturn {
  allBadges: BadgeWithStatus[];
  unlockedBadges: BadgeWithStatus[];
  lockedBadges: BadgeWithStatus[];
  nextBadges: BadgeWithStatus[];
  newlyUnlocked: BadgeWithStatus[]; // for toast notifications
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

  // Cache metadata — only fetch once per session
  const metadataLoaded = useRef(false);

  // ─── Load badge metadata from Supabase (once) ───
  useEffect(() => {
    if (metadataLoaded.current) return;
    metadataLoaded.current = true;

    fetchAllBadges().then((data) => {
      setMetadata(data);
      setLoading(false);
    });
  }, []);

  // ─── Load user's unlocked badges on login ───
  useEffect(() => {
    if (!userId || metadata.length === 0) return;

    fetchUserBadges(userId).then((rows) => {
      const ids = new Set(rows.map((r) => r.badge_id));
      const at: Record<string, string> = {};
      rows.forEach((r) => { at[r.badge_id] = r.unlocked_at; });
      setUnlockedIds(ids);
      setUnlockedAt(at);

      // After loading, immediately evaluate in case user earned badges offline
      evaluateAndAward(userId, ids, at, metadata);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, metadata]);

  // ─── Listen for progress-update events (fires after every exercise) ───
  useEffect(() => {
    if (!userId || metadata.length === 0) return;

    const handler = () => {
      evaluateAndAward(userId, unlockedIds, unlockedAt, metadata);
    };

    window.addEventListener("progress-update", handler);
    return () => window.removeEventListener("progress-update", handler);
  }, [userId, unlockedIds, unlockedAt, metadata]);

  useEffect(() => {
  if (metadata.length === 0) return;
  Promise.all([
    fetchTopicIdsByLevel("A"),
    fetchTopicIdsByLevel("B"),
    fetchTopicIdsByLevel("C"),
    fetchTopicIdsByLevel("D"),
  ]).then(([a, b, c, d]) => {
    setTopicMap({
      A: a, B: b, C: c, D: d,
      all: [...a, ...b, ...c, ...d],
    });
  });
}, [metadata]);

  // ─── Core evaluation function ───
  const evaluateAndAward = useCallback(async (
    uid: string,
    currentUnlocked: Set<string>,
    currentUnlockedAt: Record<string, string>,
    allMetadata: BadgeMetadata[]
  ) => {
    const progress = getProgress();
    const allIds = allMetadata.map((b) => b.id);
    const earned = evaluateBadges(allMetadata, progress, topicMap);

    // Filter to only newly earned ones (not already in DB)
    const toAward = earned.filter((id) => !currentUnlocked.has(id));
    if (toAward.length === 0) return;

    // Write to Supabase
    const awarded = await awardBadges(uid, toAward);
    if (awarded.length === 0) return;

    // Update local state
    const newIds = new Set([...currentUnlocked, ...awarded]);
    const now = new Date().toISOString();
    const newAt = { ...currentUnlockedAt };
    awarded.forEach((id) => { newAt[id] = now; });

    setUnlockedIds(newIds);
    setUnlockedAt(newAt);

    // Build BadgeWithStatus for toast notifications
    const progress2 = getProgress();
    const newBadges = allMetadata
      .filter((b) => awarded.includes(b.id))
      .map((b) => ({
        ...b,
        unlocked: true,
        unlockedAt: now,
        progressPct: 100,
      })) as BadgeWithStatus[];

    setNewlyUnlocked((prev) => [...prev, ...newBadges]);
  }, []);

  // ─── Manual refresh (call from badges page on mount) ───
  const refresh = useCallback(async () => {
    if (!userId || metadata.length === 0) return;
    await evaluateAndAward(userId, unlockedIds, unlockedAt, metadata);
  }, [userId, metadata, unlockedIds, unlockedAt, evaluateAndAward]);

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  // ─── Derived state ───
  const progress = getProgress();
  const allBadgesWithStatus = mergeBadgeStatus(metadata, unlockedIds, unlockedAt, progress, topicMap);
  const unlockedBadges = allBadgesWithStatus.filter((b) => b.unlocked);
  const lockedBadges = allBadgesWithStatus.filter((b) => !b.unlocked);
  const nextBadges = computeNextBadges(metadata, unlockedIds, progress, topicMap, 3);

  return {
    allBadges: allBadgesWithStatus,
    unlockedBadges,
    lockedBadges,
    nextBadges,
    newlyUnlocked,
    clearNewlyUnlocked,
    loading,
    refresh,
  };
}
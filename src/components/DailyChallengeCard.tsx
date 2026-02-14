"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getProgress } from "@/lib/progress";
import { courseData } from "@/data";
import { VocabWord } from "@/data/types";

// Same seeded random as daily challenge page
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return function () {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function DailyChallengeCard() {
  const [completed, setCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setMounted(true);
    const progress = getProgress();
    if (progress.completedTopics[`daily-${today}`]) {
      setCompleted(true);
    }
  }, [today]);

  // Get word of the day (same seed as the daily challenge page)
  const wordOfDay = useMemo(() => {
    const rng = seededRandom(today);
    const allVocab: VocabWord[] = [];
    for (const levelKey of Object.keys(courseData)) {
      const level = courseData[levelKey as keyof typeof courseData];
      if (level?.topics) {
        for (const topic of level.topics) {
          for (const word of topic.vocab) {
            allVocab.push(word);
          }
        }
      }
    }
    return seededShuffle(allVocab, rng)[0];
  }, [today]);

  if (!mounted) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }}
    >
      <div className="p-6 sm:p-8 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📅</span>
              <h3 className="text-lg font-semibold">Dagens Utmaning</h3>
            </div>
            <p className="text-sm opacity-70">
              {new Date().toLocaleDateString("sv-SE", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          {completed && (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "var(--correct)", color: "white" }}
            >
              ✅ Klar!
            </span>
          )}
        </div>

        {/* Word of the day preview */}
        <div
          className="rounded-lg p-4 mb-4"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
            Dagens ord
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold">{wordOfDay?.sv}</span>
              <span className="text-sm opacity-70 ml-2">
                — {wordOfDay?.en}
              </span>
            </div>
            <button
              onClick={() => {
                const utterance = new SpeechSynthesisUtterance(wordOfDay?.sv || "");
                utterance.lang = "sv-SE";
                utterance.rate = 0.85;
                speechSynthesis.speak(utterance);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer border-none"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              🔊
            </button>
          </div>
        </div>

        <Link
          href="/daily"
          className="block text-center py-3 rounded-lg font-semibold no-underline transition-all hover:opacity-90"
          style={{
            background: completed ? "rgba(255,255,255,0.15)" : "var(--yellow)",
            color: completed ? "white" : "var(--text)",
          }}
        >
          {completed ? "Gör om utmaningen" : "Starta utmaningen →"}
        </Link>
      </div>
    </div>
  );
}
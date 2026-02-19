"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getProgress } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";

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

interface VocabWord {
  sv: string;
  en: string;
  pron: string;
}

async function fetchVocabForCard(): Promise<VocabWord[]> {
  // Try vocabulary table first
  const { data, error } = await supabase
    .from("vocabulary")
    .select("swedish, english, pronunciation");

  if (!error && data?.length) {
    return data.map((row) => ({
      sv: row.swedish,
      en: row.english,
      pron: row.pronunciation ?? "",
    }));
  }

  // Fall back to story highlight_words
  const { data: paraData } = await supabase
    .from("story_paragraphs")
    .select("highlight_words");

  const vocab: VocabWord[] = [];
  for (const row of paraData ?? []) {
    const words = Array.isArray(row.highlight_words) ? row.highlight_words : [];
    for (const w of words) {
      vocab.push({ sv: w.word, en: w.translation, pron: "" });
    }
  }
  return vocab;
}

export default function DailyChallengeCard() {
  const [completed, setCompleted] = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [vocab, setVocab]         = useState<VocabWord[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setMounted(true);
    const progress = getProgress();
    if (progress.completedTopics[`daily-${today}`]) {
      setCompleted(true);
    }
    // Fetch vocab from Supabase — same source as the daily page
    fetchVocabForCard().then(setVocab);
  }, [today]);

  // Pick word of the day using same seed as DailyChallengePage
  const wordOfDay = useMemo((): VocabWord | null => {
    if (vocab.length === 0) return null;
    const rng = seededRandom(today);
    return seededShuffle(vocab, rng)[0];
  }, [vocab, today]);

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
        <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(255,255,255,0.1)" }}>
          <p className="text-xs uppercase tracking-wide opacity-60 mb-1">Dagens ord</p>
          {wordOfDay ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xl font-bold">{wordOfDay.sv}</span>
                <span className="text-sm opacity-70 ml-2">— {wordOfDay.en}</span>
              </div>
              <button
                onClick={() => speak(wordOfDay.sv)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer border-none"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                🔊
              </button>
            </div>
          ) : (
            // Skeleton while loading
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-6 w-24 rounded" style={{ background: "rgba(255,255,255,0.2)" }} />
              <div className="h-4 w-32 rounded" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
          )}
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
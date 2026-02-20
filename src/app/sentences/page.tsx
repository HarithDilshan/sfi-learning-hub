"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/LoadingSystem";
import { addXP, incrementStreak } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Level = "A" | "B" | "C" | "D";

interface SentenceChallenge {
  english: string;
  words: string[];      // correct order
  scrambled: string[];  // shuffled
  level: Level;
  hint?: string;
}

// ─── FETCH FROM SUPABASE ──────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function fetchChallenges(level: "all" | Level): Promise<SentenceChallenge[]> {
  let query = supabase
    .from("sentence_challenges")
    .select("swedish, english, level, grammar_hint");

  if (level !== "all") {
    query = query.eq("level", level);
  }

  const { data, error } = await query;

  if (error || !data?.length) {
    console.error("[SentenceBuilder] fetchChallenges:", error?.message);
    return [];
  }

  return data.map((row) => {
    const words = row.swedish.trim().split(/\s+/);
    return {
      english:  row.english,
      words,
      scrambled: shuffleArray(words),
      level:    row.level as Level,
      hint:     row.grammar_hint ?? undefined,
    };
  });
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function SentenceBuilderPage() {
  const [selectedLevel, setSelectedLevel] = useState<"all" | Level>("all");
  const [challenges, setChallenges]       = useState<SentenceChallenge[]>([]);
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [placedWords, setPlacedWords]     = useState<string[]>([]);
  const [answered, setAnswered]           = useState(false);
  const [isCorrect, setIsCorrect]         = useState(false);
  const [score, setScore]                 = useState(0);
  const [finished, setFinished]           = useState(false);
  const [started, setStarted]             = useState(false);
  const [loading, setLoading]             = useState(false);
  const [noData, setNoData]               = useState(false);

  const startGame = useCallback(async (level: "all" | Level) => {
    setLoading(true);
    setNoData(false);
    setSelectedLevel(level);

    const all = await fetchChallenges(level);

    if (all.length === 0) {
      setNoData(true);
      setLoading(false);
      setStarted(true);
      return;
    }

    const picked = shuffleArray(all).slice(0, 10);
    setChallenges(picked);
    setCurrentIdx(0);
    setPlacedWords([]);
    setAnswered(false);
    setIsCorrect(false);
    setScore(0);
    setFinished(false);
    setStarted(true);
    setLoading(false);
  }, []);

  // ─── Word interaction ───
  function handleWordClick(word: string) {
    if (answered) return;
    setPlacedWords((prev) => [...prev, word]);
  }

  function handleRemoveWord(idx: number) {
    if (answered) return;
    setPlacedWords((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCheck() {
    if (answered || placedWords.length === 0) return;
    setAnswered(true);
    const correct = placedWords.join(" ") === challenges[currentIdx].words.join(" ");
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
  }

  function handleClear() {
    if (answered) return;
    setPlacedWords([]);
  }

  function nextChallenge() {
    if (currentIdx + 1 >= challenges.length) {
      const pct = Math.round((score / challenges.length) * 100);
      addXP(score * 15);
      if (pct >= 80) incrementStreak();
      window.dispatchEvent(new Event("progress-update"));
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setPlacedWords([]);
    setAnswered(false);
    setIsCorrect(false);
  }

  const current = challenges[currentIdx];

  // Track which word bank indices have been used
  const usedIndices = new Set<number>();
  if (current) {
    for (const placedWord of placedWords) {
      for (let i = 0; i < current.scrambled.length; i++) {
        if (current.scrambled[i] === placedWord && !usedIndices.has(i)) {
          usedIndices.add(i);
          break;
        }
      }
    }
  }

  // ─── LEVEL SELECTOR ───
  if (!started) {
    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
            <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
            <span>›</span>
            <span>Meningsbyggare</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
              🧩 Meningsbyggare (Sentence Builder)
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              Bygg korrekta svenska meningar! Sätt orden i rätt ordning.
            </p>
          </div>

          <div className="grid gap-3">
            {(
              [
                { key: "all", label: "Alla nivåer",  desc: "Blandning av alla nivåer",              emoji: "🌈" },
                { key: "A",   label: "Kurs A",        desc: "Enkla meningar — hälsningar, familj",   emoji: "🟢" },
                { key: "B",   label: "Kurs B",        desc: "Vardagsmeningar — mat, väder, tid",      emoji: "🟡" },
                { key: "C",   label: "Kurs C",        desc: "Arbete, hälsa, bostad",                  emoji: "🟠" },
                { key: "D",   label: "Kurs D",        desc: "V2-regeln, åsikter, formella fraser",    emoji: "🔴" },
              ] as { key: "all" | Level; label: string; desc: string; emoji: string }[]
            ).map((l) => (
              <button key={l.key} onClick={() => startGame(l.key)}
                className="flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 text-left"
                style={{ background: "white", borderColor: "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}>
                <span className="text-2xl">{l.emoji}</span>
                <div>
                  <h3 className="font-semibold">{l.label}</h3>
                  <p className="text-sm" style={{ color: "var(--text-light)" }}>{l.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--forest-light)" }}>
            <span className="text-xl flex-shrink-0">📐</span>
            <p className="text-sm leading-relaxed">
              <strong>V2-regeln:</strong> I svenska påståendesatser ska verbet alltid stå på andra plats.
              &quot;Idag <strong>går</strong> jag till skolan.&quot; Denna övning hjälper dig öva på detta!
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingState type="data" message="Laddar meningar..." />
        </div>
        <Footer />
      </>
    );
  }

  // ─── NO DATA ───
  if (noData) {
    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 text-center">
          <p className="text-4xl mb-4">📭</p>
          <h3 className="text-xl font-semibold mb-2">Inga meningar hittades</h3>
          <p className="mb-6" style={{ color: "var(--text-light)" }}>
            Lägg till dialoger i Supabase för nivå {selectedLevel === "all" ? "alla nivåer" : `Kurs ${selectedLevel}`}.
          </p>
          <button onClick={() => setStarted(false)}
            className="px-6 py-3 rounded-lg font-semibold cursor-pointer border-2"
            style={{ borderColor: "var(--warm-dark)", color: "var(--text)", background: "white", fontFamily: "'Outfit', sans-serif" }}>
            ← Tillbaka
          </button>
        </div>
        <Footer />
      </>
    );
  }

  // ─── RESULTS ───
  if (finished) {
    const total = challenges.length;
    const pct   = Math.round((score / total) * 100);
    const bgColor   = pct >= 80 ? "var(--correct-bg)"  : pct >= 50 ? "var(--yellow-light)" : "var(--wrong-bg)";
    const textColor = pct >= 80 ? "var(--correct)"     : pct >= 50 ? "var(--yellow-dark)"  : "var(--wrong)";
    const msg       = pct >= 80 ? "Fantastiskt! (Fantastic!)" : pct >= 50 ? "Bra jobbat! (Good job!)" : "Fortsätt öva! (Keep practicing!)";

    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20">
          <div className="text-center py-10 animate-slide-up">
            <div className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mx-auto mb-6 text-4xl font-bold"
              style={{ background: bgColor, color: textColor }}>
              {pct}%
              <span className="text-xs font-medium">{score}/{total}</span>
            </div>
            <h3 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{msg}</h3>
            <p className="mb-8" style={{ color: "var(--text-light)" }}>Du fick {score * 15} XP!</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => startGame(selectedLevel)}
                className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                Spela igen
              </button>
              <button onClick={() => setStarted(false)}
                className="px-7 py-3 rounded-lg font-semibold cursor-pointer border-2"
                style={{ borderColor: "var(--warm-dark)", color: "var(--text)", fontFamily: "'Outfit', sans-serif", background: "white" }}>
                Byt nivå
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── GAME SCREEN ───
  const progress = ((currentIdx + 1) / challenges.length) * 100;

  return (
    <>
      <Header />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "var(--text-light)" }}>
            Mening {currentIdx + 1} av {challenges.length}
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--blue)" }}>{score} rätt</span>
        </div>
        <div className="w-full h-2 rounded overflow-hidden mb-6" style={{ background: "var(--warm-dark)" }}>
          <div className="h-full rounded transition-all duration-500"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--blue), var(--forest))" }} />
        </div>

        {/* English sentence */}
        <div className="rounded-xl p-6 mb-6" style={{ background: "white", boxShadow: "var(--shadow)" }}>
          <p className="text-sm mb-2" style={{ color: "var(--text-light)" }}>Översätt till svenska:</p>
          <div className="text-xl font-semibold" style={{ color: "var(--blue-dark)" }}>
            &ldquo;{current.english}&rdquo;
          </div>
          {current.hint && (
            <p className="text-sm mt-2" style={{ color: "var(--forest)" }}>💡 {current.hint}</p>
          )}
        </div>

        {/* Sentence drop zone */}
        <div
          className="rounded-xl p-5 mb-4 min-h-[70px] border-2 border-dashed flex flex-wrap gap-2"
          style={{
            borderColor: answered ? (isCorrect ? "var(--correct)" : "var(--wrong)") : "var(--warm-dark)",
            background:  answered ? (isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)") : "white",
          }}
        >
          {placedWords.length === 0 && (
            <span className="text-sm italic" style={{ color: "var(--text-light)" }}>
              Klicka på orden nedan för att bygga meningen...
            </span>
          )}
          {placedWords.map((w, i) => (
            <button key={`placed-${i}`} onClick={() => handleRemoveWord(i)} disabled={answered}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-2 transition-all"
              style={{ background: "var(--blue-light)", borderColor: "var(--blue)", color: "var(--blue-dark)", fontFamily: "'Outfit', sans-serif" }}>
              {w}
            </button>
          ))}
        </div>

        {/* Word bank */}
        <div className="rounded-xl p-5 min-h-[60px] flex flex-wrap gap-2 mb-6" style={{ background: "var(--warm)" }}>
          {current.scrambled.map((w, i) => {
            const isUsed = usedIndices.has(i);
            return (
              <button key={`bank-${i}`} onClick={() => !isUsed && handleWordClick(w)}
                disabled={isUsed || answered}
                className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all"
                style={{
                  background:   isUsed ? "transparent" : "white",
                  borderColor:  isUsed ? "transparent" : "var(--warm-dark)",
                  color:        isUsed ? "transparent" : "var(--text)",
                  fontFamily:  "'Outfit', sans-serif",
                  opacity:      isUsed ? 0.2 : 1,
                  cursor:       isUsed ? "default" : "pointer",
                }}>
                {w}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        {!answered && (
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleCheck} disabled={placedWords.length === 0}
              className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none disabled:opacity-40"
              style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
              Kolla svar ✓
            </button>
            <button onClick={handleClear} disabled={placedWords.length === 0}
              className="px-6 py-3 rounded-lg font-semibold cursor-pointer border-2 disabled:opacity-40"
              style={{ borderColor: "var(--warm-dark)", color: "var(--text)", fontFamily: "'Outfit', sans-serif", background: "white" }}>
              Rensa
            </button>
          </div>
        )}

        {/* Feedback */}
        {answered && (
          <div className="mt-4">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-4"
              style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
              {isCorrect ? "✅ Rätt! Perfekt ordning!" : `❌ Rätt ordning: ${current.words.join(" ")}`}
            </div>
            <button onClick={() => speak(current.words.join(" "))}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer border-none mb-4"
              style={{ background: "var(--blue-light)", color: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
              🔊 Lyssna på rätt mening
            </button>
            <br />
            <button onClick={nextChallenge}
              className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none mt-2"
              style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
              {currentIdx + 1 >= challenges.length ? "Visa resultat" : "Nästa mening →"}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { addXP, incrementStreak } from "@/lib/progress";

interface SentenceChallenge {
  english: string;
  words: string[]; // Correct order
  scrambled: string[]; // Shuffled
  level: "A" | "B" | "C" | "D";
  hint?: string;
}

const sentenceChallenges: SentenceChallenge[] = [
  // Level A — Simple
  {
    english: "My name is Anna.",
    words: ["Jag", "heter", "Anna"],
    scrambled: ["Anna", "heter", "Jag"],
    level: "A",
  },
  {
    english: "I am fine, thank you.",
    words: ["Jag", "mår", "bra", "tack"],
    scrambled: ["tack", "mår", "Jag", "bra"],
    level: "A",
  },
  {
    english: "Good morning!",
    words: ["God", "morgon"],
    scrambled: ["morgon", "God"],
    level: "A",
  },
  {
    english: "I have a brother.",
    words: ["Jag", "har", "en", "bror"],
    scrambled: ["bror", "Jag", "en", "har"],
    level: "A",
  },
  {
    english: "The house is red.",
    words: ["Huset", "är", "rött"],
    scrambled: ["rött", "är", "Huset"],
    level: "A",
  },
  {
    english: "She has two children.",
    words: ["Hon", "har", "två", "barn"],
    scrambled: ["barn", "Hon", "två", "har"],
    level: "A",
  },
  {
    english: "Nice to meet you!",
    words: ["Trevligt", "att", "träffas"],
    scrambled: ["att", "Trevligt", "träffas"],
    level: "A",
  },
  {
    english: "I don't understand.",
    words: ["Jag", "förstår", "inte"],
    scrambled: ["inte", "Jag", "förstår"],
    level: "A",
  },

  // Level B — Daily life
  {
    english: "I would like coffee, please.",
    words: ["Jag", "vill", "ha", "kaffe", "tack"],
    scrambled: ["kaffe", "ha", "tack", "Jag", "vill"],
    level: "B",
  },
  {
    english: "It is cold today.",
    words: ["Det", "är", "kallt", "idag"],
    scrambled: ["idag", "Det", "kallt", "är"],
    level: "B",
  },
  {
    english: "It is raining outside.",
    words: ["Det", "regnar", "ute"],
    scrambled: ["ute", "Det", "regnar"],
    level: "B",
  },
  {
    english: "What time is it?",
    words: ["Vad", "är", "klockan"],
    scrambled: ["klockan", "Vad", "är"],
    level: "B",
  },
  {
    english: "I want to go to the store.",
    words: ["Jag", "vill", "gå", "till", "affären"],
    scrambled: ["affären", "gå", "Jag", "till", "vill"],
    level: "B",
  },
  {
    english: "The bus is late.",
    words: ["Bussen", "är", "försenad"],
    scrambled: ["försenad", "Bussen", "är"],
    level: "B",
  },
  {
    english: "I eat bread and cheese.",
    words: ["Jag", "äter", "bröd", "och", "ost"],
    scrambled: ["ost", "äter", "Jag", "och", "bröd"],
    level: "B",
  },
  {
    english: "Where is the bus stop?",
    words: ["Var", "ligger", "busshållplatsen"],
    scrambled: ["busshållplatsen", "Var", "ligger"],
    level: "B",
  },

  // Level C — Work, health, housing
  {
    english: "I have worked as a teacher.",
    words: ["Jag", "har", "jobbat", "som", "lärare"],
    scrambled: ["som", "jobbat", "Jag", "lärare", "har"],
    level: "C",
    hint: "Perfect tense: har + supinum",
  },
  {
    english: "I have a headache.",
    words: ["Jag", "har", "ont", "i", "huvudet"],
    scrambled: ["huvudet", "ont", "Jag", "i", "har"],
    level: "C",
  },
  {
    english: "The apartment is furnished.",
    words: ["Lägenheten", "är", "möblerad"],
    scrambled: ["möblerad", "Lägenheten", "är"],
    level: "C",
  },
  {
    english: "I need to book an appointment.",
    words: ["Jag", "behöver", "boka", "en", "tid"],
    scrambled: ["tid", "boka", "Jag", "en", "behöver"],
    level: "C",
  },
  {
    english: "Can you work full-time?",
    words: ["Kan", "du", "jobba", "heltid"],
    scrambled: ["heltid", "du", "Kan", "jobba"],
    level: "C",
  },
  {
    english: "I am looking for an apartment.",
    words: ["Jag", "letar", "efter", "en", "lägenhet"],
    scrambled: ["lägenhet", "Jag", "efter", "en", "letar"],
    level: "C",
  },

  // Level D — V2 rule, complex sentences
  {
    english: "Today I am going to school.",
    words: ["Idag", "går", "jag", "till", "skolan"],
    scrambled: ["jag", "Idag", "skolan", "går", "till"],
    level: "D",
    hint: "V2 rule: verb stays in second position",
  },
  {
    english: "In my opinion, it is important.",
    words: ["Enligt", "min", "åsikt", "är", "det", "viktigt"],
    scrambled: ["det", "min", "viktigt", "Enligt", "är", "åsikt"],
    level: "D",
    hint: "V2 rule: 'Enligt min åsikt' counts as position 1",
  },
  {
    english: "Yesterday I studied Swedish.",
    words: ["Igår", "studerade", "jag", "svenska"],
    scrambled: ["svenska", "jag", "Igår", "studerade"],
    level: "D",
    hint: "V2 rule: time adverb first → verb second → subject third",
  },
  {
    english: "I think that it is a good idea.",
    words: ["Jag", "tycker", "att", "det", "är", "en", "bra", "idé"],
    scrambled: ["en", "att", "Jag", "bra", "tycker", "det", "idé", "är"],
    level: "D",
  },
  {
    english: "Furthermore, I have experience.",
    words: ["Dessutom", "har", "jag", "erfarenhet"],
    scrambled: ["jag", "erfarenhet", "Dessutom", "har"],
    level: "D",
    hint: "V2 rule with linking word",
  },
  {
    english: "I agree with you.",
    words: ["Jag", "håller", "med", "dig"],
    scrambled: ["med", "Jag", "dig", "håller"],
    level: "D",
  },
];

export default function SentenceBuilderPage() {
  const [selectedLevel, setSelectedLevel] = useState<
    "all" | "A" | "B" | "C" | "D"
  >("all");
  const [challenges, setChallenges] = useState<SentenceChallenge[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  const startGame = useCallback(
    (level: "all" | "A" | "B" | "C" | "D") => {
      setSelectedLevel(level);
      const filtered =
        level === "all"
          ? [...sentenceChallenges]
          : sentenceChallenges.filter((c) => c.level === level);

      const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 10);
      setChallenges(shuffled);
      setCurrentIdx(0);
      setPlacedWords([]);
      setAnswered(false);
      setIsCorrect(false);
      setScore(0);
      setFinished(false);
      setStarted(true);
    },
    []
  );

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
    const current = challenges[currentIdx];
    const correct = placedWords.join(" ") === current.words.join(" ");
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

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  }

  const current = challenges[currentIdx];

  // ─── LEVEL SELECTOR ───
  if (!started) {
    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
          <div
            className="flex items-center gap-2 text-sm mb-6"
            style={{ color: "var(--text-light)" }}
          >
            <Link
              href="/"
              className="no-underline"
              style={{ color: "var(--blue)" }}
            >
              Hem
            </Link>
            <span>›</span>
            <span>Meningsbyggare</span>
          </div>

          <div className="mb-8">
            <h2
              className="text-3xl mb-2"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              🧩 Meningsbyggare (Sentence Builder)
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              Bygg korrekta svenska meningar! Sätt orden i rätt ordning.
            </p>
          </div>

          <div className="grid gap-3">
            {(
              [
                {
                  key: "all",
                  label: "Alla nivåer",
                  desc: "Blandning av alla nivåer",
                  emoji: "🌈",
                },
                {
                  key: "A",
                  label: "Kurs A",
                  desc: "Enkla meningar — hälsningar, familj",
                  emoji: "🟢",
                },
                {
                  key: "B",
                  label: "Kurs B",
                  desc: "Vardagsmeningar — mat, väder, tid",
                  emoji: "🟡",
                },
                {
                  key: "C",
                  label: "Kurs C",
                  desc: "Arbete, hälsa, bostad",
                  emoji: "🟠",
                },
                {
                  key: "D",
                  label: "Kurs D",
                  desc: "V2-regeln, åsikter, formella fraser",
                  emoji: "🔴",
                },
              ] as {
                key: "all" | "A" | "B" | "C" | "D";
                label: string;
                desc: string;
                emoji: string;
              }[]
            ).map((l) => (
              <button
                key={l.key}
                onClick={() => startGame(l.key)}
                className="flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 text-left"
                style={{
                  background: "white",
                  borderColor: "var(--warm-dark)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <span className="text-2xl">{l.emoji}</span>
                <div>
                  <h3 className="font-semibold">{l.label}</h3>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-light)" }}
                  >
                    {l.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div
            className="rounded-xl p-5 flex gap-3 items-start mt-6"
            style={{ background: "var(--forest-light)" }}
          >
            <span className="text-xl flex-shrink-0">📐</span>
            <p className="text-sm leading-relaxed">
              <strong>V2-regeln:</strong> I svenska påståendesatser ska verbet
              alltid stå på andra plats. &quot;Idag <strong>går</strong> jag
              till skolan.&quot; Denna övning hjälper dig öva på detta!
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── RESULTS ───
  if (finished) {
    const total = challenges.length;
    const pct = Math.round((score / total) * 100);
    const bgColor =
      pct >= 80
        ? "var(--correct-bg)"
        : pct >= 50
        ? "var(--yellow-light)"
        : "var(--wrong-bg)";
    const textColor =
      pct >= 80
        ? "var(--correct)"
        : pct >= 50
        ? "var(--yellow-dark)"
        : "var(--wrong)";
    const msg =
      pct >= 80
        ? "Fantastiskt! (Fantastic!)"
        : pct >= 50
        ? "Bra jobbat! (Good job!)"
        : "Fortsätt öva! (Keep practicing!)";

    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20">
          <div className="text-center py-10 animate-slide-up">
            <div
              className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mx-auto mb-6 text-4xl font-bold"
              style={{ background: bgColor, color: textColor }}
            >
              {pct}%
              <span className="text-xs font-medium">
                {score}/{total}
              </span>
            </div>
            <h3
              className="text-2xl mb-2"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {msg}
            </h3>
            <p className="mb-8" style={{ color: "var(--text-light)" }}>
              Du fick {score * 15} XP!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => startGame(selectedLevel)}
                className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{
                  background: "var(--blue)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Spela igen
              </button>
              <button
                onClick={() => setStarted(false)}
                className="px-7 py-3 rounded-lg font-semibold cursor-pointer border-2"
                style={{
                  borderColor: "var(--warm-dark)",
                  color: "var(--text)",
                  fontFamily: "'Outfit', sans-serif",
                  background: "white",
                }}
              >
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
  const availableWords = current.scrambled.filter(
    (w) => {
      // Count how many times this word appears in scrambled
      const totalCount = current.scrambled.filter((sw) => sw === w).length;
      // Count how many times it's been placed
      const placedCount = placedWords.filter((pw) => pw === w).length;
      return placedCount < totalCount;
    }
  );

  // Deduplicate for display (show each remaining word once with correct count)
  const displayWords: { word: string; available: boolean }[] =
    current.scrambled.map((w, i) => {
      const placedCount = placedWords.filter((pw) => pw === w).length;
      const priorCount = current.scrambled
        .slice(0, i)
        .filter((sw) => sw === w).length;
      return {
        word: w,
        available: priorCount < current.scrambled.filter((sw) => sw === w).length - placedCount
          ? true
          : priorCount < placedCount
          ? false
          : placedCount < current.scrambled.filter((sw) => sw === w).length,
      };
    });

  // Simpler approach: track used indices
  const usedIndices = new Set<number>();
  for (const placedWord of placedWords) {
    for (let i = 0; i < current.scrambled.length; i++) {
      if (current.scrambled[i] === placedWord && !usedIndices.has(i)) {
        usedIndices.add(i);
        break;
      }
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "var(--text-light)" }}>
            Mening {currentIdx + 1} av {challenges.length}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--blue)" }}
          >
            {score} rätt
          </span>
        </div>
        <div
          className="w-full h-2 rounded overflow-hidden mb-6"
          style={{ background: "var(--warm-dark)" }}
        >
          <div
            className="h-full rounded transition-all duration-500"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, var(--blue), var(--forest))",
            }}
          />
        </div>

        {/* English sentence */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ background: "white", boxShadow: "var(--shadow)" }}
        >
          <p
            className="text-sm mb-2"
            style={{ color: "var(--text-light)" }}
          >
            Översätt till svenska:
          </p>
          <div
            className="text-xl font-semibold"
            style={{ color: "var(--blue-dark)" }}
          >
            &ldquo;{current.english}&rdquo;
          </div>
          {current.hint && (
            <p
              className="text-sm mt-2"
              style={{ color: "var(--forest)" }}
            >
              💡 {current.hint}
            </p>
          )}
        </div>

        {/* Sentence area (drop zone) */}
        <div
          className="rounded-xl p-5 mb-4 min-h-[70px] border-2 border-dashed flex flex-wrap gap-2"
          style={{
            borderColor: answered
              ? isCorrect
                ? "var(--correct)"
                : "var(--wrong)"
              : "var(--warm-dark)",
            background: answered
              ? isCorrect
                ? "var(--correct-bg)"
                : "var(--wrong-bg)"
              : "white",
          }}
        >
          {placedWords.length === 0 && (
            <span
              className="text-sm italic"
              style={{ color: "var(--text-light)" }}
            >
              Klicka på orden nedan för att bygga meningen...
            </span>
          )}
          {placedWords.map((w, i) => (
            <button
              key={`placed-${i}`}
              onClick={() => handleRemoveWord(i)}
              className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-2 transition-all"
              style={{
                background: "var(--blue-light)",
                borderColor: "var(--blue)",
                color: "var(--blue-dark)",
                fontFamily: "'Outfit', sans-serif",
              }}
              disabled={answered}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Word bank */}
        <div
          className="rounded-xl p-5 min-h-[60px] flex flex-wrap gap-2 mb-6"
          style={{ background: "var(--warm)" }}
        >
          {current.scrambled.map((w, i) => {
            const isUsed = usedIndices.has(i);
            return (
              <button
                key={`bank-${i}`}
                onClick={() => !isUsed && handleWordClick(w)}
                disabled={isUsed || answered}
                className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer border-2 transition-all"
                style={{
                  background: isUsed ? "transparent" : "white",
                  borderColor: isUsed
                    ? "transparent"
                    : "var(--warm-dark)",
                  color: isUsed
                    ? "transparent"
                    : "var(--text)",
                  fontFamily: "'Outfit', sans-serif",
                  opacity: isUsed ? 0.2 : 1,
                  cursor: isUsed ? "default" : "pointer",
                }}
              >
                {w}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          {!answered && (
            <>
              <button
                onClick={handleCheck}
                disabled={placedWords.length === 0}
                className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none disabled:opacity-40"
                style={{
                  background: "var(--blue)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Kolla svar ✓
              </button>
              <button
                onClick={handleClear}
                disabled={placedWords.length === 0}
                className="px-6 py-3 rounded-lg font-semibold cursor-pointer border-2 disabled:opacity-40"
                style={{
                  borderColor: "var(--warm-dark)",
                  color: "var(--text)",
                  fontFamily: "'Outfit', sans-serif",
                  background: "white",
                }}
              >
                Rensa
              </button>
            </>
          )}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="mt-4">
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-4"
              style={{
                background: isCorrect
                  ? "var(--correct-bg)"
                  : "var(--wrong-bg)",
                color: isCorrect ? "var(--correct)" : "var(--wrong)",
              }}
            >
              {isCorrect
                ? "✅ Rätt! Perfekt ordning!"
                : `❌ Rätt ordning: ${current.words.join(" ")}`}
            </div>

            {/* Play correct sentence */}
            <button
              onClick={() => speak(current.words.join(" "))}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer border-none mb-4"
              style={{
                background: "var(--blue-light)",
                color: "var(--blue)",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              🔊 Lyssna på rätt mening
            </button>
            <br />

            <button
              onClick={nextChallenge}
              className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none mt-2"
              style={{
                background: "var(--blue)",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {currentIdx + 1 >= challenges.length
                ? "Visa resultat"
                : "Nästa mening →"}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
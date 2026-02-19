"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/LoadingSystem";
import { addXP, incrementStreak } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";
import { fetchAllStoryVocab } from "@/service/storyService";


type Difficulty    = "easy" | "medium" | "hard";
type ChallengeType = "word-pick" | "phrase-pick" | "type-word" | "type-phrase";

interface VocabWord {
  sv: string;
  en: string;
  pron: string;
}

interface Phrase {
  sv: string;
  en: string;
}

interface Challenge {
  type: ChallengeType;
  audioText: string;
  correctAnswer: string;
  options?: string[];
  hint?: string;
}

// ─── Supabase fetchers ────────────────────────────────────────────────────────

async function fetchVocab(): Promise<VocabWord[]> {
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
  // Fall back to story highlight words
  return fetchAllStoryVocab();
}

async function fetchPhrases(): Promise<Phrase[]> {
  // Pull from dialogues table — every dialogue line is a natural phrase
  const { data, error } = await supabase
    .from("dialogues")
    .select("swedish, english");

  if (error || !data?.length) {
    console.error("[ListeningPage] fetchPhrases:", error?.message);
    return [];
  }

  // Filter to lines that feel like standalone phrases (3–12 words)
  return data
    .map((row) => ({ sv: row.swedish, en: row.english }))
    .filter((p) => {
      const wordCount = p.sv.split(" ").length;
      return wordCount >= 3 && wordCount <= 12;
    });
}

// ─── Challenge generator ──────────────────────────────────────────────────────

function generateChallengeSet(
  diff: Difficulty,
  vocab: VocabWord[],
  phrases: Phrase[]
): Challenge[] {
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  const result: Challenge[] = [];

  if (diff === "easy") {
    const selected = shuffle(vocab).slice(0, 10);
    for (const word of selected) {
      const distractors = shuffle(vocab.filter((w) => w.en !== word.en)).slice(0, 3);
      const options = shuffle([word.en, ...distractors.map((d) => d.en)]);
      result.push({ type: "word-pick", audioText: word.sv, correctAnswer: word.en, options, hint: word.pron ? `(${word.pron})` : undefined });
    }
  } else if (diff === "medium") {
    const selectedPhrases = shuffle(phrases).slice(0, 5);
    for (const phrase of selectedPhrases) {
      const distractors = shuffle(phrases.filter((p) => p.en !== phrase.en)).slice(0, 3);
      const options = shuffle([phrase.en, ...distractors.map((d) => d.en)]);
      result.push({ type: "phrase-pick", audioText: phrase.sv, correctAnswer: phrase.en, options });
    }
    const selectedWords = shuffle(vocab).slice(0, 5);
    for (const word of selectedWords) {
      result.push({ type: "type-word", audioText: word.sv, correctAnswer: word.sv, hint: word.en });
    }
  } else {
    const selectedWords = shuffle(vocab).slice(0, 5);
    for (const word of selectedWords) {
      result.push({ type: "type-word", audioText: word.sv, correctAnswer: word.sv });
    }
    const selectedPhrases = shuffle(phrases).slice(0, 5);
    for (const phrase of selectedPhrases) {
      result.push({ type: "type-phrase", audioText: phrase.sv, correctAnswer: phrase.sv, hint: phrase.en });
    }
  }

  return shuffle(result);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListeningPage() {
  const [vocab, setVocab]           = useState<VocabWord[]>([]);
  const [phrases, setPhrases]       = useState<Phrase[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [difficulty, setDifficulty]         = useState<Difficulty | null>(null);
  const [challenges, setChallenges]         = useState<Challenge[]>([]);
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [answered, setAnswered]             = useState(false);
  const [isCorrect, setIsCorrect]           = useState(false);
  const [typedAnswer, setTypedAnswer]       = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore]                   = useState(0);
  const [finished, setFinished]             = useState(false);
  const [playCount, setPlayCount]           = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch from Supabase once on mount ───
  useEffect(() => {
    Promise.all([fetchVocab(), fetchPhrases()]).then(([v, p]) => {
      setVocab(v);
      setPhrases(p);
      setLoadingData(false);
    });
  }, []);

  const startDifficulty = useCallback(
    (diff: Difficulty) => {
      const generated = generateChallengeSet(diff, vocab, phrases);
      setChallenges(generated);
      setDifficulty(diff);
      setCurrentIdx(0);
      setScore(0);
      setFinished(false);
      setAnswered(false);
      setTypedAnswer("");
      setSelectedOption(null);
      setPlayCount(0);
    },
    [vocab, phrases]
  );

  function handlePickAnswer(idx: number) {
    if (answered) return;
    setAnswered(true);
    setSelectedOption(idx);
    const correct = challenges[currentIdx].options![idx] === challenges[currentIdx].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
  }

  function handleTypeAnswer() {
    if (answered || !typedAnswer.trim()) return;
    setAnswered(true);
    const correct = typedAnswer.trim().toLowerCase() === challenges[currentIdx].correctAnswer.toLowerCase();
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);
  }

  function nextChallenge() {
    if (currentIdx + 1 >= challenges.length) {
      addXP(score * 10);
      if (Math.round((score / challenges.length) * 100) >= 80) incrementStreak();
      window.dispatchEvent(new Event("progress-update"));
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setAnswered(false);
    setTypedAnswer("");
    setSelectedOption(null);
    setPlayCount(0);
    setIsCorrect(false);
  }

  // Auto-play when challenge changes
  useEffect(() => {
    if (challenges.length > 0 && !finished && difficulty) {
      const timer = setTimeout(() => speak(challenges[currentIdx].audioText), 400);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, challenges.length, finished, difficulty]);

  // Auto-focus input for type challenges
  useEffect(() => {
    if (challenges[currentIdx]?.type.startsWith("type") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIdx, challenges]);

  const current = challenges[currentIdx];

  // ─── LOADING ───
  if (loadingData) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="data" message="Laddar övningar..." />
        </div>
        <Footer />
      </>
    );
  }

  // ─── DIFFICULTY SELECTOR ───
  if (!difficulty) {
    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
            <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
            <span>›</span>
            <span>Hörförståelse</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
              👂 Hörförståelse (Listening)
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              Träna örat! Lyssna på svenska och visa att du förstår.
            </p>
          </div>

          <div className="grid gap-4">
            {(
              [
                { key: "easy",   emoji: "🟢", title: "Lätt (Easy)",   desc: "Hör ett ord, välj rätt engelska betydelse. 10 frågor." },
                { key: "medium", emoji: "🟡", title: "Medel (Medium)", desc: "Hör fraser och skriv ord. Mix av uppgifter. 10 frågor." },
                { key: "hard",   emoji: "🔴", title: "Svår (Hard)",    desc: "Skriv exakt vad du hör — ord och hela fraser. 10 frågor." },
              ] as { key: Difficulty; emoji: string; title: string; desc: string }[]
            ).map((d) => (
              <button
                key={d.key}
                onClick={() => startDifficulty(d.key)}
                disabled={vocab.length < 10 || phrases.length < 5}
                className="text-left p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "white", borderColor: "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{d.emoji}</span>
                  <h3 className="text-lg font-semibold">{d.title}</h3>
                </div>
                <p className="text-sm" style={{ color: "var(--text-light)" }}>{d.desc}</p>
              </button>
            ))}
          </div>

          {(vocab.length < 10 || phrases.length < 5) && (
            <div className="rounded-xl p-4 mt-4 text-sm" style={{ background: "var(--wrong-bg)", color: "var(--wrong)" }}>
              ⚠️ Inte tillräckligt med data i databasen för att starta. Lägg till fler ord och fraser i Supabase.
            </div>
          )}

          <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--yellow-light)" }}>
            <span className="text-xl flex-shrink-0">💡</span>
            <p className="text-sm leading-relaxed">
              <strong>Tips:</strong> Använd hörlurar för bästa resultat. Du kan spela upp ljudet flera gånger genom att klicka på högtalar-knappen.
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
    const bgColor   = pct >= 80 ? "var(--correct-bg)"  : pct >= 50 ? "var(--yellow-light)" : "var(--wrong-bg)";
    const textColor = pct >= 80 ? "var(--correct)"     : pct >= 50 ? "var(--yellow-dark)"  : "var(--wrong)";
    const msg       = pct >= 80 ? "Utmärkt hörsel! (Excellent hearing!)" : pct >= 50 ? "Bra jobbat! (Good job!)" : "Fortsätt lyssna! (Keep listening!)";

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
            <p className="mb-8" style={{ color: "var(--text-light)" }}>
              Du fick {score * 10} XP! Svårighetsgrad: {difficulty === "easy" ? "Lätt" : difficulty === "medium" ? "Medel" : "Svår"}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => startDifficulty(difficulty)}
                className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                Spela igen
              </button>
              <button onClick={() => setDifficulty(null)}
                className="px-7 py-3 rounded-lg font-semibold cursor-pointer border-2"
                style={{ borderColor: "var(--warm-dark)", color: "var(--text)", fontFamily: "'Outfit', sans-serif", background: "white" }}>
                Byt svårighetsgrad
              </button>
              <Link href="/" className="px-7 py-3 rounded-lg font-semibold no-underline cursor-pointer border-2"
                style={{ borderColor: "var(--warm-dark)", color: "var(--text)" }}>
                Hem
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── CHALLENGE SCREEN ───
  const progressPct = ((currentIdx + 1) / challenges.length) * 100;
  const isPick = current.type === "word-pick" || current.type === "phrase-pick";

  return (
    <>
      <Header />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <Link href="#" onClick={(e) => { e.preventDefault(); setDifficulty(null); }} className="no-underline" style={{ color: "var(--blue)" }}>
            Hörförståelse
          </Link>
          <span>›</span>
          <span>{difficulty === "easy" ? "Lätt" : difficulty === "medium" ? "Medel" : "Svår"}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "var(--text-light)" }}>Fråga {currentIdx + 1} av {challenges.length}</span>
          <span className="text-sm font-semibold" style={{ color: "var(--blue)" }}>{score} rätt</span>
        </div>
        <div className="w-full h-2 rounded overflow-hidden mb-8" style={{ background: "var(--warm-dark)" }}>
          <div className="h-full rounded transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--blue), var(--forest))" }} />
        </div>

        {/* Audio Button */}
        <div className="text-center mb-6">
          <button
            onClick={() => { speak(current.audioText); setPlayCount((c) => c + 1); }}
            className="w-24 h-24 rounded-full text-4xl cursor-pointer border-none transition-transform hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--blue), var(--blue-dark))", color: "white", boxShadow: "0 8px 32px rgba(0,91,153,0.3)" }}
          >
            🔊
          </button>
          <p className="text-sm mt-3" style={{ color: "var(--text-light)" }}>
            {isPick ? "Lyssna och välj rätt svar" : "Lyssna och skriv vad du hör"}
            {playCount > 0 && <span className="ml-2 opacity-60">(spelat {playCount}x)</span>}
          </p>
          <button
            onClick={() => speak(current.audioText, { rate: 0.5 })}
            className="mt-2 px-4 py-1.5 rounded-full text-xs cursor-pointer border-none"
            style={{ background: "var(--warm)", color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}
          >
            🐢 Spela långsamt
          </button>
        </div>

        {/* Challenge Content */}
        <div className="rounded-xl p-6 sm:p-8" style={{ background: "white", boxShadow: "var(--shadow)" }}>

          {/* PICK mode */}
          {isPick && current.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {current.options.map((opt, i) => {
                let style: React.CSSProperties = { borderColor: "var(--warm-dark)", background: "var(--warm)", fontFamily: "'Outfit', sans-serif" };
                if (answered) {
                  if (opt === current.correctAnswer)  style = { ...style, borderColor: "var(--correct)", background: "var(--correct-bg)" };
                  else if (i === selectedOption)       style = { ...style, borderColor: "var(--wrong)",   background: "var(--wrong-bg)"   };
                }
                return (
                  <button key={i} onClick={() => handlePickAnswer(i)} disabled={answered}
                    className="px-4 py-3.5 rounded-lg border-2 text-left text-sm transition-all cursor-pointer disabled:cursor-default hover:border-[var(--blue)] hover:bg-[var(--blue-light)]"
                    style={style}>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* TYPE mode */}
          {!isPick && (
            <>
              {current.hint && (
                <p className="text-sm mb-3" style={{ color: "var(--text-light)" }}>Ledtråd: {current.hint}</p>
              )}
              <div className="flex gap-2.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTypeAnswer()}
                  disabled={answered}
                  placeholder="Skriv vad du hör..."
                  className="flex-1 px-4 py-3.5 border-2 rounded-lg text-base transition-colors focus:outline-none disabled:opacity-70"
                  style={{ borderColor: answered ? (isCorrect ? "var(--correct)" : "var(--wrong)") : "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
                />
                {!answered && (
                  <button onClick={handleTypeAnswer} className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                    style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                    Kolla
                  </button>
                )}
              </div>
            </>
          )}

          {/* Feedback */}
          {answered && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-4"
                style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
                {isCorrect ? "✅ Rätt!" : `❌ Svaret var: "${current.correctAnswer}"`}
              </div>

              {!isCorrect && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4" style={{ background: "var(--warm)" }}>
                  <button onClick={() => speak(current.audioText, { rate: 0.6 })} className="text-lg cursor-pointer border-none bg-transparent">🔊</button>
                  <div>
                    <span className="font-semibold">{current.audioText}</span>
                    <span className="ml-2 text-sm" style={{ color: "var(--text-light)" }}>= {current.correctAnswer}</span>
                  </div>
                </div>
              )}

              <button onClick={nextChallenge} className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                {currentIdx + 1 >= challenges.length ? "Visa resultat" : "Nästa →"}
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
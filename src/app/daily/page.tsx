"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/ui/LoadingSystem";
import { addXP, incrementStreak, getProgress, markTopicComplete } from "@/lib/progress";
import { notify } from "@/lib/notify";
import { getUser } from "@/lib/auth";
import { loadTopicScores } from "@/lib/sync";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";
import { fetchDailySentences, fetchAllStoryVocab, DailySentence } from "@/service/storyService";


// ─── TYPES ────────────────────────────────────────────────────────────────────
interface VocabWord {
  sv: string;
  en: string;
  pron: string;
}

interface DailyExercise {
  type: "mc" | "fill" | "listen-pick";
  question: string;
  options?: string[];
  correctAnswer: string;
}

interface DailyChallenge {
  date: string;
  wordOfDay: VocabWord;
  exercises: DailyExercise[];
  sentenceBuild: { english: string; words: string[]; scrambled: string[] };
}

// ─── SEEDED RNG ───────────────────────────────────────────────────────────────
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

// ─── FETCH VOCAB FROM SUPABASE ────────────────────────────────────────────────
async function fetchVocabFromDB(): Promise<VocabWord[]> {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("swedish, english, pronunciation");

  if (error || !data?.length) {
    // Fall back to story vocab if vocabulary table is empty
    return fetchAllStoryVocab();
  }

  return data.map((row) => ({
    sv: row.swedish,
    en: row.english,
    pron: row.pronunciation ?? "",
  }));
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function DailyChallengePage() {
  const [vocab, setVocab]                       = useState<VocabWord[]>([]);
  const [sentences, setSentences]               = useState<DailySentence[]>([]);
  const [loadingData, setLoadingData]           = useState(true);
  const [currentStep, setCurrentStep]           = useState(0);
  const [answers, setAnswers]                   = useState<boolean[]>([]);
  const [answered, setAnswered]                 = useState(false);
  const [selectedOption, setSelectedOption]     = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer]           = useState("");
  const [isCorrect, setIsCorrect]               = useState(false);
  const [sentencePlaced, setSentencePlaced]     = useState<string[]>([]);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  // ─── Fetch vocab + sentences from Supabase ───
  useEffect(() => {
    Promise.all([fetchVocabFromDB(), fetchDailySentences()]).then(([v, s]) => {
      setVocab(v);
      setSentences(s);
      setLoadingData(false);
    });
  }, []);

  // ─── Check if already completed today ───
  useEffect(() => {
    async function check() {
      const progress = getProgress();
      if (progress.completedTopics[`daily-${today}`]) {
        setAlreadyCompleted(true);
        setCheckingCompletion(false);
        return;
      }
      const user = await getUser();
      if (user) {
        const scores = await loadTopicScores(user.id);
        if (scores.some((s) => s.topic_id === `daily-${today}`)) {
          setAlreadyCompleted(true);
        }
      }
      setCheckingCompletion(false);
    }
    check();
  }, [today]);

  // ─── Build today's challenge deterministically from DB data ───
  const challenge = useMemo((): DailyChallenge | null => {
    if (vocab.length < 10 || sentences.length === 0) return null;

    const rng = seededRandom(today);
    const shuffledVocab = seededShuffle(vocab, rng);
    const wordOfDay = shuffledVocab[0];
    const exerciseWords = shuffledVocab.slice(1, 20);

    // Exercise 1: MC — what does this word mean?
    const w1 = exerciseWords[0];
    const distractors1 = seededShuffle(exerciseWords.filter((w) => w.en !== w1.en).slice(0, 3), rng);
    const opts1 = seededShuffle([w1.en, ...distractors1.map((d) => d.en)], rng);

    // Exercise 2: Fill — translate to Swedish
    const w2 = exerciseWords[1];

    // Exercise 3: Listen and pick
    const w3 = exerciseWords[2];
    const distractors3 = seededShuffle(exerciseWords.filter((w) => w.sv !== w3.sv).slice(0, 3), rng);
    const opts3 = seededShuffle([w3.en, ...distractors3.map((d) => d.en)], rng);

    // Exercise 4: Fill — translate to Swedish
    const w4 = exerciseWords[3];

    // Exercise 5: Sentence build — pick from dialogues table via fetchDailySentences
    const sentenceIdx = Math.floor(rng() * sentences.length);
    const sentence = sentences[sentenceIdx];

    return {
      date: today,
      wordOfDay,
      exercises: [
        { type: "mc",          question: `Vad betyder "${w1.sv}" på engelska?`, options: opts1, correctAnswer: w1.en },
        { type: "fill",        question: `Skriv det svenska ordet för "${w2.en}":`, correctAnswer: w2.sv },
        { type: "listen-pick", question: w3.sv, options: opts3, correctAnswer: w3.en },
        { type: "fill",        question: `Översätt till svenska: "${w4.en}"`, correctAnswer: w4.sv },
      ],
      sentenceBuild: {
        english: sentence.english,
        words: sentence.words,
        scrambled: seededShuffle(sentence.words, rng),
      },
    };
  }, [vocab, sentences, today]);

  // ─── HANDLERS ───
  function handleMC(idx: number) {
    if (answered || !challenge) return;
    setAnswered(true);
    setSelectedOption(idx);
    const ex = challenge.exercises[currentStep - 1];
    const correct = ex.options![idx] === ex.correctAnswer;
    setIsCorrect(correct);
    setAnswers((a) => [...a, correct]);
  }

  function handleFill() {
    if (answered || !typedAnswer.trim() || !challenge) return;
    setAnswered(true);
    const ex = challenge.exercises[currentStep - 1];
    const correct = typedAnswer.trim().toLowerCase() === ex.correctAnswer.toLowerCase();
    setIsCorrect(correct);
    setAnswers((a) => [...a, correct]);
  }

  function handleSentenceCheck() {
    if (answered || !challenge) return;
    setAnswered(true);
    const correct = sentencePlaced.join(" ") === challenge.sentenceBuild.words.join(" ");
    setIsCorrect(correct);
    setAnswers((a) => [...a, correct]);
  }

  function nextStep() {
    setCurrentStep((s) => s + 1);
    setAnswered(false);
    setSelectedOption(null);
    setTypedAnswer("");
    setIsCorrect(false);
    setSentencePlaced([]);
  }

  function finishChallenge() {
    const correctCount = answers.filter(Boolean).length;
    const total = answers.length;
    addXP(correctCount * 20);
    if (correctCount === total) incrementStreak();

    markTopicComplete(`daily-${today}`, correctCount, total);

    const pct = Math.round((correctCount / total) * 100);
    if (pct === 100) {
      notify.perfect("Dagens Utmaning");
    } else if (pct >= 80) {
      notify.goodScore(pct, "/daily");
      const progress = getProgress();
      notify.streak(progress.streak);
    }

    window.dispatchEvent(new Event("progress-update"));
    setCurrentStep(6);
  }

  // ─── LOADING ───
  if (loadingData || !challenge) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="data" message="Förbereder dagens utmaning..." />
        </div>
        <Footer />
      </>
    );
  }

  // ─── INTRO ───
  if (currentStep === 0) {
    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
          <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
            <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
            <span>›</span>
            <span>Dagens utmaning</span>
          </div>

          <div className="rounded-2xl p-8 sm:p-10 text-center text-white mb-8"
            style={{ background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Dagens Utmaning</h2>
            <p className="opacity-80 mb-2">
              {new Date().toLocaleDateString("sv-SE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-sm opacity-60">5 frågor · Alla användare får samma utmaning idag</p>
          </div>

          {/* Word of the day */}
          <div className="rounded-xl p-6 mb-6" style={{ background: "var(--yellow-light)", border: "2px solid var(--yellow)" }}>
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--yellow-dark)" }}>
              Dagens ord (Word of the Day)
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold mb-1" style={{ color: "var(--blue-dark)" }}>{challenge.wordOfDay.sv}</div>
                <div className="text-sm" style={{ color: "var(--text-light)" }}>
                  {challenge.wordOfDay.en}
                  {challenge.wordOfDay.pron && (
                    <> · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>/{challenge.wordOfDay.pron}/</span></>
                  )}
                </div>
              </div>
              <button
                onClick={() => speak(challenge.wordOfDay.sv)}
                className="w-12 h-12 rounded-full text-xl cursor-pointer border-none flex items-center justify-center"
                style={{ background: "var(--blue-light)", color: "var(--blue)" }}
              >
                🔊
              </button>
            </div>
          </div>

          {checkingCompletion ? (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-light)" }}>Kontrollerar...</div>
          ) : alreadyCompleted ? (
            <div className="rounded-xl p-6 text-center" style={{ background: "var(--correct-bg)", border: "2px solid var(--correct)" }}>
              <p className="text-lg font-semibold mb-2" style={{ color: "var(--correct)" }}>✅ Du har redan klarat dagens utmaning!</p>
              <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>Kom tillbaka imorgon för en ny utmaning.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setAlreadyCompleted(false); setCurrentStep(1); }}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-2"
                  style={{ borderColor: "var(--correct)", color: "var(--correct)", background: "white", fontFamily: "'Outfit', sans-serif" }}
                >
                  Gör den igen ändå
                </button>
                <Link href="/" className="px-6 py-2.5 rounded-lg text-sm font-semibold no-underline" style={{ background: "var(--blue)", color: "white" }}>
                  Tillbaka hem
                </Link>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCurrentStep(1)}
              className="w-full py-4 rounded-xl text-lg font-semibold text-white cursor-pointer border-none"
              style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif", boxShadow: "0 4px 16px rgba(0,91,153,0.3)" }}
            >
              Starta utmaningen →
            </button>
          )}
        </div>
        <Footer />
      </>
    );
  }

  // ─── RESULTS ───
  if (currentStep === 6) {
    const correctCount = answers.filter(Boolean).length;
    const total = answers.length;
    const pct = Math.round((correctCount / total) * 100);
    const bgColor    = pct >= 80 ? "var(--correct-bg)"  : pct >= 50 ? "var(--yellow-light)" : "var(--wrong-bg)";
    const textColor  = pct >= 80 ? "var(--correct)"     : pct >= 50 ? "var(--yellow-dark)"  : "var(--wrong)";
    const msg        = pct === 100 ? "Perfekt! Alla rätt!" : pct >= 80 ? "Utmärkt!" : pct >= 50 ? "Bra jobbat!" : "Försök igen imorgon!";

    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20">
          <div className="text-center py-10 animate-slide-up">
            <div className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mx-auto mb-6 text-4xl font-bold"
              style={{ background: bgColor, color: textColor }}>
              {pct}%
              <span className="text-xs font-medium">{correctCount}/{total}</span>
            </div>
            <h3 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{msg}</h3>
            <p className="mb-2" style={{ color: "var(--text-light)" }}>Du fick {correctCount * 20} XP från dagens utmaning!</p>
            {pct === 100 && <p className="text-sm mb-4" style={{ color: "var(--correct)" }}>🔥 Streak +1!</p>}
            <p className="text-sm mb-8" style={{ color: "var(--text-light)" }}>Kom tillbaka imorgon för en ny utmaning!</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/" className="px-7 py-3 rounded-lg font-semibold no-underline" style={{ background: "var(--blue)", color: "white" }}>Hem</Link>
              <Link href="/review" className="px-7 py-3 rounded-lg font-semibold no-underline border-2" style={{ borderColor: "var(--warm-dark)", color: "var(--text)" }}>Öva mer →</Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ─── EXERCISE STEPS ───
  const progressPct = (currentStep / 5) * 100;
  const isSentenceStep = currentStep === 5;
  const currentExercise = isSentenceStep ? null : challenge.exercises[currentStep - 1];

  const usedIndices = new Set<number>();
  if (isSentenceStep) {
    for (const word of sentencePlaced) {
      for (let i = 0; i < challenge.sentenceBuild.scrambled.length; i++) {
        if (challenge.sentenceBuild.scrambled[i] === word && !usedIndices.has(i)) {
          usedIndices.add(i);
          break;
        }
      }
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        {/* Progress bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: "var(--text-light)" }}>Fråga {currentStep} av 5</span>
          <span className="text-sm" style={{ color: "var(--text-light)" }}>📅 Dagens utmaning</span>
        </div>
        <div className="w-full h-2 rounded overflow-hidden mb-8" style={{ background: "var(--warm-dark)" }}>
          <div className="h-full rounded transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--yellow), var(--blue))" }} />
        </div>

        <div className="rounded-xl p-6 sm:p-8" style={{ background: "white", boxShadow: "var(--shadow)" }}>
          {/* MC / Fill */}
          {!isSentenceStep && currentExercise && (
            <>
              {currentExercise.type === "listen-pick" && (
                <div className="text-center mb-6">
                  <button
                    onClick={() => speak(currentExercise.question)}
                    className="w-20 h-20 rounded-full text-3xl cursor-pointer border-none"
                    style={{ background: "linear-gradient(135deg, var(--blue), var(--blue-dark))", color: "white", boxShadow: "0 8px 24px rgba(0,91,153,0.3)" }}
                  >🔊</button>
                  <p className="text-sm mt-2" style={{ color: "var(--text-light)" }}>Lyssna och välj rätt svar</p>
                </div>
              )}

              {currentExercise.type !== "listen-pick" && (
                <div className="text-lg font-medium mb-6" style={{ color: "var(--text)" }}>{currentExercise.question}</div>
              )}

              {(currentExercise.type === "mc" || currentExercise.type === "listen-pick") && currentExercise.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentExercise.options.map((opt, i) => {
                    let style: React.CSSProperties = { borderColor: "var(--warm-dark)", background: "var(--warm)", fontFamily: "'Outfit', sans-serif" };
                    if (answered) {
                      if (opt === currentExercise.correctAnswer) style = { ...style, borderColor: "var(--correct)", background: "var(--correct-bg)" };
                      else if (i === selectedOption)             style = { ...style, borderColor: "var(--wrong)", background: "var(--wrong-bg)" };
                    }
                    return (
                      <button key={i} onClick={() => handleMC(i)} disabled={answered}
                        className="px-4 py-3.5 rounded-lg border-2 text-left text-sm transition-all cursor-pointer disabled:cursor-default"
                        style={style}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentExercise.type === "fill" && (
                <div className="flex gap-2.5">
                  <input
                    type="text" value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFill()}
                    disabled={answered}
                    placeholder="Skriv ditt svar..."
                    className="flex-1 px-4 py-3.5 border-2 rounded-lg text-base transition-colors focus:outline-none disabled:opacity-70"
                    style={{ borderColor: answered ? (isCorrect ? "var(--correct)" : "var(--wrong)") : "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
                    autoFocus
                  />
                  {!answered && (
                    <button onClick={handleFill} className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                      Kolla
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Sentence Build */}
          {isSentenceStep && (
            <>
              <p className="text-sm mb-2" style={{ color: "var(--text-light)" }}>Bygg meningen:</p>
              <div className="text-lg font-semibold mb-6" style={{ color: "var(--blue-dark)" }}>
                &ldquo;{challenge.sentenceBuild.english}&rdquo;
              </div>
              <div className="rounded-lg p-4 mb-3 min-h-[56px] border-2 border-dashed flex flex-wrap gap-2"
                style={{ borderColor: answered ? (isCorrect ? "var(--correct)" : "var(--wrong)") : "var(--warm-dark)", background: answered ? (isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)") : "var(--warm)" }}>
                {sentencePlaced.length === 0 && <span className="text-sm italic" style={{ color: "var(--text-light)" }}>Klicka på orden...</span>}
                {sentencePlaced.map((w, i) => (
                  <button key={`p-${i}`} onClick={() => { if (!answered) setSentencePlaced((p) => p.filter((_, j) => j !== i)); }}
                    disabled={answered} className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-2"
                    style={{ background: "var(--blue-light)", borderColor: "var(--blue)", color: "var(--blue-dark)", fontFamily: "'Outfit', sans-serif" }}>
                    {w}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {challenge.sentenceBuild.scrambled.map((w, i) => {
                  const isUsed = usedIndices.has(i);
                  return (
                    <button key={`b-${i}`} onClick={() => !isUsed && !answered && setSentencePlaced((p) => [...p, w])}
                      disabled={isUsed || answered} className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer border-2"
                      style={{ background: isUsed ? "transparent" : "white", borderColor: isUsed ? "transparent" : "var(--warm-dark)", color: isUsed ? "transparent" : "var(--text)", opacity: isUsed ? 0.2 : 1, fontFamily: "'Outfit', sans-serif" }}>
                      {w}
                    </button>
                  );
                })}
              </div>
              {!answered && (
                <div className="flex gap-2">
                  <button onClick={handleSentenceCheck} disabled={sentencePlaced.length === 0}
                    className="px-6 py-2.5 rounded-lg font-semibold text-white cursor-pointer border-none disabled:opacity-40"
                    style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                    Kolla ✓
                  </button>
                  <button onClick={() => setSentencePlaced([])} className="px-4 py-2.5 rounded-lg text-sm cursor-pointer border-2"
                    style={{ borderColor: "var(--warm-dark)", background: "white", fontFamily: "'Outfit', sans-serif" }}>
                    Rensa
                  </button>
                </div>
              )}
            </>
          )}

          {/* Feedback */}
          {answered && (
            <div className="mt-4">
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-4"
                style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
                {isCorrect ? "✅ Rätt!" : `❌ Rätt svar: ${isSentenceStep ? challenge.sentenceBuild.words.join(" ") : currentExercise!.correctAnswer}`}
              </div>
              <button onClick={currentStep >= 5 ? finishChallenge : nextStep}
                className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                {currentStep >= 5 ? "Visa resultat" : "Nästa →"}
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
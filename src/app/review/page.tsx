"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/auth";
import { getWordsForReview, syncWordAttempt } from "@/lib/sync";
import { getProgress, recordWordAttempt, addXP } from "@/lib/progress";
import { notify } from "@/lib/notify";
import { LoadingState } from "@/components/ui/LoadingSystem";
import { speak, stopSpeaking } from "@/lib/tts";
import { supabase } from "@/lib/supabase";
import { fetchAllStoryVocab } from "@/service/storyService";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ReviewCard {
  sv: string;
  en: string;
  pron?: string;
  source: "cloud" | "local";
}

type ReviewMode = "flashcard" | "type" | "listen";

// ─── SUPABASE VOCAB FETCH ─────────────────────────────────────────────────────

async function fetchVocabFromDB(): Promise<ReviewCard[]> {
  const { data, error } = await supabase
    .from("vocabulary")
    .select("swedish, english, pronunciation");

  if (!error && data?.length) {
    return data.map((row) => ({
      sv: row.swedish,
      en: row.english,
      pron: row.pronunciation ?? undefined,
      source: "local" as const,
    }));
  }

  // Fall back to story highlight words
  const storyVocab = await fetchAllStoryVocab();
  return storyVocab.map((w) => ({
    sv: w.sv,
    en: w.en,
    pron: w.pron || undefined,
    source: "local" as const,
  }));
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const [cards, setCards]               = useState<ReviewCard[]>([]);
  const [allVocab, setAllVocab]         = useState<ReviewCard[]>([]); // full DB pool for distractors
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [loading, setLoading]           = useState(true);
  const [userId, setUserId]             = useState<string | null>(null);
  const [mode, setMode]                 = useState<ReviewMode>("flashcard");
  const [flipped, setFlipped]           = useState(false);
  const [typedAnswer, setTypedAnswer]   = useState("");
  const [answered, setAnswered]         = useState(false);
  const [isCorrect, setIsCorrect]       = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, wrong: 0 });
  const [streak, setStreak]             = useState(0);
  const [finished, setFinished]         = useState(false);
  const [skipped, setSkipped]           = useState(0);

  const loadCards = useCallback(async () => {
    setLoading(true);

    // Always fetch full vocab pool first (for distractors + fallback)
    const dbVocab = await fetchVocabFromDB();
    setAllVocab(dbVocab);

    const user = await getUser();
    let reviewCards: ReviewCard[] = [];

    if (user) {
      setUserId(user.id);
      const cloudWords = await getWordsForReview(user.id, 20);
      if (cloudWords.length > 0) {
        reviewCards = cloudWords.map((w) => ({
          sv: w.word_sv,
          en: w.word_en,
          source: "cloud" as const,
        }));
      }
    }

    // Fill up to 20 from DB vocab, prioritising words with more wrong answers
    if (reviewCards.length < 20) {
      const progress = getProgress();
      const existing = new Set(reviewCards.map((c) => c.sv));

      const priority: ReviewCard[] = [];
      const rest: ReviewCard[]     = [];

      for (const word of dbVocab) {
        if (existing.has(word.sv)) continue;
        const history = progress.wordHistory?.[word.sv];
        if (history && history.wrong > history.correct) {
          priority.push(word);
        } else {
          rest.push(word);
        }
      }

      const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
      const needed = 20 - reviewCards.length;
      reviewCards = [...reviewCards, ...shuffle([...priority, ...rest]).slice(0, needed)];
    }

    reviewCards.sort(() => Math.random() - 0.5);
    setCards(reviewCards);
    setCurrentIdx(0);
    setFlipped(false);
    setTypedAnswer("");
    setAnswered(false);
    setSessionScore({ correct: 0, wrong: 0 });
    setStreak(0);
    setSkipped(0);
    setFinished(false);
    setLoading(false);
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // Auto-play in listen mode — currentCard is derived inline to avoid stale closure
  useEffect(() => {
    if (mode === "listen" && cards.length > 0 && !loading && !finished) {
      const timer = setTimeout(() => speak(cards[currentIdx]?.sv), 300);
      return () => clearTimeout(timer);
    }
  }, [currentIdx, mode, loading, finished, cards]);

  const currentCard = cards[currentIdx];

  function handleAnswer(correct: boolean) {
    if (answered) return;
    setAnswered(true);
    setIsCorrect(correct);

    setSessionScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong:   s.wrong   + (correct ? 0 : 1),
    }));

    setStreak((s) => correct ? s + 1 : 0);

    recordWordAttempt(currentCard.sv, correct);
    if (correct) addXP(5);
    if (userId) syncWordAttempt(userId, currentCard.sv, currentCard.en, correct);

    window.dispatchEvent(new Event("progress-update"));
  }

  function handleTypeSubmit() {
    if (answered || !typedAnswer.trim()) return;
    const correct = typedAnswer.trim().toLowerCase() === currentCard.sv.toLowerCase();
    setIsCorrect(correct);
    handleAnswer(correct);
  }

  function skipCard() {
    if (answered) return;
    setSkipped((s) => s + 1);
    goNext();
  }

  function goNext() {
    if (currentIdx + 1 >= cards.length) {
      const total = sessionScore.correct + sessionScore.wrong;
      const pct = total > 0 ? Math.round((sessionScore.correct / total) * 100) : 0;
      if (pct >= 80) notify.success("Repetition klar!", `Du fick ${pct}% rätt på repetitionsövningen.`, "/review");
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setFlipped(false);
    setTypedAnswer("");
    setAnswered(false);
    setIsCorrect(false);
    stopSpeaking();
  }

  // Build 4 distractor options for listen mode from the full DB vocab pool
  function getListenOptions(correct: ReviewCard): string[] {
    const pool = allVocab.length >= 4 ? allVocab : cards; // prefer full pool
    const distractors = pool
      .filter((c) => c.en !== correct.en)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((c) => c.en);
    return [correct.en, ...distractors].sort(() => Math.random() - 0.5);
  }

  // ─── RESULTS ───
  if (finished) {
    const total = sessionScore.correct + sessionScore.wrong;
    const pct   = total > 0 ? Math.round((sessionScore.correct / total) * 100) : 0;
    const bgColor   = pct >= 80 ? "var(--correct-bg)"  : pct >= 50 ? "var(--yellow-light)" : "var(--wrong-bg)";
    const textColor = pct >= 80 ? "var(--correct)"     : pct >= 50 ? "var(--yellow-dark)"  : "var(--wrong)";
    const msg       = pct >= 80 ? "Utmärkt! (Excellent!)" : pct >= 50 ? "Bra jobbat! (Good job!)" : "Fortsätt öva! (Keep practicing!)";

    return (
      <>
        <Header />
        <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20">
          <div className="text-center py-10 animate-slide-up">
            <div className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mx-auto mb-6 text-4xl font-bold"
              style={{ background: bgColor, color: textColor }}>
              {pct}%
              <span className="text-xs font-medium">{sessionScore.correct}/{total}</span>
            </div>
            <h3 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{msg}</h3>
            <p className="mb-1" style={{ color: "var(--text-light)" }}>Du fick {sessionScore.correct * 5} XP!</p>
            <p className="text-sm mb-2" style={{ color: "var(--text-light)" }}>
              {sessionScore.correct} rätt · {sessionScore.wrong} fel · {skipped} hoppade över
            </p>
            {streak > 2 && (
              <p className="text-sm mb-4" style={{ color: "var(--yellow-dark)" }}>
                🔥 Bästa streak: {streak} i rad
              </p>
            )}
            <div className="flex gap-3 justify-center flex-wrap mt-6">
              <button onClick={loadCards} className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                Öva igen
              </button>
              <Link href="/" className="px-7 py-3 rounded-lg font-semibold no-underline cursor-pointer border-2"
                style={{ borderColor: "var(--warm-dark)", color: "var(--text)" }}>
                Tillbaka hem
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-[700px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Repetition</span>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>🔁 Daglig Repetition</h2>
          <p style={{ color: "var(--text-light)" }}>Öva på ord du behöver repetera. Svårare ord visas oftare.</p>
        </div>

        {loading ? (
          <LoadingState type="data" message="Laddar ord att repetera..." />
        ) : cards.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-lg font-semibold mb-2">Inga ord att repetera!</p>
            <p style={{ color: "var(--text-light)" }}>Gör övningar i lektionerna så samlas ord här automatiskt.</p>
            <Link href="/" className="inline-block mt-4 px-6 py-3 rounded-lg font-semibold no-underline"
              style={{ background: "var(--blue)", color: "white" }}>
              Börja lära dig →
            </Link>
          </div>
        ) : (
          <>
            {/* Mode selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {([
                { key: "flashcard", label: "🃏 Flashkort" },
                { key: "type",      label: "⌨️ Skriv"    },
                { key: "listen",    label: "👂 Lyssna"   },
              ] as { key: ReviewMode; label: string }[]).map((m) => (
                <button key={m.key}
                  onClick={() => { setMode(m.key); setFlipped(false); setTypedAnswer(""); setAnswered(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-2 transition-all"
                  style={{
                    background:   mode === m.key ? "var(--blue-light)" : "white",
                    borderColor:  mode === m.key ? "var(--blue)"       : "var(--warm-dark)",
                    color:        mode === m.key ? "var(--blue)"       : "var(--text)",
                    fontFamily: "'Outfit', sans-serif",
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Progress + streak */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--text-light)" }}>
                Ord {currentIdx + 1} av {cards.length}
              </span>
              <div className="flex gap-3 text-sm items-center">
                {streak >= 2 && (
                  <span className="font-semibold" style={{ color: "var(--yellow-dark)" }}>🔥 {streak} streak</span>
                )}
                <span style={{ color: "var(--correct)" }}>✅ {sessionScore.correct}</span>
                <span style={{ color: "var(--wrong)"   }}>❌ {sessionScore.wrong}</span>
              </div>
            </div>
            <div className="w-full h-2 rounded overflow-hidden mb-6" style={{ background: "var(--warm-dark)" }}>
              <div className="h-full rounded transition-all duration-500"
                style={{ width: `${((currentIdx + 1) / cards.length) * 100}%`, background: "linear-gradient(90deg, var(--blue), var(--forest))" }} />
            </div>

            {/* Cloud badge */}
            {currentCard?.source === "cloud" && (
              <div className="flex items-center gap-1.5 text-xs mb-3 font-medium" style={{ color: "var(--blue)" }}>
                ☁️ Synkad från ditt konto — baserat på dina tidigare svar
              </div>
            )}

            {/* ═══ FLASHCARD MODE ═══ */}
            {mode === "flashcard" && (
              <div>
                <div style={{ perspective: "1000px" }} className="mx-auto max-w-[420px] mb-6">
                  <div
                    onClick={() => !answered && setFlipped(!flipped)}
                    className="cursor-pointer relative w-full transition-transform duration-500"
                    style={{ height: "260px", transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0)" }}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-8"
                      style={{ backfaceVisibility: "hidden", background: "linear-gradient(135deg, var(--blue), var(--blue-dark))", color: "white", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                      <div className="text-3xl mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>{currentCard.en}</div>
                      <div className="text-sm opacity-60">Klicka för att vända</div>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-8 border-2"
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "white", borderColor: "var(--yellow)", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: "var(--blue-dark)" }}>{currentCard.sv}</div>
                      {currentCard.pron && (
                        <div className="text-sm mb-3" style={{ color: "var(--text-light)", fontFamily: "'JetBrains Mono', monospace" }}>/{currentCard.pron}/</div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); speak(currentCard.sv); }}
                        className="px-3 py-1.5 rounded-full text-sm cursor-pointer border-none"
                        style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                        🔊 Lyssna
                      </button>
                    </div>
                  </div>
                </div>

                {flipped && !answered && (
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => handleAnswer(false)}
                      className="px-8 py-3 rounded-lg font-semibold cursor-pointer border-2"
                      style={{ background: "var(--wrong-bg)", borderColor: "var(--wrong)", color: "var(--wrong)", fontFamily: "'Outfit', sans-serif" }}>
                      ❌ Visste inte
                    </button>
                    <button onClick={() => handleAnswer(true)}
                      className="px-8 py-3 rounded-lg font-semibold cursor-pointer border-2"
                      style={{ background: "var(--correct-bg)", borderColor: "var(--correct)", color: "var(--correct)", fontFamily: "'Outfit', sans-serif" }}>
                      ✅ Visste det!
                    </button>
                  </div>
                )}

                {!answered && !flipped && (
                  <div className="text-center mt-4">
                    <button onClick={skipCard} className="text-sm cursor-pointer border-none bg-transparent"
                      style={{ color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}>
                      Hoppa över →
                    </button>
                  </div>
                )}

                {answered && (
                  <div className="text-center mt-4">
                    <div className="inline-block px-4 py-2 rounded-lg text-sm font-medium mb-4"
                      style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
                      {isCorrect ? `✅ Bra! +5 XP${streak >= 2 ? ` 🔥 ${streak} i rad!` : ""}` : "❌ Det här ordet kommer tillbaka snart"}
                    </div>
                    <br />
                    <button onClick={goNext} className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                      Nästa ord →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TYPE MODE ═══ */}
            {mode === "type" && (
              <div className="rounded-xl p-8" style={{ background: "white", boxShadow: "var(--shadow)" }}>
                <p className="text-sm mb-2" style={{ color: "var(--text-light)" }}>Skriv det svenska ordet för:</p>
                <div className="text-2xl font-bold mb-6" style={{ color: "var(--blue-dark)" }}>{currentCard.en}</div>

                <div className="flex gap-2.5">
                  <input type="text" value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTypeSubmit()}
                    disabled={answered}
                    placeholder="Skriv på svenska..."
                    className="flex-1 px-4 py-3.5 border-2 rounded-lg text-base transition-colors focus:outline-none disabled:opacity-70"
                    style={{ borderColor: answered ? (isCorrect ? "var(--correct)" : "var(--wrong)") : "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
                    autoFocus
                  />
                  {!answered && (
                    <button onClick={handleTypeSubmit} className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                      Kolla
                    </button>
                  )}
                </div>

                {!answered && (
                  <button onClick={skipCard} className="mt-3 text-sm cursor-pointer border-none bg-transparent"
                    style={{ color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}>
                    Hoppa över →
                  </button>
                )}

                {answered && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-2"
                      style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
                      {isCorrect
                        ? `✅ Rätt! +5 XP${streak >= 2 ? ` 🔥 ${streak} i rad!` : ""}`
                        : `❌ Rätt svar: ${currentCard.sv}`}
                    </div>
                    {/* Pronunciation after answering */}
                    {currentCard.pron && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg mb-3 text-sm"
                        style={{ background: "var(--warm)", color: "var(--text-light)" }}>
                        <button onClick={() => speak(currentCard.sv)} className="cursor-pointer border-none bg-transparent text-base">🔊</button>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>/{currentCard.pron}/</span>
                      </div>
                    )}
                    <button onClick={goNext} className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                      Nästa ord →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ LISTEN MODE ═══ */}
            {mode === "listen" && (
              <div className="rounded-xl p-8 text-center" style={{ background: "white", boxShadow: "var(--shadow)" }}>
                <p className="text-sm mb-4" style={{ color: "var(--text-light)" }}>Lyssna och välj rätt översättning:</p>

                <button onClick={() => speak(currentCard.sv)}
                  className="w-20 h-20 rounded-full text-3xl cursor-pointer border-none mb-2 transition-transform hover:scale-110"
                  style={{ background: "linear-gradient(135deg, var(--blue), var(--blue-dark))", color: "white", boxShadow: "0 8px 24px rgba(0,91,153,0.3)" }}>
                  🔊
                </button>
                <div className="mb-6">
                  <button onClick={() => speak(currentCard.sv, { rate: 0.5 })}
                    className="text-xs px-3 py-1 rounded-full cursor-pointer border-none"
                    style={{ background: "var(--warm)", color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}>
                    🐢 Långsamt
                  </button>
                </div>

                {!answered && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                    {getListenOptions(currentCard).map((opt, i) => (
                      <button key={i}
                        onClick={() => { const correct = opt === currentCard.en; setIsCorrect(correct); handleAnswer(correct); }}
                        className="px-4 py-3.5 rounded-lg border-2 text-left text-sm transition-all cursor-pointer hover:border-[var(--blue)] hover:bg-[var(--blue-light)]"
                        style={{ borderColor: "var(--warm-dark)", background: "var(--warm)", fontFamily: "'Outfit', sans-serif" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {!answered && (
                  <button onClick={skipCard} className="text-sm cursor-pointer border-none bg-transparent"
                    style={{ color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}>
                    Hoppa över →
                  </button>
                )}

                {answered && (
                  <div className="mt-4">
                    <div className="px-4 py-3 rounded-lg text-sm font-medium mb-2"
                      style={{ background: isCorrect ? "var(--correct-bg)" : "var(--wrong-bg)", color: isCorrect ? "var(--correct)" : "var(--wrong)" }}>
                      {isCorrect
                        ? `✅ Rätt! +5 XP${streak >= 2 ? ` 🔥 ${streak} i rad!` : ""}`
                        : `❌ Det var: "${currentCard.en}" (${currentCard.sv})`}
                    </div>
                    {/* Pronunciation after answering */}
                    {currentCard.pron && (
                      <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg mb-3 text-sm"
                        style={{ background: "var(--warm)", color: "var(--text-light)" }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>/{currentCard.pron}/</span>
                      </div>
                    )}
                    <button onClick={goNext} className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none mt-2"
                      style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}>
                      Nästa ord →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/auth";
import { getWordsForReview, syncWordAttempt } from "@/lib/sync";
import { getProgress, recordWordAttempt, addXP } from "@/lib/progress";
import { courseData } from "@/data";
import { VocabWord } from "@/data/types";

interface ReviewCard {
  sv: string;
  en: string;
  pron?: string;
  source: "cloud" | "local";
}

type ReviewMode = "flashcard" | "type" | "listen";

export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const user = await getUser();
    let reviewCards: ReviewCard[] = [];

    if (user) {
      setUserId(user.id);
      // Try loading from spaced repetition system
      const cloudWords = await getWordsForReview(user.id, 20);
      if (cloudWords.length > 0) {
        reviewCards = cloudWords.map((w) => ({
          sv: w.word_sv,
          en: w.word_en,
          source: "cloud" as const,
        }));
      }
    }

    // Fallback: pick words from practiced topics or random vocab
    if (reviewCards.length < 10) {
      const progress = getProgress();
      const allVocab: ReviewCard[] = [];

      // Gather vocab from all courses
      for (const levelKey of Object.keys(courseData)) {
        const level = courseData[levelKey as keyof typeof courseData];
        if (level?.topics) {
          for (const topic of level.topics) {
            for (const word of topic.vocab) {
              allVocab.push({
                sv: word.sv,
                en: word.en,
                pron: word.pron,
                source: "local",
              });
            }
          }
        }
      }

      // Prioritize words from completed topics, then add random ones
      const completedIds = Object.keys(progress.completedTopics);
      const priorityVocab: ReviewCard[] = [];
      const otherVocab: ReviewCard[] = [];

      for (const word of allVocab) {
        // Check if already in cloud cards
        if (reviewCards.some((c) => c.sv === word.sv)) continue;
        
        // Check word history - prioritize words with more wrong answers
        const history = progress.wordHistory[word.sv];
        if (history && history.wrong > history.correct) {
          priorityVocab.push(word);
        } else {
          otherVocab.push(word);
        }
      }

      // Shuffle
      const shuffle = <T,>(arr: T[]) => arr.sort(() => Math.random() - 0.5);
      shuffle(priorityVocab);
      shuffle(otherVocab);

      const needed = 20 - reviewCards.length;
      const extra = [...priorityVocab, ...otherVocab].slice(0, needed);
      reviewCards = [...reviewCards, ...extra];
    }

    // Shuffle final set
    reviewCards.sort(() => Math.random() - 0.5);
    setCards(reviewCards);
    setCurrentIdx(0);
    setFlipped(false);
    setTypedAnswer("");
    setAnswered(false);
    setSessionScore({ correct: 0, wrong: 0 });
    setFinished(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const currentCard = cards[currentIdx];

  function handleAnswer(correct: boolean) {
    if (answered) return;
    setAnswered(true);
    setIsCorrect(correct);

    setSessionScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));

    // Record locally
    recordWordAttempt(currentCard.sv, correct);
    if (correct) addXP(5);

    // Sync to cloud
    if (userId) {
      syncWordAttempt(userId, currentCard.sv, currentCard.en, correct);
    }

    window.dispatchEvent(new Event("progress-update"));
  }

  function handleTypeSubmit() {
    if (answered || !typedAnswer.trim()) return;
    const correct =
      typedAnswer.trim().toLowerCase() === currentCard.sv.toLowerCase();
    setIsCorrect(correct);
    handleAnswer(correct);
  }

  function nextCard() {
    if (currentIdx + 1 >= cards.length) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setFlipped(false);
    setTypedAnswer("");
    setAnswered(false);
    setIsCorrect(false);
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  }

  // ─── RESULTS SCREEN ───
  if (finished) {
    const total = sessionScore.correct + sessionScore.wrong;
    const pct = total > 0 ? Math.round((sessionScore.correct / total) * 100) : 0;
    const cls = pct >= 80 ? "great" : pct >= 50 ? "ok" : "needs-work";
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
        ? "Utmärkt! (Excellent!)"
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
                {sessionScore.correct}/{total}
              </span>
            </div>
            <h3
              className="text-2xl mb-2"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {msg}
            </h3>
            <p className="mb-2" style={{ color: "var(--text-light)" }}>
              Du fick {sessionScore.correct * 5} XP från denna repetition!
            </p>
            <p className="text-sm mb-8" style={{ color: "var(--text-light)" }}>
              {sessionScore.correct} rätt · {sessionScore.wrong} fel av {total}{" "}
              ord
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={loadCards}
                className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer"
                style={{ background: "var(--blue)" }}
              >
                Öva igen
              </button>
              <Link
                href="/"
                className="px-7 py-3 rounded-lg font-semibold no-underline cursor-pointer border-2"
                style={{
                  borderColor: "var(--warm-dark)",
                  color: "var(--text)",
                }}
              >
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
          <span>Repetition</span>
        </div>

        <div className="mb-6">
          <h2
            className="text-3xl mb-2"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            🔁 Daglig Repetition
          </h2>
          <p style={{ color: "var(--text-light)" }}>
            Öva på ord du behöver repetera. Svårare ord visas oftare.
          </p>
        </div>

        {loading ? (
          <div
            className="text-center py-16"
            style={{ color: "var(--text-light)" }}
          >
            Laddar ord att repetera...
          </div>
        ) : cards.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{
              background: "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-lg font-semibold mb-2">Inga ord att repetera!</p>
            <p style={{ color: "var(--text-light)" }}>
              Gör övningar i lektionerna så samlas ord här automatiskt.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-3 rounded-lg font-semibold no-underline"
              style={{ background: "var(--blue)", color: "white" }}
            >
              Börja lära dig →
            </Link>
          </div>
        ) : (
          <>
            {/* Mode selector */}
            <div className="flex gap-2 mb-6">
              {(
                [
                  { key: "flashcard", label: "🃏 Flashkort", icon: "" },
                  { key: "type", label: "⌨️ Skriv", icon: "" },
                  { key: "listen", label: "👂 Lyssna", icon: "" },
                ] as { key: ReviewMode; label: string; icon: string }[]
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    setFlipped(false);
                    setTypedAnswer("");
                    setAnswered(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-2 transition-all"
                  style={{
                    background:
                      mode === m.key ? "var(--blue-light)" : "white",
                    borderColor:
                      mode === m.key ? "var(--blue)" : "var(--warm-dark)",
                    color:
                      mode === m.key ? "var(--blue)" : "var(--text)",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: "var(--text-light)" }}>
                Ord {currentIdx + 1} av {cards.length}
              </span>
              <div className="flex gap-3 text-sm">
                <span style={{ color: "var(--correct)" }}>
                  ✅ {sessionScore.correct}
                </span>
                <span style={{ color: "var(--wrong)" }}>
                  ❌ {sessionScore.wrong}
                </span>
              </div>
            </div>
            <div
              className="w-full h-2 rounded overflow-hidden mb-6"
              style={{ background: "var(--warm-dark)" }}
            >
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${((currentIdx + 1) / cards.length) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--blue), var(--forest))",
                }}
              />
            </div>

            {/* ═══ FLASHCARD MODE ═══ */}
            {mode === "flashcard" && (
              <div>
                <div
                  style={{ perspective: "1000px" }}
                  className="mx-auto max-w-[420px] mb-6"
                >
                  <div
                    onClick={() => !answered && setFlipped(!flipped)}
                    className="cursor-pointer relative w-full transition-transform duration-500"
                    style={{
                      height: "260px",
                      transformStyle: "preserve-3d",
                      transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
                    }}
                  >
                    {/* Front */}
                    <div
                      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-8"
                      style={{
                        backfaceVisibility: "hidden",
                        background:
                          "linear-gradient(135deg, var(--blue), var(--blue-dark))",
                        color: "white",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                      }}
                    >
                      <div
                        className="text-3xl mb-3"
                        style={{
                          fontFamily: "'DM Serif Display', serif",
                        }}
                      >
                        {currentCard.en}
                      </div>
                      <div className="text-sm opacity-60">
                        Klicka för att vända
                      </div>
                    </div>
                    {/* Back */}
                    <div
                      className="absolute inset-0 rounded-xl flex flex-col items-center justify-center p-8 border-2"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                        background: "white",
                        borderColor: "var(--yellow)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div
                        className="text-3xl font-bold mb-2"
                        style={{ color: "var(--blue-dark)" }}
                      >
                        {currentCard.sv}
                      </div>
                      {currentCard.pron && (
                        <div
                          className="text-sm mb-3"
                          style={{
                            color: "var(--text-light)",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          /{currentCard.pron}/
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(currentCard.sv);
                        }}
                        className="px-3 py-1.5 rounded-full text-sm cursor-pointer border-none"
                        style={{
                          background: "var(--blue-light)",
                          color: "var(--blue)",
                        }}
                      >
                        🔊 Lyssna
                      </button>
                    </div>
                  </div>
                </div>

                {flipped && !answered && (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => handleAnswer(false)}
                      className="px-8 py-3 rounded-lg font-semibold cursor-pointer border-2"
                      style={{
                        background: "var(--wrong-bg)",
                        borderColor: "var(--wrong)",
                        color: "var(--wrong)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      ❌ Visste inte
                    </button>
                    <button
                      onClick={() => handleAnswer(true)}
                      className="px-8 py-3 rounded-lg font-semibold cursor-pointer border-2"
                      style={{
                        background: "var(--correct-bg)",
                        borderColor: "var(--correct)",
                        color: "var(--correct)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      ✅ Visste det!
                    </button>
                  </div>
                )}

                {answered && (
                  <div className="text-center">
                    <div
                      className="inline-block px-4 py-2 rounded-lg text-sm font-medium mb-4"
                      style={{
                        background: isCorrect
                          ? "var(--correct-bg)"
                          : "var(--wrong-bg)",
                        color: isCorrect
                          ? "var(--correct)"
                          : "var(--wrong)",
                      }}
                    >
                      {isCorrect
                        ? "✅ Bra! +5 XP"
                        : "❌ Det här ordet kommer tillbaka snart"}
                    </div>
                    <br />
                    <button
                      onClick={nextCard}
                      className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{
                        background: "var(--blue)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      Nästa ord →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TYPE MODE ═══ */}
            {mode === "type" && (
              <div
                className="rounded-xl p-8"
                style={{ background: "white", boxShadow: "var(--shadow)" }}
              >
                <p
                  className="text-sm mb-2"
                  style={{ color: "var(--text-light)" }}
                >
                  Skriv det svenska ordet för:
                </p>
                <div
                  className="text-2xl font-bold mb-6"
                  style={{ color: "var(--blue-dark)" }}
                >
                  {currentCard.en}
                </div>

                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTypeSubmit()}
                    disabled={answered}
                    placeholder="Skriv på svenska..."
                    className="flex-1 px-4 py-3.5 border-2 rounded-lg text-base transition-colors focus:outline-none disabled:opacity-70"
                    style={{
                      borderColor: answered
                        ? isCorrect
                          ? "var(--correct)"
                          : "var(--wrong)"
                        : "var(--warm-dark)",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                    autoFocus
                  />
                  {!answered && (
                    <button
                      onClick={handleTypeSubmit}
                      className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{
                        background: "var(--blue)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      Kolla
                    </button>
                  )}
                </div>

                {answered && (
                  <div className="mt-4">
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium mb-4"
                      style={{
                        background: isCorrect
                          ? "var(--correct-bg)"
                          : "var(--wrong-bg)",
                        color: isCorrect
                          ? "var(--correct)"
                          : "var(--wrong)",
                      }}
                    >
                      {isCorrect
                        ? "✅ Rätt! +5 XP"
                        : `❌ Rätt svar: ${currentCard.sv}`}
                    </div>
                    <button
                      onClick={nextCard}
                      className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none"
                      style={{
                        background: "var(--blue)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      Nästa ord →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══ LISTEN MODE ═══ */}
            {mode === "listen" && (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: "white", boxShadow: "var(--shadow)" }}
              >
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--text-light)" }}
                >
                  Lyssna och välj rätt översättning:
                </p>

                <button
                  onClick={() => speak(currentCard.sv)}
                  className="w-20 h-20 rounded-full text-3xl cursor-pointer border-none mb-6 transition-transform hover:scale-110"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--blue), var(--blue-dark))",
                    color: "white",
                    boxShadow: "0 8px 24px rgba(0,91,153,0.3)",
                  }}
                >
                  🔊
                </button>

                {!answered && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                    {getListenOptions(currentCard, cards).map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const correct = opt === currentCard.en;
                          setIsCorrect(correct);
                          handleAnswer(correct);
                        }}
                        className="px-4 py-3.5 rounded-lg border-2 text-left text-sm transition-all cursor-pointer hover:border-[var(--blue)] hover:bg-[var(--blue-light)]"
                        style={{
                          borderColor: "var(--warm-dark)",
                          background: "var(--warm)",
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {answered && (
                  <div className="mt-4">
                    <div
                      className="px-4 py-3 rounded-lg text-sm font-medium mb-2"
                      style={{
                        background: isCorrect
                          ? "var(--correct-bg)"
                          : "var(--wrong-bg)",
                        color: isCorrect
                          ? "var(--correct)"
                          : "var(--wrong)",
                      }}
                    >
                      {isCorrect
                        ? "✅ Rätt! +5 XP"
                        : `❌ Det var: "${currentCard.en}" (${currentCard.sv})`}
                    </div>
                    <button
                      onClick={nextCard}
                      className="px-8 py-3 rounded-lg font-semibold text-white cursor-pointer border-none mt-2"
                      style={{
                        background: "var(--blue)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
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

// Helper: generate 4 multiple-choice options for listen mode
function getListenOptions(
  correct: ReviewCard,
  allCards: ReviewCard[]
): string[] {
  const options = [correct.en];
  const others = allCards
    .filter((c) => c.en !== correct.en)
    .sort(() => Math.random() - 0.5);

  for (const card of others) {
    if (options.length >= 4) break;
    if (!options.includes(card.en)) {
      options.push(card.en);
    }
  }

  // If not enough options from review cards, add some defaults
  const fallbacks = [
    "house",
    "water",
    "hello",
    "thank you",
    "good morning",
    "cat",
    "dog",
    "book",
  ];
  for (const fb of fallbacks) {
    if (options.length >= 4) break;
    if (!options.includes(fb)) options.push(fb);
  }

  return options.sort(() => Math.random() - 0.5);
}
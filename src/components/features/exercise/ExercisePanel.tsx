"use client";

import { useState, useRef, useEffect } from "react";
import { Exercise } from "@/data/types";
import { addXP, incrementStreak, markTopicComplete, getProgress } from "@/lib/progress";
import { notify } from "@/lib/notify";

interface Props {
  exercises: Exercise[];
  topicId: string;
}

export default function ExercisePanel({ exercises, topicId }: Props) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [fillValue, setFillValue] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const ex = exercises[currentQ];
  const progress = (currentQ / exercises.length) * 100;

  useEffect(() => {
    if (ex?.type === "fill" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQ, ex?.type]);

  useEffect(() => {
    if (finished && !saved) {
      handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function handleMC(idx: number) {
    if (answered) return;
    setAnswered(true);
    setSelectedOption(idx);
    const correct = idx === ex.answer;
    setIsCorrect(correct);
    if (correct) {
      setScore((s) => s + 1);
      // Auto-advance only on correct
      setTimeout(advance, 1200);
    }
    // Wrong: user must press Next manually
  }

  function handleFill() {
    if (answered || !fillValue.trim()) return;
    setAnswered(true);
    const correct =
      fillValue.trim().toLowerCase() === (ex.answer as string).toLowerCase();
    setIsCorrect(correct);
    if (correct) {
      setScore((s) => s + 1);
      // Auto-advance only on correct
      setTimeout(advance, 1200);
    }
    // Wrong: user must press Next manually
  }

  function advance() {
    if (currentQ + 1 >= exercises.length) {
      setFinished(true);
      return;
    }
    setCurrentQ((q) => q + 1);
    setAnswered(false);
    setSelectedOption(null);
    setFillValue("");
    setIsCorrect(false);
  }

  function handleFinish() {
    if (saved) return;
    setSaved(true);
    const pct = Math.round((score / exercises.length) * 100);
    markTopicComplete(topicId, score, exercises.length);
    if (pct >= 80) incrementStreak();

    if (pct === 100) {
      notify.perfect();
    } else if (pct >= 80) {
      notify.goodScore(pct);
      const prog = getProgress();
      notify.streak(prog.streak);
    }
  }

  function restart() {
    setCurrentQ(0);
    setScore(0);
    setAnswered(false);
    setSelectedOption(null);
    setFillValue("");
    setIsCorrect(false);
    setFinished(false);
    setSaved(false);
  }

  // ── Results screen ────────────────────────────────────────────────────────
  if (finished) {
    const pct = Math.round((score / exercises.length) * 100);
    const msg =
      pct >= 80
        ? "Utmärkt! (Excellent!)"
        : pct >= 50
        ? "Bra jobbat! (Good job!)"
        : "Fortsätt öva! (Keep practicing!)";
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

    return (
      <div className="text-center py-10 animate-slide-up">
        <div
          className="w-[140px] h-[140px] rounded-full flex flex-col items-center justify-center mx-auto mb-6 text-4xl font-bold"
          style={{ background: bgColor, color: textColor }}
        >
          {pct}%
          <span className="text-xs font-medium">
            {score}/{exercises.length}
          </span>
        </div>
        <h3 className="text-xl font-semibold mb-2">{msg}</h3>
        <p className="mb-6" style={{ color: "var(--text-light)" }}>
          You earned {score * 10} XP from this exercise!
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={restart}
            className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer"
            style={{ background: "var(--blue)" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Question screen ───────────────────────────────────────────────────────
  return (
    <div>
      <p
        className="mb-2"
        style={{ color: "var(--text-light)", fontSize: "0.95rem" }}
      >
        Question {currentQ + 1} of {exercises.length}
      </p>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded overflow-hidden mb-6"
        style={{ background: "var(--warm-dark)" }}
      >
        <div
          className="h-full rounded progress-fill-animate"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--blue), var(--forest))",
          }}
        />
      </div>

      <div className="rounded-xl p-8" style={{ background: "var(--warm)" }}>
        <div
          className={`bg-white rounded-lg p-6 border-2 transition-colors ${
            answered
              ? isCorrect
                ? "border-[var(--correct)] bg-[var(--correct-bg)]"
                : "border-[var(--wrong)] bg-[var(--wrong-bg)]"
              : "border-transparent"
          }`}
        >
          {/* Question text */}
          <div className="text-lg font-medium mb-4">
            {ex.type === "fill"
              ? ex.q.split("___").map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span
                        className="inline-block min-w-[120px] text-center px-2 border-b-2 border-dashed"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--blue)",
                          borderColor: "var(--blue)",
                        }}
                      >
                        {answered ? (ex.answer as string) : "?"}
                      </span>
                    )}
                  </span>
                ))
              : ex.q}
          </div>

          {/* MC options */}
          {ex.type === "mc" && ex.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ex.options.map((opt, i) => {
                let btnStyle = "border-[var(--warm-dark)] bg-[var(--warm)]";
                if (answered) {
                  if (i === ex.answer)
                    btnStyle =
                      "border-[var(--correct)] bg-[var(--correct-bg)]";
                  else if (i === selectedOption)
                    btnStyle = "border-[var(--wrong)] bg-[var(--wrong-bg)]";
                } else if (i === selectedOption) {
                  btnStyle = "border-[var(--blue)] bg-[var(--blue-light)]";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleMC(i)}
                    disabled={answered}
                    className={`px-4 py-3 rounded-lg border-2 text-left text-[0.95rem] transition-all cursor-pointer disabled:cursor-default disabled:opacity-70 hover:border-[var(--blue)] hover:bg-[var(--blue-light)] ${btnStyle}`}
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill-in input */}
          {ex.type === "fill" && (
            <>
              {ex.hint && (
                <div
                  className="text-sm mb-3"
                  style={{ color: "var(--text-light)" }}
                >
                  Hint: {ex.hint}
                </div>
              )}
              <div className="flex gap-2.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={fillValue}
                  onChange={(e) => setFillValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFill()}
                  disabled={answered}
                  placeholder="Type your answer..."
                  className="flex-1 px-4 py-3.5 border-2 rounded-lg text-base transition-colors focus:outline-none focus:border-[var(--blue)] disabled:opacity-70"
                  style={{
                    borderColor: "var(--warm-dark)",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                />
                <button
                  onClick={handleFill}
                  disabled={answered}
                  className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-70"
                  style={{ background: "var(--blue)" }}
                >
                  Check
                </button>
              </div>
            </>
          )}

          {/* Feedback row + Next button on wrong */}
          {answered && (
            <div className="mt-3 animate-fade-in">
              {/* Correct / wrong message */}
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                  isCorrect
                    ? "bg-[var(--correct-bg)] text-[var(--correct)]"
                    : "bg-[var(--wrong-bg)] text-[var(--wrong)]"
                }`}
              >
                {isCorrect
                  ? "✅ Rätt! (Correct!)"
                  : `❌ Fel — rätt svar: ${
                      ex.type === "mc"
                        ? ex.options?.[ex.answer as number]
                        : ex.answer
                    }`}
              </div>

              {/* Next button — only shown on wrong answer */}
              {!isCorrect && (
                <button
                  onClick={advance}
                  className="mt-3 w-full py-3 rounded-lg font-semibold text-white cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: "var(--blue)" }}
                >
                  Nästa fråga →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
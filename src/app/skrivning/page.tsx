"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/LoadingSystem";
import { addXP, incrementStreak } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";


// ─── TYPES ────────────────────────────────────────────────────────────────────

interface WritingPrompt {
  id: string;
  swedish: string;
  english: string;
  level: "A" | "B" | "C" | "D";
  category: string;
  hint: string | null;
  keywords: string[];
}

interface AIFeedback {
  score: number;
  feedback: string;
  corrections: string[];
  positives: string[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const levelColors: Record<string, string> = {
  A: "#2D8B4E",
  B: "#005B99",
  C: "#6B3FA0",
  D: "#C0392B",
};

// ─── FETCH PROMPTS ────────────────────────────────────────────────────────────

async function fetchPrompts(level: string): Promise<WritingPrompt[]> {
  let query = supabase
    .from("writing_prompts")
    .select("id, swedish, english, level, category, hint, keywords")
    .order("sort_order", { ascending: true });

  if (level !== "all") query = query.eq("level", level);

  const { data, error } = await query;

  if (error || !data?.length) {
    console.error("[WritingPage] fetchPrompts:", error?.message);
    return [];
  }
  return data as WritingPrompt[];
}

// ─── AI FEEDBACK ─────────────────────────────────────────────────────────────

async function getAIFeedback(
  userAnswer: string,
  correctAnswer: string,
  english: string,
  level: string
): Promise<AIFeedback> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a Swedish language teacher evaluating a student's translation.

English sentence: "${english}"
Correct Swedish: "${correctAnswer}"
Student's answer: "${userAnswer}"
SFI level: Kurs ${level}

Respond ONLY with a JSON object, no markdown, no extra text:
{
  "score": <0-100>,
  "feedback": "<one encouraging sentence in Swedish>",
  "corrections": ["<correction 1 in English>", "<correction 2 in English>"],
  "positives": ["<positive 1 in English>"]
}

Scoring: 90-100 = perfect/near-perfect, 70-89 = good with small errors, 50-69 = partial, 20-49 = significant errors, 0-19 = mostly wrong.
Max 2-3 corrections, max 2 positives. Empty array [] if none apply.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as AIFeedback;
  } catch (err) {
    console.error("[WritingPage] AI feedback error:", err);
    const score = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ? 100 : 30;
    return {
      score,
      feedback: score === 100 ? "Perfekt svar!" : "Fortsätt öva — titta på rätt svar nedan.",
      corrections: score < 100 ? [`Rätt svar: ${correctAnswer}`] : [],
      positives: [],
    };
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function WritingPracticePage() {
  const [selectedLevel, setSelectedLevel]     = useState("all");
  const [prompts, setPrompts]                 = useState<WritingPrompt[]>([]);
  const [currentIdx, setCurrentIdx]           = useState(0);
  const [userAnswer, setUserAnswer]           = useState("");
  const [aiFeedback, setAiFeedback]           = useState<AIFeedback | null>(null);
  const [showHint, setShowHint]               = useState(false);
  const [showAnswer, setShowAnswer]           = useState(false);
  const [loadingPrompts, setLoadingPrompts]   = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [streak, setStreak]                   = useState(0);
  const [sessionStats, setSessionStats]       = useState({ correct: 0, attempted: 0, xp: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load prompts ───
  const loadPrompts = useCallback(async (level: string) => {
    setLoadingPrompts(true);
    const data = await fetchPrompts(level);
    setPrompts([...data].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setUserAnswer("");
    setAiFeedback(null);
    setShowHint(false);
    setShowAnswer(false);
    setLoadingPrompts(false);
  }, []);

  useEffect(() => { loadPrompts(selectedLevel); }, [selectedLevel, loadPrompts]);

  const prompt = prompts[currentIdx];

  // ─── Check answer ───
  async function handleCheck() {
    if (!userAnswer.trim() || !prompt || loadingFeedback) return;
    setLoadingFeedback(true);

    const feedback = await getAIFeedback(
      userAnswer,
      prompt.swedish,
      prompt.english,
      prompt.level
    );

    setAiFeedback(feedback);
    setLoadingFeedback(false);

    const isCorrect = feedback.score >= 70;
    const xpEarned  = Math.round(feedback.score / 10);

    setStreak((s) => (isCorrect ? s + 1 : 0));
    setSessionStats((prev) => ({
      correct:   prev.correct + (isCorrect ? 1 : 0),
      attempted: prev.attempted + 1,
      xp:        prev.xp + xpEarned,
    }));

    addXP(xpEarned);
    if (isCorrect) incrementStreak();
    window.dispatchEvent(new Event("progress-update"));
  }

  // ─── Next prompt ───
  function handleNext() {
    setCurrentIdx((prev) => (prev + 1) % prompts.length);
    setUserAnswer("");
    setAiFeedback(null);
    setShowHint(false);
    setShowAnswer(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // ─── Level change ───
  function handleLevelChange(level: string) {
    setSelectedLevel(level);
    setStreak(0);
    setSessionStats({ correct: 0, attempted: 0, xp: 0 });
  }

  // ─── Keyboard shortcut ───
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.ctrlKey) {
      if (aiFeedback) handleNext();
      else handleCheck();
    }
  }

  const progress = prompts.length > 0
    ? Math.round((sessionStats.attempted / prompts.length) * 100)
    : 0;

  // ─── LOADING ───
  if (loadingPrompts) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="data" message="Laddar skrivövningar..." />
        </div>
        <Footer />
      </>
    );
  }

  // ─── NO DATA ───
  if (!prompt) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
          <p style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</p>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "8px" }}>Inga övningar hittades</h3>
          <p style={{ color: "var(--text-light)", marginBottom: "24px" }}>
            Lägg till skrivövningar i Supabase för{" "}
            {selectedLevel === "all" ? "alla nivåer" : `Kurs ${selectedLevel}`}.
          </p>
          <button
            onClick={() => handleLevelChange("all")}
            style={{ padding: "10px 24px", borderRadius: "8px", background: "var(--blue)", color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}
          >
            Visa alla nivåer
          </button>
        </div>
        <Footer />
      </>
    );
  }

  // ─── MAIN ────────────────────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "32px 20px" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <span>✍️ Skrivövning</span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
              ✍️ Skrivövning
            </h1>
            <p style={{ color: "var(--text-light)" }}>
              Translate the English sentence into Swedish. AI gives you instant personalised feedback!
            </p>
          </div>

          {/* Level Filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            {["all", "A", "B", "C", "D"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                style={{
                  padding: "6px 18px", borderRadius: "20px", border: "2px solid",
                  borderColor: selectedLevel === lvl ? "var(--blue)" : "var(--warm-dark)",
                  background:  selectedLevel === lvl ? "var(--blue)" : "white",
                  color:       selectedLevel === lvl ? "white" : "var(--text)",
                  fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                  transition: "all 0.15s", fontFamily: "'Outfit', sans-serif",
                }}
              >
                {lvl === "all" ? "Alla nivåer" : `Kurs ${lvl}`}
              </button>
            ))}
          </div>

          {/* Session Stats */}
          <div style={{
            display: "flex", gap: "16px", padding: "12px 20px",
            background: "white", borderRadius: "10px", marginBottom: "24px",
            boxShadow: "var(--shadow)", fontSize: "0.85rem", flexWrap: "wrap", alignItems: "center",
          }}>
            <span>📝 <strong>{sessionStats.attempted}</strong> / {prompts.length}</span>
            <span>✅ <strong>{sessionStats.correct}</strong> rätt</span>
            <span>⭐ <strong>+{sessionStats.xp}</strong> XP</span>
            {streak >= 2 && (
              <span style={{ color: "var(--yellow-dark)", fontWeight: 700 }}>
                🔥 {streak} i rad!
              </span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "120px", height: "6px", background: "var(--warm-dark)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)", borderRadius: "3px", transition: "width 0.4s" }} />
              </div>
              <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>{progress}%</span>
            </div>
          </div>

          {/* Main Card */}
          <div style={{ background: "white", borderRadius: "16px", padding: "36px", boxShadow: "var(--shadow-lg)" }}>

            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{
                  background: levelColors[prompt.level] + "20", color: levelColors[prompt.level],
                  padding: "4px 12px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700,
                }}>
                  Kurs {prompt.level}
                </span>
                <span style={{
                  background: "var(--warm)", color: "var(--text-light)",
                  padding: "4px 12px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 600,
                }}>
                  {prompt.category}
                </span>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
                {currentIdx + 1} / {prompts.length}
              </span>
            </div>

            {/* English prompt */}
            <div style={{
              background: "var(--blue-light)", borderRadius: "12px",
              padding: "24px", marginBottom: "24px", borderLeft: "4px solid var(--blue)",
            }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--blue)", marginBottom: "8px" }}>
                🇬🇧 Translate to Swedish:
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--blue-dark)", lineHeight: 1.4 }}>
                {prompt.english}
              </div>
            </div>

            {/* Hint toggle */}
            {!aiFeedback && prompt.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                style={{ background: "none", border: "none", color: "var(--text-light)", fontSize: "0.85rem", cursor: "pointer", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                💡 {showHint ? "Dölj ledtråd" : "Visa ledtråd"}
              </button>
            )}
            {showHint && !aiFeedback && prompt.hint && (
              <div style={{ background: "var(--yellow-light)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "0.88rem" }}>
                <strong>Ledtråd:</strong> {prompt.hint}
              </div>
            )}

            {/* Textarea */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-light)" }}>
                🇸🇪 Din svenska översättning:
              </label>
              <textarea
                ref={textareaRef}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!!aiFeedback || loadingFeedback}
                placeholder="Skriv din översättning här... (Ctrl+Enter för att kontrollera)"
                rows={3}
                style={{
                  width: "100%", padding: "14px 16px",
                  border: aiFeedback
                    ? aiFeedback.score >= 70 ? "2px solid var(--correct)" : "2px solid var(--wrong)"
                    : "2px solid var(--warm-dark)",
                  borderRadius: "8px", fontFamily: "'Outfit', sans-serif",
                  fontSize: "1rem", resize: "vertical", transition: "border-color 0.2s",
                  background: aiFeedback
                    ? aiFeedback.score >= 70 ? "var(--correct-bg)" : "var(--wrong-bg)"
                    : "white",
                  outline: "none",
                }}
                onFocus={(e) => { if (!aiFeedback) e.target.style.borderColor = "var(--blue)"; }}
                onBlur={(e)  => { if (!aiFeedback) e.target.style.borderColor = "var(--warm-dark)"; }}
              />
            </div>

            {/* AI loading */}
            {loadingFeedback && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", background: "var(--blue-light)", borderRadius: "10px", marginBottom: "16px", fontSize: "0.9rem", color: "var(--blue)" }}>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                AI analyserar ditt svar...
              </div>
            )}

            {/* AI Feedback */}
            {aiFeedback && !loadingFeedback && (
              <div style={{ marginBottom: "20px" }}>

                {/* Score bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ flex: 1, height: "10px", background: "var(--warm-dark)", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{
                      width: `${aiFeedback.score}%`, height: "100%", borderRadius: "5px",
                      background: aiFeedback.score >= 80 ? "var(--correct)" : aiFeedback.score >= 50 ? "var(--yellow)" : "var(--wrong)",
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <span style={{
                    fontWeight: 700, fontSize: "1rem", minWidth: "44px",
                    color: aiFeedback.score >= 80 ? "var(--correct)" : aiFeedback.score >= 50 ? "var(--yellow-dark)" : "var(--wrong)",
                  }}>
                    {aiFeedback.score}%
                  </span>
                </div>

                {/* Feedback message + streak */}
                <div style={{
                  padding: "12px 16px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, marginBottom: "12px",
                  background: aiFeedback.score >= 70 ? "var(--correct-bg)" : "var(--wrong-bg)",
                  color: aiFeedback.score >= 70 ? "var(--correct)" : "var(--wrong)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
                }}>
                  <span>
                    {aiFeedback.score >= 80 ? "✅" : aiFeedback.score >= 50 ? "⚠️" : "❌"} {aiFeedback.feedback}
                  </span>
                  {streak >= 2 && aiFeedback.score >= 70 && (
                    <span style={{ color: "var(--yellow-dark)", fontWeight: 700 }}>🔥 {streak} i rad!</span>
                  )}
                </div>

                {/* Positives */}
                {aiFeedback.positives.length > 0 && (
                  <div style={{ marginBottom: "8px", fontSize: "0.85rem" }}>
                    {aiFeedback.positives.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "4px", color: "var(--correct)" }}>
                        <span style={{ flexShrink: 0 }}>✓</span><span>{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Corrections */}
                {aiFeedback.corrections.length > 0 && (
                  <div style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
                    {aiFeedback.corrections.map((c, i) => (
                      <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "4px", color: "var(--wrong)" }}>
                        <span style={{ flexShrink: 0 }}>✗</span><span>{c}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Correct answer + 🔊 */}
                <div style={{ background: "var(--forest-light)", borderRadius: "10px", padding: "16px", borderLeft: "4px solid var(--forest)" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--forest)", marginBottom: "8px" }}>
                    ✓ RÄTT SVAR:
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--forest)" }}>
                      {prompt.swedish}
                    </div>
                    <button
                      onClick={() => speak(prompt.swedish)}
                      title="Lyssna på rätt svar"
                      style={{
                        background: "var(--forest)", border: "none", borderRadius: "50%",
                        width: "38px", height: "38px", display: "flex", alignItems: "center",
                        justifyContent: "center", cursor: "pointer", flexShrink: 0,
                        fontSize: "1rem", color: "white",
                      }}
                    >
                      🔊
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {!aiFeedback && !loadingFeedback ? (
                <>
                  <button
                    onClick={handleCheck}
                    disabled={!userAnswer.trim()}
                    style={{
                      padding: "12px 28px", borderRadius: "8px",
                      background: userAnswer.trim() ? "var(--blue)" : "var(--warm-dark)",
                      color: userAnswer.trim() ? "white" : "var(--text-light)",
                      border: "none", fontWeight: 700, fontSize: "0.95rem",
                      cursor: userAnswer.trim() ? "pointer" : "default",
                      transition: "all 0.2s", fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    Kontrollera ✓
                  </button>
                  <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    style={{
                      padding: "12px 20px", borderRadius: "8px",
                      background: "white", border: "2px solid var(--warm-dark)",
                      fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {showAnswer ? "Dölj svar" : "Visa svar"}
                  </button>
                </>
              ) : !loadingFeedback ? (
                <button
                  onClick={handleNext}
                  style={{
                    padding: "12px 32px", borderRadius: "8px",
                    background: "var(--blue)", color: "white",
                    border: "none", fontWeight: 700, fontSize: "0.95rem",
                    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Nästa → (Ctrl+Enter)
                </button>
              ) : null}
            </div>

            {/* Show answer without checking */}
            {showAnswer && !aiFeedback && (
              <div style={{ marginTop: "16px", background: "var(--warm)", borderRadius: "8px", padding: "14px 18px", fontSize: "0.95rem" }}>
                <strong>Svar:</strong> {prompt.swedish}
              </div>
            )}
          </div>

          {/* Tip */}
          <div style={{
            background: "var(--yellow-light)", borderRadius: "12px",
            padding: "16px 20px", marginTop: "20px",
            display: "flex", gap: "10px", alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.2rem" }}>🤖</span>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
              <strong>AI-feedback:</strong> Vår AI analyserar ditt svar och ger dig specifik feedback på grammatik
              och ordval — inte bara rätt eller fel. Sikta på 80%+ för full XP! Tryck <strong>Ctrl+Enter</strong> för snabb kontroll.
            </p>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// ─── WRITING PROMPTS DATA ───────────────────────────────────────────────────
const writingPrompts = [
  // Kurs A — Beginner
  {
    level: "A",
    category: "Hälsningar",
    english: "Hello, my name is Maria.",
    swedish: "Hej, jag heter Maria.",
    hint: "Use 'Hej' for hello and 'jag heter' for my name is.",
    keywords: ["hej", "jag heter"],
  },
  {
    level: "A",
    category: "Hälsningar",
    english: "How are you? I am fine, thank you.",
    swedish: "Hur mår du? Jag mår bra, tack.",
    hint: "'Hur mår du?' asks how someone is. 'Jag mår bra' means I am fine.",
    keywords: ["hur mår du", "jag mår bra", "tack"],
  },
  {
    level: "A",
    category: "Siffror",
    english: "I have three children.",
    swedish: "Jag har tre barn.",
    hint: "'Jag har' = I have, 'tre' = three, 'barn' = child/children.",
    keywords: ["jag har", "tre", "barn"],
  },
  {
    level: "A",
    category: "Familj",
    english: "My mother and father live in Sweden.",
    swedish: "Min mamma och pappa bor i Sverige.",
    hint: "'bor i' = live in. 'Sverige' = Sweden.",
    keywords: ["mamma", "pappa", "bor i", "sverige"],
  },
  {
    level: "A",
    category: "Färger",
    english: "The Swedish flag is blue and yellow.",
    swedish: "Den svenska flaggan är blå och gul.",
    hint: "Remember: blå = blue, gul = yellow.",
    keywords: ["blå", "gul"],
  },
  // Kurs B — Elementary
  {
    level: "B",
    category: "Mat",
    english: "I would like a coffee and a sandwich, please.",
    swedish: "Jag vill ha en kaffe och en smörgås, tack.",
    hint: "'Jag vill ha' = I would like. Don't forget 'tack' at the end!",
    keywords: ["jag vill ha", "kaffe", "tack"],
  },
  {
    level: "B",
    category: "Väder",
    english: "It is cold and windy today.",
    swedish: "Det är kallt och blåsigt idag.",
    hint: "'Det är' = It is. 'kallt' = cold, 'blåsigt' = windy, 'idag' = today.",
    keywords: ["det är", "kallt", "idag"],
  },
  {
    level: "B",
    category: "Klockan",
    english: "The time is half past two.",
    swedish: "Klockan är halv tre.",
    hint: "Remember: 'halv tre' = 2:30, NOT 3:30! Halv refers to the NEXT hour.",
    keywords: ["klockan är", "halv tre"],
  },
  {
    level: "B",
    category: "Vardagen",
    english: "I go to work every day at eight o'clock.",
    swedish: "Jag går till jobbet varje dag klockan åtta.",
    hint: "'varje dag' = every day, 'klockan åtta' = at eight o'clock.",
    keywords: ["varje dag", "klockan"],
  },
  // Kurs C — Intermediate
  {
    level: "C",
    category: "Arbete",
    english: "I have worked as a nurse for five years.",
    swedish: "Jag har jobbat som sjuksköterska i fem år.",
    hint: "Perfect tense: 'Jag har jobbat' = I have worked. 'som' = as.",
    keywords: ["har jobbat", "som", "i fem år"],
  },
  {
    level: "C",
    category: "Hälsa",
    english: "I have a stomachache and I need to see a doctor.",
    swedish: "Jag har ont i magen och jag behöver träffa en läkare.",
    hint: "'Jag har ont i' = I have pain in. 'behöver' = need to.",
    keywords: ["har ont i", "magen", "läkare"],
  },
  {
    level: "C",
    category: "Bostad",
    english: "I am looking for a two-room furnished apartment.",
    swedish: "Jag söker en tvårummare som är möblerad.",
    hint: "'söker' = am looking for. 'tvårummare' = two-room apartment. 'möblerad' = furnished.",
    keywords: ["söker", "möblerad"],
  },
  // Kurs D — Advanced
  {
    level: "D",
    category: "Samhälle",
    english: "I think that gender equality is very important in society.",
    swedish: "Jag tycker att jämställdhet är mycket viktigt i samhället.",
    hint: "'Jag tycker att' = I think that. 'mycket viktigt' = very important.",
    keywords: ["jag tycker att", "jämställdhet", "samhället"],
  },
  {
    level: "D",
    category: "Skrivande",
    english: "On one hand it saves money, on the other hand it takes time.",
    swedish: "Å ena sidan sparar det pengar, å andra sidan tar det tid.",
    hint: "'Å ena sidan... å andra sidan' = On one hand... on the other hand.",
    keywords: ["å ena sidan", "å andra sidan"],
  },
  {
    level: "D",
    category: "Nyheter",
    english: "According to me, we need to invest more in the environment.",
    swedish: "Enligt mig behöver vi investera mer i miljön.",
    hint: "'Enligt mig' = According to me / In my opinion.",
    keywords: ["enligt mig", "miljön"],
  },
];

// ─── SCORING LOGIC ──────────────────────────────────────────────────────────
function scoreAnswer(userAnswer: string, correct: string, keywords: string[]): {
  score: number; // 0-100
  feedback: string;
  matchedKeywords: string[];
  missedKeywords: string[];
} {
  const user = userAnswer.toLowerCase().trim();
  const correctLower = correct.toLowerCase();

  // Exact match
  if (user === correctLower) {
    return { score: 100, feedback: "Perfekt! Exakt rätt svar!", matchedKeywords: keywords, missedKeywords: [] };
  }

  // Check keyword matches
  const matched = keywords.filter(kw => user.includes(kw.toLowerCase()));
  const missed = keywords.filter(kw => !user.includes(kw.toLowerCase()));
  const keywordScore = Math.round((matched.length / keywords.length) * 80);

  // Bonus for length similarity
  const lengthRatio = Math.min(user.length, correctLower.length) / Math.max(user.length, correctLower.length);
  const totalScore = Math.min(95, keywordScore + Math.round(lengthRatio * 15));

  let feedback = "";
  if (totalScore >= 80) feedback = "Bra jobbat! Nästan perfekt.";
  else if (totalScore >= 50) feedback = "Bra försök! Du fick med de viktigaste orden.";
  else if (totalScore >= 20) feedback = "Fortsätt öva! Du är på rätt spår.";
  else feedback = "Titta på ledtråden och försök igen!";

  return { score: totalScore, feedback, matchedKeywords: matched, missedKeywords: missed };
}

// ─── LEVEL BADGE ────────────────────────────────────────────────────────────
const levelColors: Record<string, string> = {
  A: "#2D8B4E",
  B: "#005B99",
  C: "#6B3FA0",
  D: "#C0392B",
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function WritingPracticePage() {
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<null | ReturnType<typeof scoreAnswer>>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, attempted: 0, xp: 0 });
  const [shuffledPrompts, setShuffledPrompts] = useState(writingPrompts);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter and shuffle prompts
  useEffect(() => {
    const filtered = selectedLevel === "all"
      ? writingPrompts
      : writingPrompts.filter(p => p.level === selectedLevel);
    setShuffledPrompts([...filtered].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setUserAnswer("");
    setResult(null);
    setShowAnswer(false);
    setShowHint(false);
  }, [selectedLevel]);

  const prompt = shuffledPrompts[currentIdx];

  function handleCheck() {
    if (!userAnswer.trim()) return;
    const res = scoreAnswer(userAnswer, prompt.swedish, prompt.keywords);
    setResult(res);
    const xpEarned = Math.round(res.score / 10);
    setSessionStats(prev => ({
      correct: prev.correct + (res.score >= 70 ? 1 : 0),
      attempted: prev.attempted + 1,
      xp: prev.xp + xpEarned,
    }));
  }

  function handleNext() {
    setCurrentIdx(prev => (prev + 1) % shuffledPrompts.length);
    setUserAnswer("");
    setResult(null);
    setShowAnswer(false);
    setShowHint(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.ctrlKey) {
      if (result) handleNext();
      else handleCheck();
    }
  }

  if (!prompt) return null;

  const progress = shuffledPrompts.length > 0
    ? Math.round((sessionStats.attempted / shuffledPrompts.length) * 100)
    : 0;

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

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
            ✍️ Skrivövning
          </h1>
          <p style={{ color: "var(--text-light)" }}>
            Translate the English sentence into Swedish. Focus on spelling and grammar!
          </p>
        </div>

        {/* Level Filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {["all", "A", "B", "C", "D"].map(lvl => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              style={{
                padding: "6px 18px",
                borderRadius: "20px",
                border: "2px solid",
                borderColor: selectedLevel === lvl ? "var(--blue)" : "var(--warm-dark)",
                background: selectedLevel === lvl ? "var(--blue)" : "white",
                color: selectedLevel === lvl ? "white" : "var(--text)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {lvl === "all" ? "Alla nivåer" : `Kurs ${lvl}`}
            </button>
          ))}
        </div>

        {/* Session Stats Bar */}
        <div style={{
          display: "flex", gap: "16px", padding: "12px 20px",
          background: "white", borderRadius: "10px", marginBottom: "24px",
          boxShadow: "var(--shadow)", fontSize: "0.85rem", flexWrap: "wrap",
        }}>
          <span>📝 <strong>{sessionStats.attempted}</strong> / {shuffledPrompts.length} attempted</span>
          <span>✅ <strong>{sessionStats.correct}</strong> correct</span>
          <span>⭐ <strong>+{sessionStats.xp}</strong> XP this session</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "120px", height: "6px", background: "var(--warm-dark)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)", borderRadius: "3px", transition: "width 0.4s" }} />
            </div>
            <span style={{ color: "var(--text-light)" }}>{progress}%</span>
          </div>
        </div>

        {/* Main Card */}
        <div style={{ background: "white", borderRadius: "16px", padding: "36px", boxShadow: "var(--shadow-lg)" }}>

          {/* Category Badge + Counter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <span style={{
                background: levelColors[prompt.level] + "20",
                color: levelColors[prompt.level],
                padding: "4px 12px", borderRadius: "12px",
                fontSize: "0.78rem", fontWeight: 700,
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
              {currentIdx + 1} / {shuffledPrompts.length}
            </span>
          </div>

          {/* English Prompt */}
          <div style={{
            background: "var(--blue-light)", borderRadius: "12px",
            padding: "24px", marginBottom: "24px",
            borderLeft: "4px solid var(--blue)",
          }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--blue)", marginBottom: "8px" }}>
              🇬🇧 Translate to Swedish:
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--blue-dark)", lineHeight: 1.4 }}>
              {prompt.english}
            </div>
          </div>

          {/* Hint */}
          {!result && (
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "none", border: "none", color: "var(--text-light)",
                fontSize: "0.85rem", cursor: "pointer", marginBottom: "12px",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              💡 {showHint ? "Hide hint" : "Show hint"}
            </button>
          )}
          {showHint && !result && (
            <div style={{
              background: "var(--yellow-light)", borderRadius: "8px",
              padding: "12px 16px", marginBottom: "16px", fontSize: "0.88rem",
            }}>
              <strong>Ledtråd (Hint):</strong> {prompt.hint}
            </div>
          )}

          {/* Text Input */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px", color: "var(--text-light)" }}>
              🇸🇪 Your Swedish translation:
            </label>
            <textarea
              ref={textareaRef}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!result}
              placeholder="Skriv din översättning här... (Ctrl+Enter to check)"
              rows={3}
              style={{
                width: "100%", padding: "14px 16px",
                border: result
                  ? result.score >= 70
                    ? "2px solid var(--correct)"
                    : "2px solid var(--wrong)"
                  : "2px solid var(--warm-dark)",
                borderRadius: "8px", fontFamily: "'Outfit', sans-serif",
                fontSize: "1rem", resize: "vertical", transition: "border-color 0.2s",
                background: result
                  ? result.score >= 70 ? "var(--correct-bg)" : "var(--wrong-bg)"
                  : "white",
                outline: "none",
              }}
              onFocus={e => { if (!result) e.target.style.borderColor = "var(--blue)"; }}
              onBlur={e => { if (!result) e.target.style.borderColor = "var(--warm-dark)"; }}
            />
          </div>

          {/* Result */}
          {result && (
            <div style={{ marginBottom: "20px" }}>
              {/* Score bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                marginBottom: "12px",
              }}>
                <div style={{ flex: 1, height: "10px", background: "var(--warm-dark)", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{
                    width: `${result.score}%`, height: "100%", borderRadius: "5px",
                    background: result.score >= 80 ? "var(--correct)" : result.score >= 50 ? "var(--yellow)" : "var(--wrong)",
                    transition: "width 0.6s ease",
                  }} />
                </div>
                <span style={{
                  fontWeight: 700, fontSize: "1rem",
                  color: result.score >= 80 ? "var(--correct)" : result.score >= 50 ? "var(--yellow-dark)" : "var(--wrong)",
                }}>
                  {result.score}%
                </span>
              </div>

              {/* Feedback message */}
              <div style={{
                padding: "12px 16px", borderRadius: "8px", fontSize: "0.9rem",
                fontWeight: 600, marginBottom: "12px",
                background: result.score >= 70 ? "var(--correct-bg)" : "var(--wrong-bg)",
                color: result.score >= 70 ? "var(--correct)" : "var(--wrong)",
              }}>
                {result.score >= 80 ? "✅" : result.score >= 50 ? "⚠️" : "❌"} {result.feedback}
              </div>

              {/* Keyword feedback */}
              {result.matchedKeywords.length > 0 && (
                <div style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
                  <span style={{ color: "var(--correct)" }}>✓ Found: </span>
                  {result.matchedKeywords.map(kw => (
                    <span key={kw} style={{
                      background: "var(--correct-bg)", color: "var(--correct)",
                      padding: "2px 8px", borderRadius: "10px", marginRight: "6px",
                      fontWeight: 600, fontSize: "0.82rem",
                    }}>{kw}</span>
                  ))}
                </div>
              )}
              {result.missedKeywords.length > 0 && (
                <div style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                  <span style={{ color: "var(--wrong)" }}>✗ Missing: </span>
                  {result.missedKeywords.map(kw => (
                    <span key={kw} style={{
                      background: "var(--wrong-bg)", color: "var(--wrong)",
                      padding: "2px 8px", borderRadius: "10px", marginRight: "6px",
                      fontWeight: 600, fontSize: "0.82rem",
                    }}>{kw}</span>
                  ))}
                </div>
              )}

              {/* Correct answer */}
              <div style={{
                background: "var(--forest-light)", borderRadius: "10px",
                padding: "16px", borderLeft: "4px solid var(--forest)",
              }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--forest)", marginBottom: "6px" }}>
                  ✓ CORRECT ANSWER:
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--forest)" }}>
                  {prompt.swedish}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {!result ? (
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
                    transition: "all 0.2s",
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
                  }}
                >
                  {showAnswer ? "Hide answer" : "Show answer"}
                </button>
              </>
            ) : (
              <button
                onClick={handleNext}
                style={{
                  padding: "12px 32px", borderRadius: "8px",
                  background: "var(--blue)", color: "white",
                  border: "none", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Nästa → (Ctrl+Enter)
              </button>
            )}
          </div>

          {/* Show answer without checking */}
          {showAnswer && !result && (
            <div style={{
              marginTop: "16px", background: "var(--warm)",
              borderRadius: "8px", padding: "14px 18px", fontSize: "0.95rem",
            }}>
              <strong>Answer:</strong> {prompt.swedish}
            </div>
          )}
        </div>

        {/* Tip */}
        <div style={{
          background: "var(--yellow-light)", borderRadius: "12px",
          padding: "16px 20px", marginTop: "20px",
          display: "flex", gap: "10px", alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1.2rem" }}>💡</span>
          <p style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>
            <strong>Pro tip:</strong> Don't just memorize the answer — understand <em>why</em> it's correct.
            Look at the keyword hints to learn the key vocabulary and grammar structures.
            Aim for 80%+ to earn full XP!
          </p>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
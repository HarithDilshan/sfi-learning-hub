"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/ui/LoadingSystem";
import { addXP, incrementStreak } from "@/lib/progress";
import { speak } from "@/lib/tts";
import { supabase } from "@/lib/supabase";


// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Verb {
  id: string;
  infinitive: string;
  english: string;
  group_number: 1 | 2 | 3 | 4;
  group_label: string;
  present: string;
  past: string;
  supine: string;
  imperative: string;
  example_sentence: string | null;
}

type Tense = "present" | "past" | "supine" | "imperative";

interface DrillItem {
  verb: Verb;
  tense: Tense;
}

interface AIFeedback {
  explanation: string;   // Why it's wrong / grammar rule
  memory_tip: string;    // Mnemonic or pattern tip
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const tenses: { key: Tense; label: string; description: string }[] = [
  { key: "present",    label: "Presens",   description: "Present tense — what is happening now" },
  { key: "past",       label: "Imperfekt", description: "Simple past — what happened" },
  { key: "supine",     label: "Supinum",   description: "Used with 'har' for perfect: jag har ___" },
  { key: "imperative", label: "Imperativ", description: "Commands: ___!" },
];

const groupColors = ["", "#2D8B4E", "#005B99", "#8B5A2B", "#6B3FA0"];
const groupBg     = ["", "#E8F8EE", "#E8F4FD", "#FDF0E0", "#F0E8FD"];

const tenseKey = (t: Tense): keyof Verb =>
  t === "present" ? "present" : t === "past" ? "past" : t === "supine" ? "supine" : "imperative";

const tenseSwedish: Record<Tense, string> = {
  present: "presens", past: "imperfekt", supine: "supinum", imperative: "imperativ",
};

// ─── FETCH ────────────────────────────────────────────────────────────────────

async function fetchVerbs(group: number | "all"): Promise<Verb[]> {
  let query = supabase
    .from("verbs")
    .select("id, infinitive, english, group_number, group_label, present, past, supine, imperative, example_sentence")
    .order("sort_order", { ascending: true });

  if (group !== "all") query = query.eq("group_number", group);

  const { data, error } = await query;
  if (error || !data?.length) {
    console.error("[VerbPage] fetchVerbs:", error?.message);
    return [];
  }
  return data as Verb[];
}

// ─── AI FEEDBACK FOR WRONG ANSWERS ───────────────────────────────────────────

async function getVerbAIFeedback(
  verb: Verb,
  tense: Tense,
  userAnswer: string,
  correctAnswer: string
): Promise<AIFeedback> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are a Swedish grammar teacher helping an SFI student who answered a verb conjugation question incorrectly.

Verb: "${verb.infinitive}" (${verb.english})
Verb group: ${verb.group_label}
Tense asked: ${tenseSwedish[tense]} (${tense})
Student answered: "${userAnswer}"
Correct answer: "${correctAnswer}"

Respond ONLY with a JSON object, no markdown, no extra text:
{
  "explanation": "<1-2 sentences explaining WHY the correct form is ${correctAnswer} — mention the verb group rule>",
  "memory_tip": "<one short memorable tip or pattern to help them remember this, e.g. a rhyme, pattern, or analogy>"
}

Keep both fields concise (max 30 words each). Write in English. Be encouraging, not critical.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as AIFeedback;
  } catch (err) {
    console.error("[VerbPage] AI feedback error:", err);
    return {
      explanation: `The ${tense} form of "${verb.infinitive}" is "${correctAnswer}". This follows the ${verb.group_label} conjugation pattern.`,
      memory_tip: `Try to remember: ${verb.infinitive} → ${correctAnswer}`,
    };
  }
}

// ─── DRILL QUEUE ─────────────────────────────────────────────────────────────

function buildDrillQueue(verbList: Verb[], tenseFilter: Tense | "all"): DrillItem[] {
  const tensesToDrill = tenseFilter === "all" ? tenses.map(t => t.key) : [tenseFilter];
  const items: DrillItem[] = [];
  for (const verb of verbList) {
    for (const tense of tensesToDrill) {
      items.push({ verb, tense });
    }
  }
  return items.sort(() => Math.random() - 0.5);
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function VerbConjugationPage() {
  const [selectedGroup, setSelectedGroup]     = useState<number | "all">("all");
  const [selectedTense, setSelectedTense]     = useState<Tense | "all">("all");
  const [allVerbs, setAllVerbs]               = useState<Verb[]>([]);
  const [drillQueue, setDrillQueue]           = useState<DrillItem[]>([]);
  const [currentIdx, setCurrentIdx]           = useState(0);
  const [userAnswer, setUserAnswer]           = useState("");
  const [result, setResult]                   = useState<"correct" | "wrong" | null>(null);
  const [showTable, setShowTable]             = useState(false);
  const [loadingVerbs, setLoadingVerbs]       = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback]           = useState<AIFeedback | null>(null);
  const [sessionStats, setSessionStats]       = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0, xp: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Load verbs ───
  const loadVerbs = useCallback(async (group: number | "all") => {
    setLoadingVerbs(true);
    const data = await fetchVerbs(group);
    setAllVerbs(data);
    setDrillQueue(buildDrillQueue(data, selectedTense));
    setCurrentIdx(0);
    setUserAnswer("");
    setResult(null);
    setShowTable(false);
    setAiFeedback(null);
    setLoadingVerbs(false);
  }, [selectedTense]);

  useEffect(() => { loadVerbs(selectedGroup); }, [selectedGroup]);

  // Rebuild queue when tense changes (no refetch needed)
  useEffect(() => {
    if (allVerbs.length === 0) return;
    setDrillQueue(buildDrillQueue(allVerbs, selectedTense));
    setCurrentIdx(0);
    setUserAnswer("");
    setResult(null);
    setShowTable(false);
    setAiFeedback(null);
  }, [selectedTense, allVerbs]);

  const currentDrill = drillQueue[currentIdx];
  const tenseInfo    = tenses.find(t => t.key === currentDrill?.tense);

  // ─── Check answer ───
  async function handleCheck() {
    if (!userAnswer.trim() || !currentDrill) return;

    const correct = String(currentDrill.verb[tenseKey(currentDrill.tense)]);
    const isCorrect =
      userAnswer.trim().toLowerCase() === correct.toLowerCase() ||
      correct.split("/").map(s => s.trim()).some(c => userAnswer.trim().toLowerCase() === c.toLowerCase());

    setResult(isCorrect ? "correct" : "wrong");

    const xpEarned = isCorrect ? 5 : 0;
    setSessionStats(prev => {
      const newStreak  = isCorrect ? prev.streak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, newStreak);
      return { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1, streak: newStreak, bestStreak, xp: prev.xp + xpEarned };
    });

    if (isCorrect) {
      addXP(xpEarned);
      incrementStreak();
      window.dispatchEvent(new Event("progress-update"));
    } else {
      // Fetch AI feedback only on wrong answer
      setLoadingFeedback(true);
      const feedback = await getVerbAIFeedback(currentDrill.verb, currentDrill.tense, userAnswer.trim(), correct);
      setAiFeedback(feedback);
      setLoadingFeedback(false);
    }
  }

  // ─── Next / Skip ───
  function goNext() {
    setCurrentIdx(prev => (prev + 1) % drillQueue.length);
    setUserAnswer("");
    setResult(null);
    setShowTable(false);
    setAiFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { if (result && !loadingFeedback) goNext(); else handleCheck(); }
    if (e.key === "Escape" && !result) goNext();
  }

  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : 0;

  // ─── LOADING ───
  if (loadingVerbs) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="data" message="Laddar verb..." />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <span>🔤 Verbträning</span>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>🔤 Verbkonjugation</h1>
            <p style={{ color: "var(--text-light)" }}>Master all 4 Swedish verb groups. Type the correct conjugated form!</p>
          </div>

          {/* Group Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "24px" }}>
            {[1, 2, 3, 4].map(g => (
              <div key={g} onClick={() => setSelectedGroup(selectedGroup === g ? "all" : g as 1|2|3|4)}
                style={{
                  background: selectedGroup === g ? groupColors[g] : "white",
                  color:      selectedGroup === g ? "white" : "var(--text)",
                  border: `2px solid ${groupColors[g]}`,
                  borderRadius: "10px", padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
                }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>Grupp {g}</div>
                <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>
                  {g === 1 ? "tala → talade" : g === 2 ? "läsa → läste" : g === 3 ? "bo → bodde" : "vara → var"}
                </div>
                <div style={{ fontSize: "0.73rem", opacity: 0.65, marginTop: "4px" }}>
                  {g === 1 ? "-ar present, -ade past" : g === 2 ? "-er present, -de/-te past" : g === 3 ? "1-syllable, -dde past" : "Strong/irregular"}
                </div>
              </div>
            ))}
          </div>

          {/* Tense Filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-light)" }}>Tense:</span>
            {[{ key: "all" as const, label: "All tenses" }, ...tenses.map(t => ({ key: t.key as Tense | "all", label: t.label }))].map(t => (
              <button key={t.key} onClick={() => setSelectedTense(t.key as Tense | "all")} style={{
                padding: "6px 14px", borderRadius: "16px", border: "2px solid",
                borderColor: selectedTense === t.key ? (t.key === "all" ? "var(--blue)" : "var(--forest)") : "var(--warm-dark)",
                background:  selectedTense === t.key ? (t.key === "all" ? "var(--blue)" : "var(--forest)") : "white",
                color:       selectedTense === t.key ? "white" : "var(--text)",
                fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              }}>{t.label}</button>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: "20px", padding: "12px 20px",
            background: "white", borderRadius: "10px", marginBottom: "24px",
            boxShadow: "var(--shadow)", fontSize: "0.85rem", flexWrap: "wrap", alignItems: "center",
          }}>
            <span>✅ <strong>{sessionStats.correct}</strong> / {sessionStats.total}</span>
            <span>🎯 <strong>{accuracy}%</strong></span>
            <span>⭐ <strong>+{sessionStats.xp}</strong> XP</span>
            {sessionStats.streak >= 2 && (
              <span style={{ color: "var(--yellow-dark)", fontWeight: 700 }}>🔥 {sessionStats.streak} i rad!</span>
            )}
            {sessionStats.bestStreak >= 5 && (
              <span style={{ color: "var(--text-light)" }}>⚡ Best: <strong>{sessionStats.bestStreak}</strong></span>
            )}
          </div>

          {/* Drill Card */}
          {currentDrill && (
            <div style={{ background: "white", borderRadius: "16px", padding: "36px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ background: groupBg[currentDrill.verb.group_number], color: groupColors[currentDrill.verb.group_number], padding: "4px 12px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                    {currentDrill.verb.group_label}
                  </span>
                  <span style={{ background: "var(--forest-light)", color: "var(--forest)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                    {tenseInfo?.label}
                  </span>
                </div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>{currentIdx + 1} / {drillQueue.length}</span>
              </div>

              {/* Tense description */}
              <div style={{ fontSize: "0.82rem", color: "var(--text-light)", marginBottom: "20px" }}>
                {tenseInfo?.description}
                {currentDrill.tense === "supine" && <span style={{ color: "var(--forest)", fontWeight: 600 }}> → "Jag har ___"</span>}
              </div>

              {/* Verb prompt */}
              <div style={{ background: "var(--blue-light)", borderRadius: "12px", padding: "24px", marginBottom: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-light)", marginBottom: "8px", fontWeight: 600 }}>Conjugate in {tenseInfo?.label}:</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2.2rem", color: "var(--blue-dark)" }}>
                    {currentDrill.verb.infinitive}
                  </div>
                  <button onClick={() => speak(currentDrill.verb.infinitive)} title="Lyssna"
                    style={{ background: "var(--blue)", border: "none", borderRadius: "50%", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.9rem", color: "white" }}>
                    🔊
                  </button>
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-light)", marginTop: "4px" }}>"{currentDrill.verb.english}"</div>
              </div>

              {/* Input */}
              <div style={{ marginBottom: "16px" }}>
                <input ref={inputRef} type="text" value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!!result}
                  placeholder={`Type the ${tenseInfo?.label} form... (Enter to check)`}
                  autoFocus
                  style={{
                    width: "100%", padding: "14px 18px",
                    border: result ? (result === "correct" ? "2px solid var(--correct)" : "2px solid var(--wrong)") : "2px solid var(--warm-dark)",
                    borderRadius: "8px", fontFamily: "'Outfit', sans-serif",
                    fontSize: "1.1rem", fontWeight: 600, textAlign: "center",
                    background: result === "correct" ? "var(--correct-bg)" : result === "wrong" ? "var(--wrong-bg)" : "white",
                    outline: "none", transition: "border-color 0.2s",
                  }}
                />
              </div>

              {/* Result */}
              {result && (
                <div style={{ marginBottom: "16px" }}>

                  {/* Correct/Wrong banner */}
                  <div style={{
                    padding: "12px 16px", borderRadius: "8px", marginBottom: "12px",
                    background: result === "correct" ? "var(--correct-bg)" : "var(--wrong-bg)",
                    color:      result === "correct" ? "var(--correct)" : "var(--wrong)",
                    fontWeight: 700, fontSize: "1rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
                  }}>
                    <span>
                      {result === "correct"
                        ? "✅ Rätt!"
                        : `❌ Fel! Rätt svar: ${currentDrill.verb[tenseKey(currentDrill.tense)]}`}
                    </span>
                    {result === "correct" && sessionStats.streak >= 2 && (
                      <span style={{ color: "var(--yellow-dark)" }}>🔥 {sessionStats.streak} i rad!</span>
                    )}
                  </div>

                  {/* AI feedback — only on wrong answers */}
                  {result === "wrong" && (
                    <>
                      {loadingFeedback ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "var(--blue-light)", borderRadius: "8px", marginBottom: "12px", fontSize: "0.88rem", color: "var(--blue)" }}>
                          <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                          AI förklarar varför...
                        </div>
                      ) : aiFeedback && (
                        <div style={{ background: "var(--forest-light)", borderRadius: "10px", padding: "16px", marginBottom: "12px", borderLeft: "4px solid var(--forest)" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--forest)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            🤖 AI Förklaring
                          </div>
                          <p style={{ fontSize: "0.88rem", lineHeight: 1.5, marginBottom: "8px", color: "var(--text)" }}>
                            {aiFeedback.explanation}
                          </p>
                          <div style={{ fontSize: "0.83rem", color: "var(--forest)", fontWeight: 600 }}>
                            💡 {aiFeedback.memory_tip}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Example sentence */}
                  {currentDrill.verb.example_sentence && (
                    <div style={{
                      background: "var(--yellow-light)", borderRadius: "8px",
                      padding: "12px 16px", marginBottom: "12px", fontSize: "0.88rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                    }}>
                      <span>📝 <em style={{ color: "var(--blue-dark)" }}>{currentDrill.verb.example_sentence}</em></span>
                      <button onClick={() => speak(currentDrill.verb.example_sentence!)} title="Lyssna"
                        style={{ background: "var(--yellow-dark)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.8rem", color: "white", flexShrink: 0 }}>
                        🔊
                      </button>
                    </div>
                  )}

                  {/* Conjugation table */}
                  <button onClick={() => setShowTable(!showTable)}
                    style={{ background: "none", border: "none", fontSize: "0.85rem", color: "var(--blue)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                    {showTable ? "Hide" : "Show"} full conjugation table
                  </button>

                  {showTable && (
                    <div style={{ marginTop: "12px", borderRadius: "10px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                        <thead>
                          <tr>
                            {["Infinitiv", "Presens", "Imperfekt", "Supinum", "Imperativ"].map(h => (
                              <th key={h} style={{ padding: "8px 12px", background: "var(--warm-dark)", fontSize: "0.75rem", textAlign: "left", fontWeight: 700 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {(["infinitive", "present", "past", "supine", "imperative"] as (keyof Verb)[]).map((key, i) => {
                              const isCurrent = (["present", "past", "supine", "imperative"] as Tense[])[i - 1] === currentDrill.tense;
                              return (
                                <td key={i} style={{
                                  padding: "10px 12px", fontWeight: 600,
                                  background: isCurrent ? "var(--yellow-light)" : "white",
                                  color: "var(--blue-dark)",
                                  fontFamily: i > 0 ? "monospace" : "inherit",
                                }}>
                                  {String(currentDrill.verb[key])}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {!result ? (
                  <>
                    <button onClick={handleCheck} disabled={!userAnswer.trim()}
                      style={{
                        padding: "12px 32px", borderRadius: "8px",
                        background: userAnswer.trim() ? "var(--blue)" : "var(--warm-dark)",
                        color: userAnswer.trim() ? "white" : "var(--text-light)",
                        border: "none", fontWeight: 700, fontSize: "0.95rem",
                        cursor: userAnswer.trim() ? "pointer" : "default",
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                      Kontrollera ✓
                    </button>
                    <button onClick={goNext}
                      style={{
                        padding: "12px 20px", borderRadius: "8px",
                        background: "white", border: "2px solid var(--warm-dark)",
                        fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
                        color: "var(--text-light)", fontFamily: "'Outfit', sans-serif",
                      }}>
                      Hoppa över (Esc)
                    </button>
                  </>
                ) : (
                  <button onClick={goNext} disabled={loadingFeedback}
                    style={{
                      padding: "12px 32px", borderRadius: "8px",
                      background: loadingFeedback ? "var(--warm-dark)" : "var(--blue)",
                      color: loadingFeedback ? "var(--text-light)" : "white",
                      border: "none", fontWeight: 700, fontSize: "0.95rem",
                      cursor: loadingFeedback ? "default" : "pointer",
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                    Nästa verb → (Enter)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reference Table */}
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", marginBottom: "16px" }}>
              📖 Verb Reference Table
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ background: "var(--warm)" }}>
                    {["Infinitiv", "English", "Grupp", "Presens", "Imperfekt", "Supinum", "Imperativ", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allVerbs.map((v, i) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--warm-dark)", background: i % 2 === 0 ? "white" : "var(--warm)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--blue-dark)" }}>{v.infinitive}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-light)", whiteSpace: "nowrap" }}>{v.english}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: groupBg[v.group_number], color: groupColors[v.group_number], padding: "2px 8px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>
                          {v.group_number}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.present}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.past}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.supine}</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.imperative}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => speak(v.infinitive)} title={`Listen to ${v.infinitive}`}
                          style={{ background: "var(--blue-light)", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.75rem" }}>
                          🔊
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  );
}
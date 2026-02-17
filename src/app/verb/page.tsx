"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// ─── VERB DATA ───────────────────────────────────────────────────────────────
// Swedish has 4 verb groups based on how they conjugate
interface Verb {
  infinitive: string;
  english: string;
  group: 1 | 2 | 3 | 4;
  groupLabel: string;
  present: string;
  past: string;
  supine: string; // perfect: har + supine
  imperative: string;
  exampleSentence?: string;
}

const verbs: Verb[] = [
  // GROUP 1: -ar verbs (infinitive ends in -a, past tense: -ade)
  { infinitive: "jobba", english: "to work", group: 1, groupLabel: "Group 1 (-ar)", present: "jobbar", past: "jobbade", supine: "jobbat", imperative: "jobba", exampleSentence: "Jag jobbar varje dag." },
  { infinitive: "tala", english: "to speak/talk", group: 1, groupLabel: "Group 1 (-ar)", present: "talar", past: "talade", supine: "talat", imperative: "tala", exampleSentence: "Hon talar svenska." },
  { infinitive: "lyssna", english: "to listen", group: 1, groupLabel: "Group 1 (-ar)", present: "lyssnar", past: "lyssnade", supine: "lyssnat", imperative: "lyssna" },
  { infinitive: "titta", english: "to look/watch", group: 1, groupLabel: "Group 1 (-ar)", present: "tittar", past: "tittade", supine: "tittat", imperative: "titta" },
  { infinitive: "köpa", english: "to buy", group: 1, groupLabel: "Group 1 (-ar)", present: "köper", past: "köpte", supine: "köpt", imperative: "köp" },
  { infinitive: "stänga", english: "to close", group: 1, groupLabel: "Group 1 (-ar)", present: "stänger", past: "stängde", supine: "stängt", imperative: "stäng" },
  { infinitive: "öppna", english: "to open", group: 1, groupLabel: "Group 1 (-ar)", present: "öppnar", past: "öppnade", supine: "öppnat", imperative: "öppna" },
  { infinitive: "hoppas", english: "to hope", group: 1, groupLabel: "Group 1 (-ar)", present: "hoppas", past: "hoppades", supine: "hoppats", imperative: "hoppas" },

  // GROUP 2: -er verbs (present: -er, past: -de or -te)
  { infinitive: "läsa", english: "to read", group: 2, groupLabel: "Group 2 (-er)", present: "läser", past: "läste", supine: "läst", imperative: "läs", exampleSentence: "Jag läser en bok." },
  { infinitive: "skriva", english: "to write", group: 2, groupLabel: "Group 2 (-er)", present: "skriver", past: "skrev", supine: "skrivit", imperative: "skriv", exampleSentence: "Han skriver ett brev." },
  { infinitive: "stiga", english: "to rise/step", group: 2, groupLabel: "Group 2 (-er)", present: "stiger", past: "steg", supine: "stigit", imperative: "stig" },
  { infinitive: "leva", english: "to live (be alive)", group: 2, groupLabel: "Group 2 (-er)", present: "lever", past: "levde", supine: "levt", imperative: "lev" },
  { infinitive: "ringa", english: "to call/ring", group: 2, groupLabel: "Group 2 (-er)", present: "ringer", past: "ringde", supine: "ringt", imperative: "ring", exampleSentence: "Jag ringer dig senare." },
  { infinitive: "flytta", english: "to move", group: 2, groupLabel: "Group 2 (-er)", present: "flyttar", past: "flyttade", supine: "flyttat", imperative: "flytta" },
  { infinitive: "känna", english: "to feel/know", group: 2, groupLabel: "Group 2 (-er)", present: "känner", past: "kände", supine: "känt", imperative: "känn" },
  { infinitive: "lägga", english: "to put/lay", group: 2, groupLabel: "Group 2 (-er)", present: "lägger", past: "lade", supine: "lagt", imperative: "lägg" },

  // GROUP 3: short verbs, 1 syllable (present: -r, past: -dde)
  { infinitive: "bo", english: "to live (reside)", group: 3, groupLabel: "Group 3 (short)", present: "bor", past: "bodde", supine: "bott", imperative: "bo", exampleSentence: "Vi bor i Stockholm." },
  { infinitive: "tro", english: "to believe/think", group: 3, groupLabel: "Group 3 (short)", present: "tror", past: "trodde", supine: "trott", imperative: "tro" },
  { infinitive: "sy", english: "to sew", group: 3, groupLabel: "Group 3 (short)", present: "syr", past: "sydde", supine: "sytt", imperative: "sy" },

  // GROUP 4: strong/irregular verbs
  { infinitive: "vara", english: "to be", group: 4, groupLabel: "Group 4 (irregular)", present: "är", past: "var", supine: "varit", imperative: "var", exampleSentence: "Jag är lärare." },
  { infinitive: "ha", english: "to have", group: 4, groupLabel: "Group 4 (irregular)", present: "har", past: "hade", supine: "haft", imperative: "ha", exampleSentence: "Du har ett äpple." },
  { infinitive: "gå", english: "to go/walk", group: 4, groupLabel: "Group 4 (irregular)", present: "går", past: "gick", supine: "gått", imperative: "gå", exampleSentence: "Hon går till jobbet." },
  { infinitive: "komma", english: "to come", group: 4, groupLabel: "Group 4 (irregular)", present: "kommer", past: "kom", supine: "kommit", imperative: "kom", exampleSentence: "Han kommer från Irak." },
  { infinitive: "ta", english: "to take", group: 4, groupLabel: "Group 4 (irregular)", present: "tar", past: "tog", supine: "tagit", imperative: "ta" },
  { infinitive: "se", english: "to see", group: 4, groupLabel: "Group 4 (irregular)", present: "ser", past: "såg", supine: "sett", imperative: "se" },
  { infinitive: "veta", english: "to know (fact)", group: 4, groupLabel: "Group 4 (irregular)", present: "vet", past: "visste", supine: "vetat", imperative: "vet" },
  { infinitive: "säga", english: "to say", group: 4, groupLabel: "Group 4 (irregular)", present: "säger", past: "sa/sade", supine: "sagt", imperative: "säg", exampleSentence: "Vad säger du?" },
  { infinitive: "ge", english: "to give", group: 4, groupLabel: "Group 4 (irregular)", present: "ger", past: "gav", supine: "gett", imperative: "ge" },
  { infinitive: "bli", english: "to become", group: 4, groupLabel: "Group 4 (irregular)", present: "blir", past: "blev", supine: "blivit", imperative: "bli" },
  { infinitive: "äta", english: "to eat", group: 4, groupLabel: "Group 4 (irregular)", present: "äter", past: "åt", supine: "ätit", imperative: "ät", exampleSentence: "Vi äter middag klockan sex." },
  { infinitive: "dricka", english: "to drink", group: 4, groupLabel: "Group 4 (irregular)", present: "dricker", past: "drack", supine: "druckit", imperative: "drick" },
  { infinitive: "heta", english: "to be called", group: 4, groupLabel: "Group 4 (irregular)", present: "heter", past: "hette", supine: "hetat", imperative: "het" },
];

type Tense = "present" | "past" | "supine" | "imperative";
const tenses: { key: Tense; label: string; description: string }[] = [
  { key: "present", label: "Presens", description: "Present tense — what is happening now" },
  { key: "past", label: "Imperfekt", description: "Simple past — what happened" },
  { key: "supine", label: "Supinum", description: "Used with 'har' for perfect: jag har ___" },
  { key: "imperative", label: "Imperativ", description: "Commands: ___!" },
];

const groupColors = ["", "#2D8B4E", "#005B99", "#8B5A2B", "#6B3FA0"];
const groupBg = ["", "#E8F8EE", "#E8F4FD", "#FDF0E0", "#F0E8FD"];

interface DrillItem {
  verb: Verb;
  tense: Tense;
}

function buildDrillQueue(verbList: Verb[], tenseFilter: Tense | "all"): DrillItem[] {
  const items: DrillItem[] = [];
  const tensesToDrill = tenseFilter === "all"
    ? tenses.map(t => t.key)
    : [tenseFilter];
  for (const verb of verbList) {
    for (const tense of tensesToDrill) {
      items.push({ verb, tense });
    }
  }
  return items.sort(() => Math.random() - 0.5);
}

export default function VerbConjugationPage() {
  const [selectedGroup, setSelectedGroup] = useState<number | "all">("all");
  const [selectedTense, setSelectedTense] = useState<Tense | "all">("all");
  const [drillQueue, setDrillQueue] = useState<DrillItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [selectedVerb, setSelectedVerb] = useState<Verb | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build drill queue on filter change
  useEffect(() => {
    const filtered = selectedGroup === "all"
      ? verbs
      : verbs.filter(v => v.group === selectedGroup);
    const queue = buildDrillQueue(filtered, selectedTense);
    setDrillQueue(queue);
    setCurrentIdx(0);
    setUserAnswer("");
    setResult(null);
    setShowTable(false);
  }, [selectedGroup, selectedTense]);

  const currentDrill = drillQueue[currentIdx];

  function handleCheck() {
    if (!userAnswer.trim() || !currentDrill) return;
    const correct = currentDrill.verb[currentDrill.tense];
    const isCorrect = userAnswer.trim().toLowerCase() === correct.toLowerCase() ||
      correct.split("/").map(s => s.trim()).some(c => userAnswer.trim().toLowerCase() === c.toLowerCase());

    setResult(isCorrect ? "correct" : "wrong");
    setSessionStats(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      return {
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
    });
  }

  function handleNext() {
    setCurrentIdx(prev => (prev + 1) % drillQueue.length);
    setUserAnswer("");
    setResult(null);
    setShowTable(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (result) handleNext();
      else handleCheck();
    }
  }

  const tenseInfo = tenses.find(t => t.key === currentDrill?.tense);
  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : 0;

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
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
            🔤 Verbkonjugation
          </h1>
          <p style={{ color: "var(--text-light)" }}>
            Master all 4 Swedish verb groups. Type the correct conjugated form!
          </p>
        </div>

        {/* Verb Group Reference Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "24px" }}>
          {[1, 2, 3, 4].map(g => (
            <div key={g} style={{
              background: selectedGroup === g ? groupColors[g] : "white",
              color: selectedGroup === g ? "white" : "var(--text)",
              border: `2px solid ${groupColors[g]}`,
              borderRadius: "10px", padding: "14px 16px", cursor: "pointer",
              transition: "all 0.2s",
            }} onClick={() => setSelectedGroup(selectedGroup === g ? "all" : g as 1 | 2 | 3 | 4)}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>
                Grupp {g}
              </div>
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
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-light)", alignSelf: "center" }}>Tense:</span>
          <button
            onClick={() => setSelectedTense("all")}
            style={{
              padding: "6px 14px", borderRadius: "16px", border: "2px solid",
              borderColor: selectedTense === "all" ? "var(--blue)" : "var(--warm-dark)",
              background: selectedTense === "all" ? "var(--blue)" : "white",
              color: selectedTense === "all" ? "white" : "var(--text)",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
            }}
          >All tenses</button>
          {tenses.map(t => (
            <button key={t.key}
              onClick={() => setSelectedTense(t.key)}
              style={{
                padding: "6px 14px", borderRadius: "16px", border: "2px solid",
                borderColor: selectedTense === t.key ? "var(--forest)" : "var(--warm-dark)",
                background: selectedTense === t.key ? "var(--forest)" : "white",
                color: selectedTense === t.key ? "white" : "var(--text)",
                fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Stats Row */}
        <div style={{
          display: "flex", gap: "20px", padding: "12px 20px",
          background: "white", borderRadius: "10px", marginBottom: "24px",
          boxShadow: "var(--shadow)", fontSize: "0.85rem", flexWrap: "wrap",
        }}>
          <span>✅ <strong>{sessionStats.correct}</strong> / {sessionStats.total}</span>
          <span>🎯 <strong>{accuracy}%</strong> accuracy</span>
          <span>🔥 <strong>{sessionStats.streak}</strong> streak</span>
          <span>⚡ Best: <strong>{sessionStats.bestStreak}</strong></span>
        </div>

        {/* Drill Card */}
        {currentDrill && (
          <div style={{ background: "white", borderRadius: "16px", padding: "36px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>

            {/* Tense label */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <span style={{
                  background: groupBg[currentDrill.verb.group],
                  color: groupColors[currentDrill.verb.group],
                  padding: "4px 12px", borderRadius: "12px",
                  fontSize: "0.78rem", fontWeight: 700, marginRight: "8px",
                }}>
                  {currentDrill.verb.groupLabel}
                </span>
                <span style={{
                  background: "var(--forest-light)", color: "var(--forest)",
                  padding: "4px 12px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700,
                }}>
                  {tenseInfo?.label}
                </span>
              </div>
              <span style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>
                {currentIdx + 1} / {drillQueue.length}
              </span>
            </div>

            {/* Tense description */}
            <div style={{ fontSize: "0.82rem", color: "var(--text-light)", marginBottom: "20px" }}>
              {tenseInfo?.description}
              {currentDrill.tense === "supine" && (
                <span style={{ color: "var(--forest)", fontWeight: 600 }}> → "Jag har ___"</span>
              )}
            </div>

            {/* Question */}
            <div style={{
              background: "var(--blue-light)", borderRadius: "12px",
              padding: "24px", marginBottom: "24px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-light)", marginBottom: "8px", fontWeight: 600 }}>
                Conjugate in {tenseInfo?.label}:
              </div>
              <div style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "2.2rem", color: "var(--blue-dark)", marginBottom: "6px",
              }}>
                {currentDrill.verb.infinitive}
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-light)" }}>
                "{currentDrill.verb.english}"
              </div>
            </div>

            {/* Input */}
            <div style={{ marginBottom: "16px" }}>
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!!result}
                placeholder={`Type the ${tenseInfo?.label} form... (Enter to check)`}
                autoFocus
                style={{
                  width: "100%", padding: "14px 18px",
                  border: result
                    ? result === "correct" ? "2px solid var(--correct)" : "2px solid var(--wrong)"
                    : "2px solid var(--warm-dark)",
                  borderRadius: "8px", fontFamily: "'Outfit', sans-serif",
                  fontSize: "1.1rem", fontWeight: 600,
                  background: result === "correct" ? "var(--correct-bg)" : result === "wrong" ? "var(--wrong-bg)" : "white",
                  outline: "none", transition: "border-color 0.2s",
                  textAlign: "center",
                }}
              />
            </div>

            {/* Result feedback */}
            {result && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: "8px", marginBottom: "12px",
                  background: result === "correct" ? "var(--correct-bg)" : "var(--wrong-bg)",
                  color: result === "correct" ? "var(--correct)" : "var(--wrong)",
                  fontWeight: 700, fontSize: "1rem",
                }}>
                  {result === "correct" ? "✅ Rätt! (Correct!)" : `❌ Fel! The answer is: ${currentDrill.verb[currentDrill.tense]}`}
                </div>

                {/* Show full conjugation table on wrong */}
                {currentDrill.verb.exampleSentence && (
                  <div style={{ fontSize: "0.88rem", color: "var(--text-light)", marginBottom: "10px" }}>
                    📝 Example: <em style={{ color: "var(--blue-dark)" }}>{currentDrill.verb.exampleSentence}</em>
                  </div>
                )}

                <button
                  onClick={() => setShowTable(!showTable)}
                  style={{
                    background: "none", border: "none", fontSize: "0.85rem",
                    color: "var(--blue)", cursor: "pointer", textDecoration: "underline", padding: 0,
                  }}
                >
                  {showTable ? "Hide" : "Show"} full conjugation table
                </button>

                {showTable && (
                  <div style={{ marginTop: "12px", background: "var(--warm)", borderRadius: "10px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Infinitiv", "Presens", "Imperfekt", "Supinum", "Imperativ"].map(h => (
                            <th key={h} style={{ padding: "8px 12px", background: "var(--warm-dark)", fontSize: "0.75rem", textAlign: "left", fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {[currentDrill.verb.infinitive, currentDrill.verb.present, currentDrill.verb.past, currentDrill.verb.supine, currentDrill.verb.imperative].map((val, i) => (
                            <td key={i} style={{
                              padding: "10px 12px", fontSize: "0.9rem", fontWeight: 600,
                              background: i - 1 === ["present", "past", "supine", "imperative"].indexOf(currentDrill.tense) ? "var(--yellow-light)" : "white",
                              color: "var(--blue-dark)",
                            }}>{val}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              {!result ? (
                <button
                  onClick={handleCheck}
                  disabled={!userAnswer.trim()}
                  style={{
                    padding: "12px 32px", borderRadius: "8px",
                    background: userAnswer.trim() ? "var(--blue)" : "var(--warm-dark)",
                    color: userAnswer.trim() ? "white" : "var(--text-light)",
                    border: "none", fontWeight: 700, fontSize: "0.95rem",
                    cursor: userAnswer.trim() ? "pointer" : "default",
                  }}
                >
                  Kontrollera ✓
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  style={{
                    padding: "12px 32px", borderRadius: "8px",
                    background: "var(--blue)", color: "white",
                    border: "none", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
                  }}
                >
                  Nästa verb →
                </button>
              )}
              {/* Browse all verbs */}
              <button
                onClick={() => setSelectedVerb(selectedVerb ? null : currentDrill.verb)}
                style={{
                  padding: "12px 20px", borderRadius: "8px",
                  background: "white", border: "2px solid var(--warm-dark)",
                  fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
                }}
              >
                📋 All forms
              </button>
            </div>
          </div>
        )}

        {/* Verb Reference Table */}
        <div style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)" }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", marginBottom: "16px" }}>
            📖 Verb Reference Table
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "var(--warm)" }}>
                  {["Infinitiv", "English", "Grupp", "Presens", "Imperfekt", "Supinum", "Imperativ"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(selectedGroup === "all" ? verbs : verbs.filter(v => v.group === selectedGroup)).map((v, i) => (
                  <tr key={v.infinitive} style={{ borderBottom: "1px solid var(--warm-dark)", background: i % 2 === 0 ? "white" : "var(--warm)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--blue-dark)" }}>{v.infinitive}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text-light)" }}>{v.english}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: groupBg[v.group], color: groupColors[v.group], padding: "2px 8px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700 }}>
                        {v.group}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.present}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.past}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.supine}</td>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace" }}>{v.imperative}</td>
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
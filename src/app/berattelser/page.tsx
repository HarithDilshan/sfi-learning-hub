"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/LoadingSystem";
import { speak } from "@/lib/tts";
import { addXP, incrementStreak } from "@/lib/progress";
import { supabase } from "@/lib/supabase";
import { fetchStories, fetchStory, Story } from "@/service/storyService";


// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const levelColors: Record<string, string> = { A: "#2D8B4E", B: "#005B99", C: "#6B3FA0", D: "#C0392B" };
const levelBg:     Record<string, string> = { A: "#E8F8EE", B: "#E8F4FD", C: "#F0E8FD", D: "#FDEBEA" };
const XP_PER_CORRECT = 10;
const XP_COMPLETE_BONUS = 20;

// ─── LOCALSTORAGE HELPERS ────────────────────────────────────────────────────

const LS_READ      = "sfihub_read_stories";
const LS_BOOKMARKS = "sfihub_bookmarks";

function lsGet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function lsAdd(key: string, slug: string) {
  const arr = lsGet(key);
  if (!arr.includes(slug)) localStorage.setItem(key, JSON.stringify([...arr, slug]));
}
function lsRemove(key: string, slug: string) {
  localStorage.setItem(key, JSON.stringify(lsGet(key).filter(s => s !== slug)));
}
function lsHas(key: string, slug: string): boolean {
  return lsGet(key).includes(slug);
}

// ─── AI QUIZ FEEDBACK ────────────────────────────────────────────────────────

interface QuizFeedback {
  correct_explanation: string;   // Why the correct answer is right
  wrong_explanation:   string;   // Why the chosen answer was wrong (if wrong)
  grammar_note?:       string;   // Optional grammar/vocab note
}

async function getQuizFeedback(
  question: string,
  options: string[],
  correctIdx: number,
  chosenIdx: number,
  storyTitle: string,
  storyLevel: string
): Promise<QuizFeedback> {
  try {
    const isCorrect = chosenIdx === correctIdx;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 350,
        messages: [{
          role: "user",
          content: `You are helping an SFI (Swedish for Immigrants) level ${storyLevel} student understand a reading comprehension question.

Story: "${storyTitle}"
Question: "${question}"
Options: ${options.map((o, i) => `${i}) ${o}`).join(", ")}
Correct answer: option ${correctIdx} — "${options[correctIdx]}"
Student chose: option ${chosenIdx} — "${options[chosenIdx]}"
Student was: ${isCorrect ? "CORRECT" : "WRONG"}

Respond ONLY with JSON, no markdown:
{
  "correct_explanation": "<1-2 sentences explaining why '${options[correctIdx]}' is the right answer>",
  "wrong_explanation": "${isCorrect ? "Well done!" : `<1 sentence explaining why '${options[chosenIdx]}' is not correct>`}",
  "grammar_note": "<optional: if there's a relevant Swedish grammar or vocabulary point, mention it briefly — otherwise omit this key>"
}
Keep each field under 30 words. Write in English. Be encouraging.`,
        }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as QuizFeedback;
  } catch {
    return {
      correct_explanation: `The correct answer is "${options[correctIdx]}".`,
      wrong_explanation:   chosenIdx === correctIdx ? "Well done!" : `"${options[chosenIdx]}" is not supported by the text.`,
    };
  }
}

// ─── AI STORY GENERATOR ──────────────────────────────────────────────────────

interface GeneratedParagraph { swedish: string; english: string; }
interface GeneratedStory {
  title:       string;
  title_en:    string;
  description: string;
  emoji:       string;
  paragraphs:  GeneratedParagraph[];
  vocab:       { word: string; translation: string }[];
  questions:   { question: string; options: string[]; answer: number }[];
}

async function generateStory(
  level: string,
  topic: string,
  length: "short" | "medium" | "long",
  vocabWords: string
): Promise<GeneratedStory | null> {
  const paraCount = length === "short" ? 3 : length === "medium" ? 5 : 7;
  const vocabInstr = vocabWords.trim()
    ? `Try to naturally include these Swedish words: ${vocabWords}`
    : "Use vocabulary appropriate for this level.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Create a Swedish mini-story for SFI level ${level} students about the topic: "${topic}".

Requirements:
- Exactly ${paraCount} paragraphs
- Each paragraph: 3-5 sentences in Swedish, appropriate for level ${level}
- ${vocabInstr}
- 3 comprehension questions with 4 options each
- Extract 6-8 key vocabulary words from the story
- Level A = very simple present tense, basic vocabulary
- Level B = simple sentences, daily life topics
- Level C = more complex sentences, work/society topics  
- Level D = complex grammar, opinions, formal register

Respond ONLY with valid JSON, no markdown:
{
  "title": "<Swedish title>",
  "title_en": "<English title>",
  "description": "<1 sentence description in English>",
  "emoji": "<one relevant emoji>",
  "paragraphs": [
    { "swedish": "<Swedish text>", "english": "<English translation>" }
  ],
  "vocab": [
    { "word": "<Swedish word>", "translation": "<English>" }
  ],
  "questions": [
    { "question": "<question in Swedish>", "options": ["<opt0>","<opt1>","<opt2>","<opt3>"], "answer": <0-3> }
  ]
}`,
        }],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as GeneratedStory;
  } catch (err) {
    console.error("[MiniStories] generateStory:", err);
    return null;
  }
}

// ─── FLASHCARD COMPONENT ─────────────────────────────────────────────────────

function VocabFlashcards({ vocab }: { vocab: { word: string; translation: string }[] }) {
  const [idx, setIdx]       = useState(0);
  const [flipped, setFlip]  = useState(false);

  if (!vocab.length) return null;
  const card = vocab[idx];

  return (
    <div style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", marginBottom: "16px" }}>
        🃏 Vokabulär-flashkort
      </h3>
      <div style={{ textAlign: "center", marginBottom: "12px", fontSize: "0.82rem", color: "var(--text-light)" }}>
        {idx + 1} / {vocab.length}
      </div>
      {/* Card */}
      <div
        onClick={() => setFlip(f => !f)}
        style={{
          background: flipped ? "white" : "linear-gradient(135deg, var(--blue), var(--blue-dark))",
          border: flipped ? "2px solid var(--yellow)" : "none",
          borderRadius: "12px", padding: "40px 24px", textAlign: "center",
          cursor: "pointer", marginBottom: "16px", minHeight: "120px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {flipped ? (
          <>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--blue-dark)", marginBottom: "4px" }}>{card.translation}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>Click to flip back</div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", color: "white", marginBottom: "4px" }}>{card.word}</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)" }}>Click to reveal</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlip(false); }}
          disabled={idx === 0}
          style={{ padding: "8px 20px", borderRadius: "8px", border: "2px solid var(--warm-dark)", background: "white", cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.4 : 1, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
          ← Prev
        </button>
        <button onClick={() => speak(card.word)}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "var(--blue-light)", cursor: "pointer", fontSize: "0.9rem" }}>
          🔊
        </button>
        <button onClick={() => { setIdx(i => Math.min(vocab.length - 1, i + 1)); setFlip(false); }}
          disabled={idx === vocab.length - 1}
          style={{ padding: "8px 20px", borderRadius: "8px", border: "2px solid var(--warm-dark)", background: "white", cursor: idx === vocab.length - 1 ? "default" : "pointer", opacity: idx === vocab.length - 1 ? 0.4 : 1, fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── AI STORY GENERATOR PANEL ─────────────────────────────────────────────────

function AIStoryGenerator({ onStoryReady }: { onStoryReady: (s: GeneratedStory) => void }) {
  const [level, setLevel]         = useState("B");
  const [topic, setTopic]         = useState("");
  const [length, setLength]       = useState<"short"|"medium"|"long">("medium");
  const [vocabWords, setVocab]    = useState("");
  const [generating, setGen]      = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const topicSuggestions = ["En dag på jobbet", "Mat och matlagning", "Resor i Sverige", "Familjen", "Hälsa och sjukvård", "Bostadsmarknaden", "Vänner och fritid", "Skolan och utbildning"];

  async function handleGenerate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setError(null);
    setGen(true);
    const story = await generateStory(level, topic, length, vocabWords);
    setGen(false);
    if (story) onStoryReady(story);
    else setError("Could not generate story. Please try again.");
  }

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow-lg)", marginBottom: "24px", border: "2px solid var(--yellow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <span style={{ fontSize: "1.8rem" }}>✨</span>
        <div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", marginBottom: "2px" }}>AI Berättelsegenerator</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-light)", margin: 0 }}>Generate a custom Swedish story using AI</p>
        </div>
      </div>

      {/* Level */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>SFI Level</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {["A","B","C","D"].map(l => (
            <button key={l} onClick={() => setLevel(l)} style={{
              padding: "8px 20px", borderRadius: "8px", border: "2px solid",
              borderColor: level === l ? levelColors[l] : "var(--warm-dark)",
              background:  level === l ? levelBg[l] : "white",
              color:       level === l ? levelColors[l] : "var(--text)",
              fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}>Kurs {l}</button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>Topic / Ämne</label>
        <input
          value={topic} onChange={e => setTopic(e.target.value)}
          placeholder="e.g. En dag på jobbet, Att handla mat, Mitt hem..."
          style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--warm-dark)", borderRadius: "8px", fontFamily: "'Outfit', sans-serif", fontSize: "0.95rem", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--blue)")}
          onBlur={e => (e.target.style.borderColor = "var(--warm-dark)")}
        />
        {/* Topic suggestions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
          {topicSuggestions.map(s => (
            <button key={s} onClick={() => setTopic(s)} style={{
              padding: "4px 10px", borderRadius: "12px", border: "1px solid var(--warm-dark)",
              background: "var(--warm)", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Outfit', sans-serif",
              color: "var(--text-light)",
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>Story Length</label>
        <div style={{ display: "flex", gap: "8px" }}>
          {([["short","3 paragraphs"],["medium","5 paragraphs"],["long","7 paragraphs"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setLength(val)} style={{
              padding: "8px 16px", borderRadius: "8px", border: "2px solid",
              borderColor: length === val ? "var(--blue)" : "var(--warm-dark)",
              background:  length === val ? "var(--blue)" : "white",
              color:       length === val ? "white" : "var(--text)",
              fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", fontFamily: "'Outfit', sans-serif",
            }}>{val.charAt(0).toUpperCase() + val.slice(1)} <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>({label})</span></button>
          ))}
        </div>
      </div>

      {/* Vocab words */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "8px" }}>
          Specific vocabulary to include <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
        </label>
        <input
          value={vocabWords} onChange={e => setVocab(e.target.value)}
          placeholder="e.g. arbete, lägenhet, buss, familj..."
          style={{ width: "100%", padding: "12px 14px", border: "2px solid var(--warm-dark)", borderRadius: "8px", fontFamily: "'Outfit', sans-serif", fontSize: "0.95rem", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--blue)")}
          onBlur={e => (e.target.style.borderColor = "var(--warm-dark)")}
        />
      </div>

      {error && <div style={{ color: "var(--wrong)", fontSize: "0.88rem", marginBottom: "12px" }}>⚠️ {error}</div>}

      <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{
        width: "100%", padding: "14px", borderRadius: "10px",
        background: generating || !topic.trim() ? "var(--warm-dark)" : "var(--blue)",
        color: generating || !topic.trim() ? "var(--text-light)" : "white",
        border: "none", fontWeight: 700, fontSize: "1rem", cursor: generating || !topic.trim() ? "default" : "pointer",
        fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
      }}>
        {generating ? (
          <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Genererar berättelse...</>
        ) : (
          <>✨ Generera berättelse</>
        )}
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function MiniStoriesPage() {
  // List view state
  const [stories, setStories]             = useState<Omit<Story, "paragraphs"|"questions">[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [generatedStory, setGenerated]    = useState<GeneratedStory | null>(null);
  const [loadingList, setLoadingList]     = useState(true);
  const [loadingStory, setLoadingStory]   = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [showGenerator, setShowGenerator] = useState(false);

  // Reading state
  const [showTranslation, setShowTranslation] = useState<boolean[]>([]);
  const [fontSize, setFontSize]               = useState(16); // px
  const [readStories, setReadStories]         = useState<string[]>([]);
  const [bookmarks, setBookmarks]             = useState<string[]>([]);
  const [showBookmarksOnly, setBookmarksOnly] = useState(false);

  // Quiz state
  const [quizStarted, setQuizStarted]     = useState(false);
  const [quizAnswers, setQuizAnswers]     = useState<(number|null)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFeedback, setQuizFeedback]   = useState<(QuizFeedback|null)[]>([]);
  const [loadingFeedback, setLoadingFb]   = useState(false);
  const [xpEarned, setXpEarned]           = useState(0);

  // Flashcard tab
  const [activeTab, setActiveTab]         = useState<"story"|"flashcards">("story");

  const quizRef = useRef<HTMLDivElement>(null);

  // ─── Load localStorage on mount ───
  useEffect(() => {
    setReadStories(lsGet(LS_READ));
    setBookmarks(lsGet(LS_BOOKMARKS));
  }, []);

  // ─── Load story list ───
  useEffect(() => {
    setLoadingList(true);
    fetchStories(selectedLevel).then(data => {
      setStories(data);
      setLoadingList(false);
    });
  }, [selectedLevel]);

  // ─── Open a DB story ───
  async function openStory(slug: string) {
    setLoadingStory(true);
    setGenerated(null);
    const story = await fetchStory(slug);
    if (story) {
      setSelectedStory(story);
      initStoryState(story.paragraphs.length, story.questions.length);
      lsAdd(LS_READ, slug);
      setReadStories(lsGet(LS_READ));
    }
    setLoadingStory(false);
  }

  // ─── Open a generated story ───
  function openGeneratedStory(gs: GeneratedStory) {
    setGenerated(gs);
    setSelectedStory(null);
    initStoryState(gs.paragraphs.length, gs.questions.length);
    setShowGenerator(false);
    setActiveTab("story");
  }

  function initStoryState(paraLen: number, qLen: number) {
    setShowTranslation(new Array(paraLen).fill(false));
    setQuizStarted(false);
    setQuizAnswers(new Array(qLen).fill(null));
    setQuizSubmitted(false);
    setQuizFeedback(new Array(qLen).fill(null));
    setXpEarned(0);
    setActiveTab("story");
  }

  function closeStory() {
    setSelectedStory(null);
    setGenerated(null);
    setQuizStarted(false);
    setQuizAnswers([]);
    setQuizSubmitted(false);
    setQuizFeedback([]);
  }

  function toggleTranslation(idx: number) {
    setShowTranslation(prev => prev.map((v, i) => i === idx ? !v : v));
  }

  function toggleBookmark(slug: string) {
    if (lsHas(LS_BOOKMARKS, slug)) {
      lsRemove(LS_BOOKMARKS, slug);
    } else {
      lsAdd(LS_BOOKMARKS, slug);
    }
    setBookmarks(lsGet(LS_BOOKMARKS));
  }

  function handleQuizAnswer(qIdx: number, aIdx: number) {
    if (quizSubmitted) return;
    setQuizAnswers(prev => prev.map((v, i) => i === qIdx ? aIdx : v));
  }

  // ─── Submit quiz + get AI feedback ───
  async function submitQuiz() {
    if (!activeStory) return;
    setQuizSubmitted(true);
    setLoadingFb(true);

    const questions = activeStory.questions;
    const correct   = questions.filter((q, i) => quizAnswers[i] === q.answer).length;
    const xp        = correct * XP_PER_CORRECT + (correct === questions.length ? XP_COMPLETE_BONUS : 0);

    setXpEarned(xp);
    addXP(xp);
    if (correct === questions.length) incrementStreak();
    window.dispatchEvent(new Event("progress-update"));

    // Fetch AI feedback for all questions in parallel
    const feedbacks = await Promise.all(
      questions.map((q, i) =>
        getQuizFeedback(
          q.question,
          q.options,
          q.answer,
          quizAnswers[i] ?? 0,
          "title" in activeStory ? (activeStory as Story).title : (activeStory as GeneratedStory).title,
          "level" in activeStory ? (activeStory as Story).level : "B"
        )
      )
    );
    setQuizFeedback(feedbacks);
    setLoadingFb(false);

    // Auto-scroll to quiz
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  // ─── Scroll to quiz when started ───
  function startQuiz() {
    setQuizStarted(true);
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }

  // Unified active story (DB or generated)
  const activeStory: (Story | GeneratedStory) | null = selectedStory ?? generatedStory;

  // Vocab for flashcards — from highlight_words (DB) or vocab (generated)
  const flashVocab: { word: string; translation: string }[] = activeStory
    ? "paragraphs" in activeStory
      ? "highlight_words" in (activeStory.paragraphs[0] ?? {})
        ? (activeStory as Story).paragraphs.flatMap(p => p.highlight_words)
        : (activeStory as GeneratedStory).vocab
      : []
    : [];

  // word count helper
  const wordCount = (story: Story | GeneratedStory) =>
    "paragraphs" in story
      ? story.paragraphs.reduce((acc, p) => acc + ("swedish" in p ? p.swedish : "").split(/\s+/).length, 0)
      : 0;

  // Filtered list
  const displayedStories = showBookmarksOnly
    ? stories.filter(s => bookmarks.includes(s.slug))
    : stories;

  // ════════════════════════════════════════════════════════
  // STORY LIST VIEW
  // ════════════════════════════════════════════════════════
  if (!activeStory) {
    return (
      <>
        <Header />
        <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 20px" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
              <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
              <span>›</span><span>📖 Berättelser</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>📖 Mini-berättelser</h1>
                <p style={{ color: "var(--text-light)" }}>Short stories for each SFI level. Read, listen, and test your understanding.</p>
              </div>
              <button onClick={() => setShowGenerator(s => !s)} style={{
                padding: "10px 20px", borderRadius: "10px", border: "2px solid var(--yellow)",
                background: showGenerator ? "var(--yellow)" : "white",
                color: "var(--text)", fontWeight: 700, cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", fontSize: "0.9rem",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                ✨ {showGenerator ? "Hide Generator" : "AI Generator"}
              </button>
            </div>

            {/* AI Generator */}
            {showGenerator && (
              <AIStoryGenerator onStoryReady={openGeneratedStory} />
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
              {["all","A","B","C","D"].map(lvl => (
                <button key={lvl} onClick={() => setSelectedLevel(lvl)} style={{
                  padding: "6px 18px", borderRadius: "20px", border: "2px solid",
                  borderColor: selectedLevel === lvl ? "var(--blue)" : "var(--warm-dark)",
                  background:  selectedLevel === lvl ? "var(--blue)" : "white",
                  color:       selectedLevel === lvl ? "white" : "var(--text)",
                  fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                }}>
                  {lvl === "all" ? "Alla nivåer" : `Kurs ${lvl}`}
                </button>
              ))}
              <button onClick={() => setBookmarksOnly(b => !b)} style={{
                padding: "6px 18px", borderRadius: "20px", border: "2px solid",
                borderColor: showBookmarksOnly ? "var(--yellow-dark)" : "var(--warm-dark)",
                background:  showBookmarksOnly ? "var(--yellow-light)" : "white",
                color:       showBookmarksOnly ? "var(--yellow-dark)" : "var(--text)",
                fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                marginLeft: "auto",
              }}>
                🔖 Bookmarks {bookmarks.length > 0 && `(${bookmarks.length})`}
              </button>
            </div>

            {/* Stats bar */}
            {readStories.length > 0 && (
              <div style={{ background: "var(--correct-bg)", borderRadius: "10px", padding: "10px 16px", marginBottom: "20px", fontSize: "0.85rem", color: "var(--correct)", fontWeight: 600 }}>
                ✅ {readStories.length} {readStories.length === 1 ? "story" : "stories"} read so far!
              </div>
            )}

            {loadingList ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                <LoadingState type="exercise" message="Hämtar berättelser..." />
              </div>
            ) : displayedStories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-light)" }}>
                {showBookmarksOnly ? "No bookmarked stories yet. Click 🔖 on a story to bookmark it." : "Inga berättelser hittades för denna nivå."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {displayedStories.map(story => {
                  const isRead       = readStories.includes(story.slug);
                  const isBookmarked = bookmarks.includes(story.slug);
                  return (
                    <div key={story.id} style={{ position: "relative" }}>
                      {/* Bookmark button */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleBookmark(story.slug); }}
                        style={{
                          position: "absolute", top: "12px", right: "12px", zIndex: 2,
                          background: isBookmarked ? "var(--yellow)" : "var(--warm)",
                          border: "none", borderRadius: "8px", padding: "4px 8px",
                          cursor: "pointer", fontSize: "0.9rem",
                        }}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                      >{isBookmarked ? "🔖" : "🔖"}</button>

                      <div onClick={() => openStory(story.slug)} style={{
                        background: "white", borderRadius: "14px", padding: "28px",
                        cursor: "pointer", boxShadow: "var(--shadow)",
                        border: isRead ? "2px solid var(--correct)" : "1px solid rgba(0,0,0,0.06)",
                        transition: "all 0.25s", height: "100%",
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)"; }}
                      >
                        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{story.emoji}</div>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                          <span style={{ background: levelBg[story.level], color: levelColors[story.level], padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Kurs {story.level}
                          </span>
                          <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>
                            ⏱ {story.estimated_time}
                          </span>
                          {isRead && (
                            <span style={{ background: "var(--correct-bg)", color: "var(--correct)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700 }}>
                              ✅ Read
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>{story.title}</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "12px", lineHeight: 1.5 }}>{story.description}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {story.vocab_focus?.map(v => (
                            <span key={v} style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>{v}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <Footer />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  if (loadingStory) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="exercise" message="Hämtar berättelse..." />
        </div>
        <Footer />
      </>
    );
  }

  // ════════════════════════════════════════════════════════
  // STORY READING VIEW
  // ════════════════════════════════════════════════════════

  const isDbStory     = !!selectedStory;
  const storyTitle    = "title" in activeStory ? activeStory.title : "";
  const storyLevel    = "level" in activeStory ? (activeStory as Story).level : "B";
  const paragraphs    = activeStory.paragraphs;
  const questions     = activeStory.questions;
  const quizScore     = quizSubmitted ? questions.filter((q, i) => quizAnswers[i] === q.answer).length : 0;
  const wc            = wordCount(activeStory);

  return (
    <>
      <Header />
      <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 20px" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <span style={{ color: "var(--blue)", cursor: "pointer" }} onClick={closeStory}>Berättelser</span>
            <span>›</span>
            <span>{storyTitle}</span>
          </div>

          {/* Story Header */}
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
              <span style={{ fontSize: "3rem" }}>{"emoji" in activeStory ? activeStory.emoji : "📖"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <span style={{ background: levelBg[storyLevel], color: levelColors[storyLevel], padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700 }}>
                    Kurs {storyLevel}
                  </span>
                  {"estimated_time" in activeStory && (
                    <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem" }}>
                      ⏱ {(activeStory as Story).estimated_time}
                    </span>
                  )}
                  {wc > 0 && (
                    <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem" }}>
                      📝 ~{wc} words
                    </span>
                  )}
                  {!isDbStory && (
                    <span style={{ background: "var(--yellow-light)", color: "var(--yellow-dark)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700 }}>
                      ✨ AI Generated
                    </span>
                  )}
                </div>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", marginBottom: "4px" }}>{storyTitle}</h1>
                {"title_en" in activeStory && <p style={{ color: "var(--text-light)", fontSize: "0.9rem", margin: 0 }}>{(activeStory as any).title_en}</p>}
              </div>
            </div>

            {/* Font size + tip */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ background: "var(--yellow-light)", borderRadius: "10px", padding: "10px 14px", fontSize: "0.82rem", flex: 1 }}>
                💡 Highlighted words show translations on hover. Use 🔊 to listen to each paragraph.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-light)", fontWeight: 600 }}>Text:</span>
                <button onClick={() => setFontSize(s => Math.max(12, s - 2))}
                  style={{ width: "30px", height: "30px", borderRadius: "6px", border: "2px solid var(--warm-dark)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>A-</button>
                <button onClick={() => setFontSize(s => Math.min(24, s + 2))}
                  style={{ width: "30px", height: "30px", borderRadius: "6px", border: "2px solid var(--warm-dark)", background: "white", cursor: "pointer", fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>A+</button>
              </div>
            </div>
          </div>

          {/* Tab switcher — story vs flashcards */}
          {flashVocab.length > 0 && (
            <div style={{ display: "flex", gap: "0", marginBottom: "20px", background: "white", borderRadius: "10px", padding: "4px", boxShadow: "var(--shadow)" }}>
              {(["story","flashcards"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  background: activeTab === tab ? "var(--blue)" : "transparent",
                  color:      activeTab === tab ? "white" : "var(--text-light)",
                  fontWeight: 700, cursor: "pointer", fontSize: "0.88rem", fontFamily: "'Outfit', sans-serif",
                  transition: "all 0.2s",
                }}>
                  {tab === "story" ? "📖 Berättelse" : "🃏 Flashkort"}
                </button>
              ))}
            </div>
          )}

          {/* Flashcards tab */}
          {activeTab === "flashcards" && (
            <VocabFlashcards vocab={flashVocab} />
          )}

          {/* Story tab */}
          {activeTab === "story" && (
            <>
              {/* Paragraphs */}
              {paragraphs.map((para, idx) => {
                const swText = "swedish" in para ? para.swedish : (para as any).swedish ?? "";
                const enText = "english" in para ? para.english : (para as any).english ?? "";
                const highlights: { word: string; translation: string }[] =
                  "highlight_words" in para ? (para as any).highlight_words : [];

                return (
                  <div key={idx} style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Stycke {idx + 1}
                      </span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => speak(swText)} style={{ background: "var(--blue-light)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, color: "var(--blue)" }}>
                          🔊 Lyssna
                        </button>
                        <button onClick={() => toggleTranslation(idx)} style={{
                          background: showTranslation[idx] ? "var(--forest-light)" : "var(--warm)",
                          border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600,
                          color: showTranslation[idx] ? "var(--forest)" : "var(--text-light)",
                        }}>
                          {showTranslation[idx] ? "🙈 Hide" : "👁 Translate"}
                        </button>
                      </div>
                    </div>

                    {/* Swedish text with highlights */}
                    <p style={{ fontSize: `${fontSize}px`, lineHeight: 1.8, marginBottom: "12px" }}>
                      {(() => {
                        const parts: React.ReactNode[] = [];
                        let lastIdx = 0;
                        const sorted = highlights
                          .map(hw => ({ ...hw, pos: swText.toLowerCase().indexOf(hw.word.toLowerCase()) }))
                          .filter(hw => hw.pos !== -1)
                          .sort((a, b) => a.pos - b.pos);
                        for (const hw of sorted) {
                          const pos = swText.toLowerCase().indexOf(hw.word.toLowerCase(), lastIdx);
                          if (pos === -1) continue;
                          parts.push(swText.slice(lastIdx, pos));
                          parts.push(
                            <span key={pos} title={hw.translation} style={{ background: "var(--yellow-light)", borderBottom: "2px solid var(--yellow-dark)", cursor: "help", borderRadius: "2px", padding: "0 2px" }}>
                              {swText.slice(pos, pos + hw.word.length)}
                            </span>
                          );
                          lastIdx = pos + hw.word.length;
                        }
                        parts.push(swText.slice(lastIdx));
                        return parts;
                      })()}
                    </p>

                    {highlights.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                        {highlights.map(hw => (
                          <span key={hw.word} style={{ background: "var(--warm)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.78rem" }}>
                            <strong style={{ color: "var(--blue-dark)" }}>{hw.word}</strong>
                            <span style={{ color: "var(--text-light)" }}> = {hw.translation}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {showTranslation[idx] && (
                      <div style={{ background: "var(--forest-light)", borderRadius: "8px", padding: "14px 16px", borderLeft: "3px solid var(--forest)", fontSize: `${fontSize - 2}px`, color: "var(--forest)", lineHeight: 1.6, fontStyle: "italic" }}>
                        {enText}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quiz prompt */}
              {!quizStarted ? (
                <div ref={quizRef} style={{ background: "var(--blue-light)", borderRadius: "14px", padding: "28px", textAlign: "center", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>❓</div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Test Your Understanding</h3>
                  <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
                    Answer {questions.length} questions. Earn up to <strong>{questions.length * XP_PER_CORRECT + XP_COMPLETE_BONUS} XP</strong> for a perfect score!
                  </p>
                  <button onClick={startQuiz} style={{ padding: "12px 32px", background: "var(--blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
                    Starta quiz →
                  </button>
                </div>
              ) : (
                <div ref={quizRef} style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)" }}>
                  <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", marginBottom: "20px" }}>📝 Förståelsefrågor</h3>

                  {questions.map((q, qi) => (
                    <div key={qi} style={{ marginBottom: "28px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
                        {qi + 1}. {q.question}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                        {q.options.map((opt, oi) => {
                          const isSelected = quizAnswers[qi] === oi;
                          const isCorrect  = quizSubmitted && oi === q.answer;
                          const isWrong    = quizSubmitted && isSelected && oi !== q.answer;
                          return (
                            <button key={oi} onClick={() => handleQuizAnswer(qi, oi)}
                              disabled={quizSubmitted}
                              style={{
                                padding: "10px 14px", borderRadius: "8px",
                                border: `2px solid ${isCorrect ? "var(--correct)" : isWrong ? "var(--wrong)" : isSelected ? "var(--blue)" : "var(--warm-dark)"}`,
                                background: isCorrect ? "var(--correct-bg)" : isWrong ? "var(--wrong-bg)" : isSelected ? "var(--blue-light)" : "var(--warm)",
                                fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
                                fontWeight: isSelected || isCorrect ? 700 : 400,
                                cursor: quizSubmitted ? "default" : "pointer",
                                textAlign: "left", transition: "all 0.15s",
                              }}>
                              {isCorrect && "✅ "}{isWrong && "❌ "}{opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* AI Feedback per question */}
                      {quizSubmitted && (
                        loadingFeedback ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "var(--blue-light)", borderRadius: "8px", fontSize: "0.82rem", color: "var(--blue)" }}>
                            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                            AI förklarar...
                          </div>
                        ) : quizFeedback[qi] && (
                          <div style={{ background: quizAnswers[qi] === q.answer ? "var(--correct-bg)" : "var(--wrong-bg)", borderRadius: "10px", padding: "14px 16px", borderLeft: `4px solid ${quizAnswers[qi] === q.answer ? "var(--correct)" : "var(--wrong)"}` }}>
                            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: quizAnswers[qi] === q.answer ? "var(--correct)" : "var(--wrong)", marginBottom: "8px" }}>
                              🤖 AI Förklaring
                            </div>
                            <p style={{ fontSize: "0.88rem", margin: "0 0 6px", lineHeight: 1.5 }}>
                              ✅ {quizFeedback[qi]!.correct_explanation}
                            </p>
                            {quizAnswers[qi] !== q.answer && (
                              <p style={{ fontSize: "0.88rem", margin: "0 0 6px", lineHeight: 1.5 }}>
                                ❌ {quizFeedback[qi]!.wrong_explanation}
                              </p>
                            )}
                            {quizFeedback[qi]!.grammar_note && (
                              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--blue)", fontWeight: 600 }}>
                                📚 {quizFeedback[qi]!.grammar_note}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button onClick={submitQuiz}
                      disabled={quizAnswers.some(a => a === null)}
                      style={{
                        padding: "12px 28px",
                        background: quizAnswers.some(a => a === null) ? "var(--warm-dark)" : "var(--blue)",
                        color: quizAnswers.some(a => a === null) ? "var(--text-light)" : "white",
                        border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem",
                        cursor: quizAnswers.some(a => a === null) ? "default" : "pointer",
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                      Lämna in svar
                    </button>
                  ) : (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <div style={{
                        fontSize: "2.5rem", fontWeight: 800, marginBottom: "8px",
                        color: quizScore === questions.length ? "var(--correct)" : quizScore >= questions.length / 2 ? "var(--yellow-dark)" : "var(--wrong)",
                      }}>
                        {quizScore} / {questions.length}
                      </div>
                      {xpEarned > 0 && (
                        <div style={{ background: "var(--yellow-light)", borderRadius: "10px", padding: "8px 20px", display: "inline-block", marginBottom: "12px", fontWeight: 700, color: "var(--yellow-dark)", fontSize: "0.95rem" }}>
                          ⭐ +{xpEarned} XP earned!
                          {quizScore === questions.length && " 🎉 Perfect score bonus!"}
                        </div>
                      )}
                      <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "20px" }}>
                        {quizScore === questions.length ? "Perfekt! Utmärkt läsförståelse!" : quizScore >= questions.length / 2 ? "👍 Bra jobbat!" : "Läs berättelsen igen och försök!"}
                      </div>
                      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                        {flashVocab.length > 0 && (
                          <button onClick={() => setActiveTab("flashcards")} style={{ padding: "10px 20px", background: "var(--yellow)", color: "var(--text)", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
                            🃏 Practice flashcards
                          </button>
                        )}
                        <button onClick={closeStory} style={{ padding: "10px 24px", background: "var(--blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'Outfit', sans-serif" }}>
                          ← Fler berättelser
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Footer />
    </>
  );
}
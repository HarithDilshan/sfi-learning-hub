"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/LoadingSystem";
import { speak } from "@/lib/tts";
import {
  fetchStories,
  fetchStory,
  Story,
} from "@/service/storyService";

const levelColors: Record<string, string> = { A: "#2D8B4E", B: "#005B99", C: "#6B3FA0", D: "#C0392B" };
const levelBg: Record<string, string>     = { A: "#E8F8EE", B: "#E8F4FD", C: "#F0E8FD", D: "#FDEBEA" };

export default function MiniStoriesPage() {
  const [stories, setStories]               = useState<Omit<Story, "paragraphs" | "questions">[]>([]);
  const [selectedStory, setSelectedStory]   = useState<Story | null>(null);
  const [loadingList, setLoadingList]       = useState(true);
  const [loadingStory, setLoadingStory]     = useState(false);
  const [selectedLevel, setSelectedLevel]   = useState("all");

  // Quiz state
  const [quizStarted, setQuizStarted]       = useState(false);
  const [quizAnswers, setQuizAnswers]       = useState<(number | null)[]>([]);
  const [quizSubmitted, setQuizSubmitted]   = useState(false);

  // Reading state
  const [showTranslation, setShowTranslation] = useState<boolean[]>([]);

  // ─── Load story list ───
  useEffect(() => {
    setLoadingList(true);
    fetchStories(selectedLevel).then((data) => {
      setStories(data);
      setLoadingList(false);
    });
  }, [selectedLevel]);

  // ─── Open a story ───
  async function openStory(slug: string) {
    setLoadingStory(true);
    const story = await fetchStory(slug);
    if (story) {
      setSelectedStory(story);
      setShowTranslation(new Array(story.paragraphs.length).fill(false));
      setQuizStarted(false);
      setQuizAnswers(new Array(story.questions.length).fill(null));
      setQuizSubmitted(false);
    }
    setLoadingStory(false);
  }

  function closeStory() {
    setSelectedStory(null);
    setQuizStarted(false);
    setQuizAnswers([]);
    setQuizSubmitted(false);
  }

  function toggleTranslation(idx: number) {
    setShowTranslation((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  }

  function handleQuizAnswer(qIdx: number, aIdx: number) {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => prev.map((v, i) => (i === qIdx ? aIdx : v)));
  }

  // ══════════════════════════════════════════════════
  // STORY LIST VIEW
  // ══════════════════════════════════════════════════
  if (!selectedStory) {
    return (
      <>
        <Header />
        <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>

            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
              <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
              <span>›</span>
              <span>📖 Berättelser</span>
            </div>

            <div style={{ marginBottom: "28px" }}>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
                📖 Mini-berättelser
              </h1>
              <p style={{ color: "var(--text-light)" }}>
                Short stories using vocabulary from each SFI level. Hover over highlighted words to see translations.
              </p>
            </div>

            {/* Level filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
              {["all", "A", "B", "C", "D"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  style={{
                    padding: "6px 18px", borderRadius: "20px", border: "2px solid",
                    borderColor: selectedLevel === lvl ? "var(--blue)" : "var(--warm-dark)",
                    background: selectedLevel === lvl ? "var(--blue)" : "white",
                    color: selectedLevel === lvl ? "white" : "var(--text)",
                    fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                  }}
                >
                  {lvl === "all" ? "Alla nivåer" : `Kurs ${lvl}`}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loadingList ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                <LoadingState type="exercise" message="Hämtar berättelser..." />
              </div>
            ) : stories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-light)" }}>
                Inga berättelser hittades för denna nivå.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {stories.map((story) => (
                  <div
                    key={story.id}
                    onClick={() => openStory(story.slug)}
                    style={{
                      background: "white", borderRadius: "14px", padding: "28px",
                      cursor: "pointer", boxShadow: "var(--shadow)",
                      border: "1px solid rgba(0,0,0,0.06)", transition: "all 0.25s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)";
                    }}
                  >
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{story.emoji}</div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                      <span style={{ background: levelBg[story.level], color: levelColors[story.level], padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700 }}>
                        Kurs {story.level}
                      </span>
                      <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>
                        ⏱ {story.estimated_time}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>{story.title}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "12px", lineHeight: 1.5 }}>{story.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {story.vocab_focus.map((v) => (
                        <span key={v} style={{ background: "var(--warm)", color: "var(--text-light)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.75rem" }}>{v}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // ══════════════════════════════════════════════════
  // STORY LOADING STATE
  // ══════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════
  // STORY READING VIEW
  // ══════════════════════════════════════════════════
  const story = selectedStory;
  const quizScore = quizSubmitted
    ? story.questions.filter((q, i) => quizAnswers[i] === q.answer).length
    : 0;

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
            <span>{story.title}</span>
          </div>

          {/* Story Header */}
          <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
              <span style={{ fontSize: "3rem" }}>{story.emoji}</span>
              <div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ background: levelBg[story.level], color: levelColors[story.level], padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 700 }}>
                    Kurs {story.level}
                  </span>
                  <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 12px", borderRadius: "12px", fontSize: "0.8rem" }}>
                    ⏱ {story.estimated_time}
                  </span>
                </div>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", marginBottom: "4px" }}>{story.title}</h1>
                <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>{story.title_en}</p>
              </div>
            </div>
            <div style={{ background: "var(--yellow-light)", borderRadius: "10px", padding: "12px 16px", fontSize: "0.85rem" }}>
              💡 <strong>Tip:</strong> Highlighted words show translations on hover. Use 🔊 to hear each paragraph. Click "Translate" to see the English version.
            </div>
          </div>

          {/* Paragraphs */}
          {story.paragraphs.map((para, idx) => (
            <div key={para.id} style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Stycke {idx + 1}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => speak(para.swedish)} style={{ background: "var(--blue-light)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, color: "var(--blue)" }}>
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
              <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "12px" }}>
                {(() => {
                  const text = para.swedish;
                  const parts: React.ReactNode[] = [];
                  let lastIdx = 0;
                  const highlights = para.highlight_words
                    .map((hw) => ({ ...hw, pos: text.toLowerCase().indexOf(hw.word.toLowerCase()) }))
                    .filter((hw) => hw.pos !== -1)
                    .sort((a, b) => a.pos - b.pos);

                  for (const hw of highlights) {
                    const pos = text.toLowerCase().indexOf(hw.word.toLowerCase(), lastIdx);
                    if (pos === -1) continue;
                    parts.push(text.slice(lastIdx, pos));
                    parts.push(
                      <span key={pos} title={hw.translation} style={{ background: "var(--yellow-light)", borderBottom: "2px solid var(--yellow-dark)", cursor: "help", borderRadius: "2px", padding: "0 2px" }}>
                        {text.slice(pos, pos + hw.word.length)}
                      </span>
                    );
                    lastIdx = pos + hw.word.length;
                  }
                  parts.push(text.slice(lastIdx));
                  return parts;
                })()}
              </p>

              {/* Vocab legend */}
              {para.highlight_words.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {para.highlight_words.map((hw) => (
                    <span key={hw.word} style={{ background: "var(--warm)", padding: "3px 10px", borderRadius: "10px", fontSize: "0.78rem" }}>
                      <strong style={{ color: "var(--blue-dark)" }}>{hw.word}</strong>
                      <span style={{ color: "var(--text-light)" }}> = {hw.translation}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* English translation */}
              {showTranslation[idx] && (
                <div style={{ background: "var(--forest-light)", borderRadius: "8px", padding: "14px 16px", borderLeft: "3px solid var(--forest)", fontSize: "0.92rem", color: "var(--forest)", lineHeight: 1.6, fontStyle: "italic" }}>
                  {para.english}
                </div>
              )}
            </div>
          ))}

          {/* Comprehension Quiz */}
          {!quizStarted ? (
            <div style={{ background: "var(--blue-light)", borderRadius: "14px", padding: "28px", textAlign: "center", boxShadow: "var(--shadow)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>❓</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>Test Your Understanding</h3>
              <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
                Answer {story.questions.length} questions about what you just read.
              </p>
              <button onClick={() => setQuizStarted(true)} style={{ padding: "12px 32px", background: "var(--blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
                Starta quiz →
              </button>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: "14px", padding: "28px", boxShadow: "var(--shadow)" }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.3rem", marginBottom: "20px" }}>📝 Förståelsefrågor</h3>
              {story.questions.map((q, qi) => (
                <div key={q.id} style={{ marginBottom: "24px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "0.95rem" }}>
                    {qi + 1}. {q.question}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {q.options.map((opt, oi) => {
                      const isSelected = quizAnswers[qi] === oi;
                      const isCorrect  = quizSubmitted && oi === q.answer;
                      const isWrong    = quizSubmitted && isSelected && oi !== q.answer;
                      return (
                        <button
                          key={oi}
                          onClick={() => handleQuizAnswer(qi, oi)}
                          disabled={quizSubmitted}
                          style={{
                            padding: "10px 14px", borderRadius: "8px",
                            border: `2px solid ${isCorrect ? "var(--correct)" : isWrong ? "var(--wrong)" : isSelected ? "var(--blue)" : "var(--warm-dark)"}`,
                            background: isCorrect ? "var(--correct-bg)" : isWrong ? "var(--wrong-bg)" : isSelected ? "var(--blue-light)" : "var(--warm)",
                            fontFamily: "'Outfit', sans-serif", fontSize: "0.88rem",
                            fontWeight: isSelected || isCorrect ? 700 : 400,
                            cursor: quizSubmitted ? "default" : "pointer",
                            textAlign: "left", transition: "all 0.15s",
                          }}
                        >
                          {isCorrect && "✅ "}{isWrong && "❌ "}{opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!quizSubmitted ? (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={quizAnswers.some((a) => a === null)}
                  style={{
                    padding: "12px 28px",
                    background: quizAnswers.some((a) => a === null) ? "var(--warm-dark)" : "var(--blue)",
                    color: quizAnswers.some((a) => a === null) ? "var(--text-light)" : "white",
                    border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.95rem",
                    cursor: quizAnswers.some((a) => a === null) ? "default" : "pointer",
                  }}
                >
                  Lämna in svar
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{
                    fontSize: "2.5rem", fontWeight: 800, marginBottom: "8px",
                    color: quizScore === story.questions.length ? "var(--correct)" : quizScore >= story.questions.length / 2 ? "var(--yellow-dark)" : "var(--wrong)",
                  }}>
                    {quizScore} / {story.questions.length}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>
                    {quizScore === story.questions.length ? "🎉 Perfekt! Utmärkt läsförståelse!" : quizScore >= story.questions.length / 2 ? "👍 Bra jobbat!" : "Läs berättelsen igen och försök!"}
                  </div>
                  <button onClick={closeStory} style={{ padding: "10px 24px", background: "var(--blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
                    ← Fler berättelser
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
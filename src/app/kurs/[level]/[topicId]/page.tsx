"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VocabTable from "@/components/VocabTable";
import Dialogue from "@/components/Dialogue";
import GrammarBox from "@/components/GrammarBox";
import ExercisePanel from "@/components/ExercisePanel";
import Flashcards from "@/components/Flashcards";
import { courseData } from "@/data";
import { LevelKey } from "@/data/types";

const sections = [
  { key: "vocabulary", label: "📚 Vocabulary" },
  { key: "dialogue", label: "💬 Dialogue" },
  { key: "grammar", label: "📐 Grammar" },
  { key: "exercises", label: "✏️ Exercises" },
  { key: "flashcards", label: "🃏 Flashcards" },
];

export default function TopicPage() {
  const params = useParams();
  const level = params.level as string;
  const topicId = params.topicId as string;
  const [activeSection, setActiveSection] = useState("vocabulary");

  const data = courseData[level as LevelKey];
  const topic = data?.topics.find((t) => t.id === topicId);

  if (!data || !topic) {
    return (
      <>
        <Header />
        <div className="max-w-[1100px] mx-auto px-8 py-20 text-center">
          <h2 className="text-2xl mb-4">Topic not found</h2>
          <Link href={`/kurs/${level}`} style={{ color: "var(--blue)" }}>← Back to Kurs {level}</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 pb-20 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <Link href={`/kurs/${level}`} className="no-underline" style={{ color: "var(--blue)" }}>Kurs {level}</Link>
          <span>›</span>
          <span>{topic.title}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar */}
          <div className="bg-white rounded-xl p-6 md:sticky md:top-[110px]" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-light)" }}>Sections</h3>
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer mb-1 text-left ${
                  activeSection === s.key
                    ? "bg-[var(--blue-light)] text-[var(--blue)] font-semibold"
                    : "hover:bg-[var(--warm)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl p-6 md:p-10 min-h-[500px]" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {activeSection === "vocabulary" && (
              <>
                <h2 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>{topic.title}</h2>
                <p className="mb-8" style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>Learn the key words and phrases for this topic.</p>
                <VocabTable words={topic.vocab} />
                <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--yellow-light)" }}>
                  <span className="text-xl flex-shrink-0">🔊</span>
                  <p className="text-sm leading-relaxed"><strong>Tip:</strong> Click the speaker icon to hear the pronunciation. Practice saying each word out loud!</p>
                </div>
              </>
            )}

            {activeSection === "dialogue" && (
              <>
                <h2 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Dialogue Practice</h2>
                <p className="mb-8" style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>Read and listen to this conversation. Click 🔊 to hear each line.</p>
                {topic.dialogue ? (
                  <>
                    <Dialogue lines={topic.dialogue} />
                    <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--yellow-light)" }}>
                      <span className="text-xl flex-shrink-0">🎭</span>
                      <p className="text-sm leading-relaxed"><strong>Practice tip:</strong> Try reading the Swedish lines out loud! Cover the English translation and see how much you understand.</p>
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--text-light)" }}>No dialogue available for this lesson yet. Try the vocabulary or exercises!</p>
                )}
              </>
            )}

            {activeSection === "grammar" && (
              <>
                <h2 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Grammar</h2>
                <p className="mb-8" style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>Key grammar rules for this topic.</p>
                {topic.grammar ? (
                  <>
                    <GrammarBox grammar={topic.grammar} />
                    <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--yellow-light)" }}>
                      <span className="text-xl flex-shrink-0">📝</span>
                      <p className="text-sm leading-relaxed"><strong>Remember:</strong> Don&apos;t worry about memorizing all the rules at once. Focus on understanding the pattern and practice with the exercises!</p>
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--text-light)" }}>No grammar notes for this lesson yet.</p>
                )}
              </>
            )}

            {activeSection === "exercises" && (
              <>
                <h2 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Exercises</h2>
                <ExercisePanel exercises={topic.exercises} topicId={topic.id} />
              </>
            )}

            {activeSection === "flashcards" && (
              <>
                <h2 className="text-2xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Flashcards</h2>
                <p className="mb-8" style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>Click the card to flip! Practice all {topic.vocab.length} words.</p>
                <Flashcards words={topic.vocab} />
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

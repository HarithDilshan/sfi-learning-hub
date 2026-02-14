"use client";

import { useState, useMemo } from "react";
import { VocabWord } from "@/data/types";

export default function Flashcards({ words }: { words: VocabWord[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const cards = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, shuffleKey]);

  const card = cards[idx];

  function next() {
    if (idx < cards.length - 1) { setIdx(idx + 1); setFlipped(false); }
  }
  function prev() {
    if (idx > 0) { setIdx(idx - 1); setFlipped(false); }
  }
  function shuffle() {
    setShuffleKey((k) => k + 1);
    setIdx(0);
    setFlipped(false);
  }

  return (
    <div>
      <div className="text-center text-sm mb-3" style={{ color: "var(--text-light)" }}>
        {idx + 1} / {cards.length}
      </div>

      <div className="perspective-1000 mx-auto max-w-[400px] my-6">
        <div
          className={`relative w-full h-[240px] cursor-pointer preserve-3d transition-transform-600 ${flipped ? "rotate-y-180" : ""}`}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="absolute w-full h-full backface-hidden rounded-xl flex flex-col items-center justify-center p-8 text-white"
            style={{ background: "linear-gradient(135deg, var(--blue), var(--blue-dark))", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}
          >
            <div className="text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>{card.sv}</div>
            <div className="text-sm opacity-70 mt-3">Click to reveal</div>
          </div>

          {/* Back */}
          <div
            className="absolute w-full h-full backface-hidden rounded-xl flex flex-col items-center justify-center p-8 rotate-y-180 bg-white"
            style={{ border: "2px solid var(--yellow)", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}
          >
            <div className="text-2xl font-semibold" style={{ color: "var(--blue-dark)" }}>{card.en}</div>
            <div className="text-sm mt-2" style={{ color: "var(--text-light)" }}>/{card.pron}/</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-5">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="px-7 py-3 rounded-lg font-semibold border-2 cursor-pointer disabled:opacity-40"
          style={{ background: "white", borderColor: "var(--warm-dark)" }}
        >
          ← Previous
        </button>
        <button
          onClick={next}
          disabled={idx >= cards.length - 1}
          className="px-7 py-3 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-40"
          style={{ background: "var(--blue)" }}
        >
          Next →
        </button>
      </div>
      <div className="text-center mt-4">
        <button
          onClick={shuffle}
          className="px-7 py-3 rounded-lg font-semibold cursor-pointer"
          style={{ background: "var(--yellow)", color: "var(--text)" }}
        >
          🔀 Shuffle
        </button>
      </div>
    </div>
  );
}

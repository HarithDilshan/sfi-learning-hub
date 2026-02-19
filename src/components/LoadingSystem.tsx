// ════════════════════════════════════════════════════════════════
// lib/loading/LoadingSystem.tsx
// Smart loading system — uses all 5 animations contextually
// Import and use <LoadingState type="..." /> anywhere in your app
// ════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────
export type LoadingType =
  | "page"        // 🇸🇪 Flag Pulse     — full page / app boot
  | "lesson"      // ⌨️  Word Typewriter — loading a lesson
  | "data"        // ⭐  XP Progress Bar — fetching from database
  | "content"     // 📋  Skeleton Cards  — loading topic/vocab cards
  | "exercise";   // 🔤  Svenska Spinner — loading exercises/quiz

export interface LoadingStateProps {
  type: LoadingType;
  message?: string;
}

// ─── SWEDISH TIPS (used by XP loader) ─────────────────────────
const SWEDISH_TIPS = [
  "💡 J sounds like English Y — 'ja' is pronounced 'yah'",
  "💡 'Lagom' means just the right amount — a uniquely Swedish concept",
  "💡 Swedes use first names for everyone, even the CEO",
  "💡 The Swedish alphabet has 29 letters — Å, Ä, Ö come last",
  "💡 'Fika' is sacred — coffee, pastry, and a proper pause",
  "💡 'Halv tre' means 2:30, not 3:30 — half towards three",
  "💡 Swedish nouns are either 'en' or 'ett' words",
  "💡 'Sju' (seven) is one of Swedish's trickiest sounds",
  "💡 Allemansrätten gives everyone the right to roam in nature",
  "💡 Sweden has one of the world's most generous parental leave systems",
  "💡 BankID and Swish are essential for daily life in Sweden",
  "💡 'Hur mår du?' means 'How are you?' — answer 'Jag mår bra!'",
  "💡 Swedish compound words: sov+rum = sovrum (bedroom)",
  "💡 The Nobel Prize is awarded in Stockholm every December",
  "💡 'Tack' means thank you — 'Tack så mycket' is thank you very much",
];

// ════════════════════════════════════════════════════════════════
// 1. FLAG PULSE — used for full page / app boot
// ════════════════════════════════════════════════════════════════
function FlagPulse({ message = "Laddar..." }: { message?: string }) {
  return (
    <div className="sfi-loader-center">
      <div className="sfi-flag-wrap">
        <div className="sfi-flag">
          <div className="sfi-flag-v" />
          <div className="sfi-flag-h" />
          <div className="sfi-flag-shine" />
        </div>
        <div className="sfi-ripple sfi-ripple-1" />
        <div className="sfi-ripple sfi-ripple-2" />
        <div className="sfi-ripple sfi-ripple-3" />
      </div>
      <p className="sfi-loader-label">{message}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. WORD TYPEWRITER — used when loading a lesson
// ════════════════════════════════════════════════════════════════
const TYPEWRITER_WORDS = [
  { sv: "Välkommen!", en: "Welcome!" },
  { sv: "Bra jobbat!", en: "Well done!" },
  { sv: "Fortsätt!", en: "Keep going!" },
  { sv: "Du klarar det!", en: "You can do it!" },
  { sv: "Snart klart...", en: "Almost ready..." },
  { sv: "Hej då!", en: "See you soon!" },
];

function WordTypewriter({ message = "Laddar lektion..." }: { message?: string }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const word = TYPEWRITER_WORDS[idx].sv;
    if (typing) {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setTyping(false), 1100);
        return () => clearTimeout(t);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
        return () => clearTimeout(t);
      } else {
        setIdx((i) => (i + 1) % TYPEWRITER_WORDS.length);
        setTyping(true);
      }
    }
  }, [displayed, typing, idx]);

  return (
    <div className="sfi-loader-center">
      <div className="sfi-type-card">
        <div className="sfi-type-swedish">
          {displayed}
          <span className="sfi-cursor">|</span>
        </div>
        <div className="sfi-type-english">{TYPEWRITER_WORDS[idx].en}</div>
        <div className="sfi-type-dots">
          <span className="sfi-dot" style={{ animationDelay: "0s" }} />
          <span className="sfi-dot" style={{ animationDelay: "0.2s" }} />
          <span className="sfi-dot" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
      <p className="sfi-loader-sublabel">{message}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. XP PROGRESS BAR — used when fetching from database
// ════════════════════════════════════════════════════════════════
function XPLoader({ message = "Hämtar data..." }: { message?: string }) {
  const [progress, setProgress] = useState(0);
  const [tip] = useState(
    () => SWEDISH_TIPS[Math.floor(Math.random() * SWEDISH_TIPS.length)]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) { clearInterval(interval); return 92; }
        const step = p < 40 ? Math.random() * 15 : p < 70 ? Math.random() * 8 : Math.random() * 4;
        return Math.min(p + step, 92);
      });
    }, 220);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.min(Math.round(progress), 92);

  return (
    <div className="sfi-loader-center">
      <div className="sfi-xp-card">
        <div className="sfi-xp-header">
          <span className="sfi-xp-icon">⭐</span>
          <span className="sfi-xp-title">{message}</span>
        </div>
        <div className="sfi-xp-bar-bg">
          <div className="sfi-xp-bar-fill" style={{ width: `${pct}%` }}>
            <div className="sfi-xp-bar-shine" />
          </div>
        </div>
        <div className="sfi-xp-pct">{pct}%</div>
        <div className="sfi-xp-tip">{tip}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. SKELETON CARDS — used when loading topic/vocab cards
// ════════════════════════════════════════════════════════════════
function SkeletonCards() {
  return (
    <div className="sfi-skeleton-wrap">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="sfi-skeleton-card"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="sfi-skeleton-icon sfi-shimmer" />
          <div className="sfi-skeleton-lines">
            <div className="sfi-skeleton-line sfi-shimmer" style={{ width: "55%", animationDelay: `${i * 0.1 + 0.05}s` }} />
            <div className="sfi-skeleton-line sfi-shimmer" style={{ width: "80%", animationDelay: `${i * 0.1 + 0.1}s` }} />
            <div className="sfi-skeleton-line sfi-shimmer" style={{ width: "40%", animationDelay: `${i * 0.1 + 0.15}s` }} />
          </div>
          <div className="sfi-skeleton-badge sfi-shimmer" />
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 5. SVENSKA SPINNER — used when loading exercises/quiz
// ════════════════════════════════════════════════════════════════
const SPINNER_LETTERS = ["S", "V", "E", "N", "S", "K", "A"];

function SvenskaSpinner({ message = "Förbereder övningar..." }: { message?: string }) {
  return (
    <div className="sfi-loader-center">
      <div className="sfi-spinner-ring">
        {SPINNER_LETTERS.map((letter, i) => {
          const angle = (i / SPINNER_LETTERS.length) * 360;
          const rad = (angle * Math.PI) / 180;
          const r = 38;
          const x = 50 + r * Math.sin(rad);
          const y = 50 - r * Math.cos(rad);
          return (
            <span
              key={i}
              className="sfi-spinner-letter"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${i * 0.12}s`,
                color: i % 2 === 0 ? "#FECC02" : "#FFFFFF",
              }}
            >
              {letter}
            </span>
          );
        })}
        <div className="sfi-spinner-center">🇸🇪</div>
      </div>
      <p className="sfi-loader-label" style={{ color: "rgba(255,255,255,0.8)" }}>
        {message}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT: <LoadingState type="..." message="..." />
// ════════════════════════════════════════════════════════════════
export function LoadingState({ type, message }: LoadingStateProps) {
  const isExercise = type === "exercise";

  return (
    <>
      <style>{CSS}</style>
      <div className={`sfi-loading-container ${isExercise ? "sfi-loading-dark" : "sfi-loading-light"}`}>
        {type === "page"     && <FlagPulse     message={message} />}
        {type === "lesson"   && <WordTypewriter message={message} />}
        {type === "data"     && <XPLoader       message={message} />}
        {type === "content"  && <SkeletonCards />}
        {type === "exercise" && <SvenskaSpinner message={message} />}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// USAGE GUIDE (inline comments for your team)
// ════════════════════════════════════════════════════════════════
//
// 1. PAGE LOAD (app boot, route change):
//    <LoadingState type="page" message="Laddar Lär dig Svenska..." />
//
// 2. LESSON LOAD (opening a lesson):
//    <LoadingState type="lesson" message="Laddar lektion..." />
//
// 3. DATABASE FETCH (Supabase query):
//    <LoadingState type="data" message="Hämtar kurs A..." />
//
// 4. TOPIC/VOCAB CARDS (loading a list):
//    <LoadingState type="content" />
//
// 5. EXERCISES/QUIZ (loading questions):
//    <LoadingState type="exercise" message="Förbereder övningar..." />
//
// Example usage in a page component:
//
//   const [loading, setLoading] = useState(true);
//
//   if (loading) return <LoadingState type="content" />;
//   return <YourContent />;
//
// ════════════════════════════════════════════════════════════════

// ─── CSS ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  /* Container */
  .sfi-loading-container {
    width: 100%;
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
    padding: 48px 24px;
    border-radius: 16px;
  }
  .sfi-loading-light { background: #FAF7F2; }
  .sfi-loading-dark  { background: linear-gradient(135deg, #003D66 0%, #005B99 100%); }

  /* Shared */
  .sfi-loader-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .sfi-loader-label {
    color: #5A5A7A;
    font-size: 0.95rem;
    font-weight: 500;
    margin: 0;
    animation: sfi-pulse 1.6s ease-in-out infinite;
  }
  .sfi-loader-sublabel {
    color: rgba(255,255,255,0.6);
    font-size: 0.88rem;
    margin: 0;
    font-weight: 500;
  }

  /* ── Flag Pulse ── */
  .sfi-flag-wrap {
    position: relative;
    width: 96px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sfi-flag {
    width: 82px;
    height: 55px;
    background: #005B99;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
    animation: sfi-float 2.6s ease-in-out infinite;
    box-shadow: 0 6px 24px rgba(0,91,153,0.4);
    z-index: 2;
  }
  .sfi-flag-v {
    position: absolute;
    left: 22px; top: 0;
    width: 10px; height: 100%;
    background: #FECC02;
  }
  .sfi-flag-h {
    position: absolute;
    left: 0; top: 20px;
    width: 100%; height: 10px;
    background: #FECC02;
  }
  .sfi-flag-shine {
    position: absolute;
    top: 0; left: -100%;
    width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
    animation: sfi-shine 2.2s ease-in-out infinite;
    z-index: 3;
  }
  .sfi-ripple {
    position: absolute;
    width: 82px; height: 55px;
    border-radius: 8px;
    animation: sfi-ripple 2.2s ease-out infinite;
  }
  .sfi-ripple-1 { border: 2px solid rgba(0,91,153,0.45); }
  .sfi-ripple-2 { border: 2px solid rgba(254,204,2,0.35); animation-delay: 0.6s; }
  .sfi-ripple-3 { border: 2px solid rgba(0,91,153,0.2);  animation-delay: 1.2s; }

  /* ── Word Typewriter ── */
  .sfi-type-card {
    background: #003D66;
    border-radius: 16px;
    padding: 32px 52px;
    text-align: center;
    min-width: 270px;
    box-shadow: 0 8px 32px rgba(0,61,102,0.3);
  }
  .sfi-type-swedish {
    font-family: 'DM Serif Display', serif;
    font-size: 2.6rem;
    color: #FECC02;
    min-height: 56px;
    letter-spacing: -0.02em;
  }
  .sfi-cursor {
    animation: sfi-blink 0.75s step-end infinite;
    color: white;
    margin-left: 2px;
  }
  .sfi-type-english {
    color: rgba(255,255,255,0.55);
    font-size: 0.9rem;
    margin-top: 8px;
    font-style: italic;
    min-height: 22px;
  }
  .sfi-type-dots {
    display: flex;
    gap: 7px;
    justify-content: center;
    margin-top: 22px;
  }
  .sfi-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #FECC02;
    display: inline-block;
    animation: sfi-dot-bounce 1.2s ease-in-out infinite;
  }

  /* ── XP Progress Bar ── */
  .sfi-xp-card {
    background: white;
    border-radius: 16px;
    padding: 28px 32px;
    width: 340px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.06);
  }
  .sfi-xp-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .sfi-xp-icon { font-size: 1.4rem; }
  .sfi-xp-title { font-weight: 600; font-size: 0.95rem; color: #003D66; }
  .sfi-xp-bar-bg {
    width: 100%; height: 14px;
    background: #F0EBE1;
    border-radius: 7px;
    overflow: hidden;
    position: relative;
  }
  .sfi-xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #005B99, #2D5A3D);
    border-radius: 7px;
    transition: width 0.35s ease;
    position: relative;
    overflow: hidden;
  }
  .sfi-xp-bar-shine {
    position: absolute;
    top: 0; left: -60%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    animation: sfi-xp-shine 1.6s ease-in-out infinite;
  }
  .sfi-xp-pct {
    text-align: right;
    font-size: 0.78rem;
    color: #5A5A7A;
    margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
  }
  .sfi-xp-tip {
    margin-top: 16px;
    background: #FFF8D6;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 0.82rem;
    color: #5A4200;
    line-height: 1.5;
    border-left: 3px solid #FECC02;
  }

  /* ── Skeleton Cards ── */
  .sfi-skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 360px;
  }
  .sfi-skeleton-card {
    background: white;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.05);
    animation: sfi-fade-slide 0.4s ease both;
  }
  .sfi-skeleton-icon {
    width: 42px; height: 42px;
    border-radius: 10px;
    flex-shrink: 0;
  }
  .sfi-skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
  }
  .sfi-skeleton-line {
    height: 10px;
    border-radius: 5px;
  }
  .sfi-skeleton-badge {
    width: 52px; height: 22px;
    border-radius: 11px;
    flex-shrink: 0;
    align-self: center;
  }
  .sfi-shimmer {
    background: linear-gradient(90deg, #F0EBE1 25%, #E4DDD4 50%, #F0EBE1 75%);
    background-size: 400px 100%;
    animation: sfi-shimmer 1.5s ease-in-out infinite;
  }

  /* ── Svenska Spinner ── */
  .sfi-spinner-ring {
    position: relative;
    width: 104px;
    height: 104px;
  }
  .sfi-spinner-letter {
    position: absolute;
    transform: translate(-50%, -50%);
    font-family: 'DM Serif Display', serif;
    font-size: 1.15rem;
    font-weight: 700;
    animation: sfi-orbit 1.5s ease-in-out infinite;
    text-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .sfi-spinner-center {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.9rem;
    animation: sfi-spin 10s linear infinite;
  }

  /* ── Keyframes ── */
  @keyframes sfi-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
  @keyframes sfi-float {
    0%,100% { transform: translateY(0) rotate(-1deg); }
    50%     { transform: translateY(-7px) rotate(1deg); }
  }
  @keyframes sfi-shine {
    0%   { left: -100%; }
    100% { left: 200%; }
  }
  @keyframes sfi-ripple {
    0%   { transform: scale(0.85); opacity: 0.7; }
    100% { transform: scale(2.4);  opacity: 0; }
  }
  @keyframes sfi-blink {
    0%,100% { opacity: 1; }
    50%     { opacity: 0; }
  }
  @keyframes sfi-dot-bounce {
    0%,80%,100% { transform: translateY(0); }
    40%         { transform: translateY(-9px); }
  }
  @keyframes sfi-xp-shine {
    0%   { left: -60%; }
    100% { left: 160%; }
  }
  @keyframes sfi-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes sfi-fade-slide {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sfi-orbit {
    0%,100% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.45; }
    50%     { transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
  }
  @keyframes sfi-spin {
    from { transform: translate(-50%,-50%) rotate(0deg); }
    to   { transform: translate(-50%,-50%) rotate(360deg); }
  }
`;
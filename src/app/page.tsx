"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLevelMeta, getPhrases } from "@/lib/content";
import { LevelKey, PhraseCategory } from "@/data/types";
import DailyChallengeCard from "@/components/DailyChallengeCard";
import { getProgress } from "@/lib/progress";

// ─── FEATURE DATA ─────────────────────────────────────────────────────────────
const practiceFeatures = [
  {
    href: "/daily",
    emoji: "📅",
    label: "Dagens utmaning",
    sublabel: "Daily challenge",
    desc: "A fresh set of 5 exercises every day — same for all users.",
    accent: "var(--yellow)",
    accentBg: "var(--yellow-light)",
    accentText: "var(--yellow-dark)",
  },
  {
    href: "/review",
    emoji: "🔁",
    label: "Repetition",
    sublabel: "Spaced repetition",
    desc: "Revisit weak words at the right time to lock them in memory.",
    accent: "var(--forest)",
    accentBg: "var(--forest-light)",
    accentText: "var(--forest)",
  },
  {
    href: "/listening",
    emoji: "👂",
    label: "Hörförståelse",
    sublabel: "Listening comprehension",
    desc: "Three difficulty levels — listen and pick the right meaning.",
    accent: "var(--blue)",
    accentBg: "var(--blue-light)",
    accentText: "var(--blue)",
  },
  {
    href: "/sentences",
    emoji: "🧩",
    label: "Meningsbyggare",
    sublabel: "Sentence builder",
    desc: "Drag words into correct Swedish order. Master the V2 rule!",
    accent: "#8B5A2B",
    accentBg: "#FDF0E0",
    accentText: "#8B5A2B",
  },
];

const toolFeatures = [
  {
    href: "/skrivning",
    emoji: "✍️",
    label: "Skrivövning",
    sublabel: "Writing practice",
    desc: "Translate English → Swedish from scratch. No multiple choice.",
  },
  {
    href: "/verb",
    emoji: "🔤",
    label: "Verbträning",
    sublabel: "Conjugation trainer",
    desc: "Drill all 4 verb groups across 4 tenses with instant feedback.",
  },
  {
    href: "/berattelser",
    emoji: "📖",
    label: "Berättelser",
    sublabel: "Mini stories",
    desc: "Read Ahmed, Sara, Fatima and Omar's lives in Swedish.",
  },
  {
    href: "/uttal",
    emoji: "🎤",
    label: "Uttalsövning",
    sublabel: "Pronunciation recorder",
    desc: "Listen, record yourself, compare — perfect Swedish's tricky sounds.",
  },
];

const levelInfo: Record<string, { color: string; bg: string; border: string; tag: string }> = {
  A: { color: "#2D8B4E", bg: "#E8F8EE", border: "#B8DFC6", tag: "Nybörjare" },
  B: { color: "#005B99", bg: "#E8F4FD", border: "#B8D8F0", tag: "Grundläggande" },
  C: { color: "#6B3FA0", bg: "#F0E8FD", border: "#CEB8F0", tag: "Mellanliggande" },
  D: { color: "#C0392B", bg: "#FDEBEA", border: "#F0B8B4", tag: "Avancerad" },
  G: { color: "#2D5A3D", bg: "#E8F5EC", border: "#B8D8C4", tag: "Grammatik" },
};

// ─── STAT COUNTER ─────────────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Home() {
  const levels: LevelKey[] = ["A", "B", "C", "D", "G"];
  const meta = getLevelMeta();
  const [phrases, setPhrases] = useState<PhraseCategory[]>([]);
  const [progress, setProgress] = useState({ xp: 0, streak: 0, completedTopics: {} });

  useEffect(() => {
    getPhrases().then(setPhrases);
    setProgress(getProgress());
  }, []);

  const completedCount = Object.keys(progress.completedTopics).length;
  const hasProgress = progress.xp > 0 || completedCount > 0;

  return (
    <>
      <Header />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #003D66 0%, #005B99 55%, #00487A 100%)" }}
      >
        {/* Decorative Swedish cross shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div style={{
            position: "absolute", top: "-60px", right: "-60px",
            width: "420px", height: "420px", opacity: 0.06,
            background: "radial-gradient(circle, #FECC02 0%, transparent 70%)",
          }} />
          <div style={{
            position: "absolute", bottom: "-80px", left: "-40px",
            width: "500px", height: "300px", opacity: 0.04,
            background: "radial-gradient(ellipse, #fff 0%, transparent 70%)",
          }} />
          {/* Subtle Swedish flag cross */}
          <div style={{
            position: "absolute", top: "50%", right: "8%",
            transform: "translateY(-50%)",
            width: "200px", height: "200px", opacity: 0.05,
          }}>
            <div style={{ position: "absolute", left: "38%", top: 0, width: "16%", height: "100%", background: "#FECC02", borderRadius: "2px" }} />
            <div style={{ position: "absolute", top: "38%", left: 0, width: "100%", height: "16%", background: "#FECC02", borderRadius: "2px" }} />
          </div>
        </div>

        <div className="relative z-10 max-w-[1100px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">
                <span style={{ color: "var(--yellow)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Free · SFI Curriculum
                </span>
              </div>
              <h1
                className="text-white mb-5 leading-[1.1]"
                style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.4rem, 5vw, 3.6rem)", fontWeight: 400 }}
              >
                Learn Swedish<br />
                <em style={{ color: "var(--yellow)", fontStyle: "italic" }}>the smart way</em>
              </h1>
              <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-[480px]">
                Interactive lessons built around Sweden's SFI program — vocabulary, grammar, listening, writing and pronunciation, all in one place.
              </p>

              {/* CTA row */}
              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/kurs/A"
                  className="no-underline px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 hover:shadow-lg"
                  style={{ background: "var(--yellow)", color: "var(--text)" }}
                >
                  Börja lära dig →
                </Link>
                <Link
                  href="/daily"
                  className="no-underline px-6 py-3 rounded-xl font-semibold text-sm border border-white/20 text-white bg-white/10 transition-all hover:bg-white/18"
                >
                  📅 Dagens utmaning
                </Link>
              </div>

              {/* Mini stats — only show if user has progress */}
              {hasProgress ? (
                <div className="flex gap-5 flex-wrap">
                  <div className="text-white">
                    <div className="text-2xl font-bold" style={{ color: "var(--yellow)" }}>
                      <AnimatedNumber value={progress.xp} />
                    </div>
                    <div className="text-xs text-white/55 font-medium uppercase tracking-wider">XP earned</div>
                  </div>
                  <div className="w-px bg-white/15" />
                  <div className="text-white">
                    <div className="text-2xl font-bold" style={{ color: "var(--yellow)" }}>
                      <AnimatedNumber value={progress.streak} />
                    </div>
                    <div className="text-xs text-white/55 font-medium uppercase tracking-wider">Day streak 🔥</div>
                  </div>
                  <div className="w-px bg-white/15" />
                  <div className="text-white">
                    <div className="text-2xl font-bold" style={{ color: "var(--yellow)" }}>
                      <AnimatedNumber value={completedCount} />
                    </div>
                    <div className="text-xs text-white/55 font-medium uppercase tracking-wider">Topics done</div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-5 flex-wrap">
                  {[["50+", "Topics"], ["5 Levels", "A → D + Grammar"], ["Free", "Always"]].map(([num, lbl]) => (
                    <div key={lbl} className="text-white">
                      <div className="text-xl font-bold" style={{ color: "var(--yellow)" }}>{num}</div>
                      <div className="text-xs text-white/55 font-medium">{lbl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: SFI level cards */}
            <div className="hidden lg:grid grid-cols-2 gap-3 lg:gap-4">
              {levels.map((l, i) => {
                const info = levelInfo[l];
                return (
                  <Link
                    key={l}
                    href={`/kurs/${l}`}
                    className={`no-underline rounded-2xl p-5 border transition-all hover:-translate-y-1 hover:shadow-xl group ${l === "G" ? "col-span-2" : ""}`}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      animationDelay: `${i * 80}ms`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(254,204,2,0.35)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className="text-2xl font-bold leading-none"
                        style={{ fontFamily: "'DM Serif Display', serif", color: "var(--yellow)" }}
                      >
                        Kurs {l}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: info.bg, color: info.color }}
                      >
                        {info.tag}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{meta[l].desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative h-12 overflow-hidden" style={{ marginBottom: "-2px" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="var(--warm)" />
          </svg>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main style={{ background: "var(--warm)" }}>
        <div className="max-w-[1100px] mx-auto px-6 lg:px-8 pb-24">

          {/* ── CONTINUE / DAILY CHALLENGE ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 py-10">
            {/* Daily challenge spans 3 cols */}
            <div className="lg:col-span-3">
              <DailyChallengeCard />
            </div>

            {/* SFI explainer */}
            <div
              className="lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between"
              style={{
                background: "white",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <div className="text-2xl mb-3">🇸🇪</div>
                <h3
                  className="text-lg mb-2"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Vad är SFI?
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-light)" }}>
                  <strong style={{ color: "var(--text)" }}>Svenska för invandrare</strong> is Sweden's
                  free language program for immigrants — 4 levels from beginner to advanced,
                  preparing you for daily life and work in Sweden.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-5">
                {(["A", "B", "C", "D"] as const).map(l => (
                  <Link key={l} href={`/kurs/${l}`} className="no-underline">
                    <div
                      className="rounded-xl px-3 py-2.5 flex items-center gap-2 transition-all hover:scale-[1.02]"
                      style={{ background: levelInfo[l].bg, border: `1px solid ${levelInfo[l].border}` }}
                    >
                      <span className="font-bold text-sm" style={{ color: levelInfo[l].color }}>
                        {l}
                      </span>
                      <span className="text-xs" style={{ color: levelInfo[l].color, opacity: 0.8 }}>
                        {levelInfo[l].tag}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── PRACTICE FEATURES ──────────────────────────────────────────── */}
          <section className="mb-14">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2
                  className="text-2xl lg:text-3xl mb-1"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Öva svenska
                </h2>
                <p className="text-sm" style={{ color: "var(--text-light)" }}>
                  Interactive exercises for every learning style
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {practiceFeatures.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="no-underline rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-1 group"
                  style={{
                    background: "white",
                    border: `1px solid rgba(0,0,0,0.06)`,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor = f.accent;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: f.accentBg }}
                  >
                    {f.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>
                      {f.label}
                    </div>
                    <div className="text-xs font-medium mb-2" style={{ color: f.accentText }}>
                      {f.sublabel}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-light)" }}>
                      {f.desc}
                    </p>
                  </div>
                  <div className="text-xs font-semibold flex items-center gap-1 transition-all group-hover:gap-2" style={{ color: f.accentText }}>
                    Öva nu <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── ADVANCED TOOLS ─────────────────────────────────────────────── */}
          <section className="mb-14">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2
                  className="text-2xl lg:text-3xl mb-1"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  Avancerade verktyg
                </h2>
                <p className="text-sm" style={{ color: "var(--text-light)" }}>
                  Deeper practice for serious learners
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {toolFeatures.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="no-underline rounded-2xl p-5 flex flex-col gap-3 transition-all hover:-translate-y-1 group"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--blue)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: "var(--blue-light)" }}
                  >
                    {f.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-0.5" style={{ color: "var(--text)" }}>
                      {f.label}
                    </div>
                    <div className="text-xs font-medium mb-2" style={{ color: "var(--blue)" }}>
                      {f.sublabel}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-light)" }}>
                      {f.desc}
                    </p>
                  </div>
                  <div className="text-xs font-semibold flex items-center gap-1 transition-all group-hover:gap-2" style={{ color: "var(--blue)" }}>
                    Öva nu <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── COMMUNITY + PROFILE ROW ────────────────────────────────────── */}
          <section className="mb-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Leaderboard promo */}
              <Link
                href="/leaderboard"
                className="no-underline rounded-2xl p-6 flex items-center gap-5 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                style={{
                  background: "linear-gradient(135deg, var(--blue-dark), var(--blue))",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  🏆
                </div>
                <div className="text-white">
                  <div className="font-bold text-base mb-0.5">Topplista</div>
                  <div className="text-sm text-white/65 leading-snug">
                    See where you rank among all learners. Earn XP to climb the leaderboard.
                  </div>
                </div>
                <div className="ml-auto text-white/40 group-hover:text-white/70 transition-colors text-lg">→</div>
              </Link>

              {/* Profile / progress */}
              <Link
                href="/profile"
                className="no-underline rounded-2xl p-6 flex items-center gap-5 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                style={{
                  background: "linear-gradient(135deg, var(--forest), var(--forest) 100%)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  {hasProgress ? "📊" : "👤"}
                </div>
                <div className="text-white">
                  <div className="font-bold text-base mb-0.5">
                    {hasProgress ? `${progress.xp} XP · ${progress.streak}🔥` : "Min profil"}
                  </div>
                  <div className="text-sm text-white/65 leading-snug">
                    {hasProgress
                      ? `${completedCount} topics completed. Keep going!`
                      : "Track your progress, streaks and completed topics."}
                  </div>
                </div>
                <div className="ml-auto text-white/40 group-hover:text-white/70 transition-colors text-lg">→</div>
              </Link>
            </div>
          </section>

          {/* ── QUICK PHRASES ──────────────────────────────────────────────── */}
          {phrases.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2
                    className="text-2xl lg:text-3xl mb-1"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    Vardagsfraser
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-light)" }}>
                    Practical phrases for everyday life in Sweden
                  </p>
                </div>
                <Link
                  href="/phrases"
                  className="text-sm font-semibold no-underline hidden sm:block"
                  style={{ color: "var(--blue)" }}
                >
                  Alla fraser →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {phrases.slice(0, 3).map((cat, i) => (
                  <Link
                    key={i}
                    href="/phrases"
                    className="no-underline rounded-2xl overflow-hidden transition-all hover:-translate-y-1 group"
                    style={{
                      background: "white",
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                    }}
                  >
                    {/* Coloured top strip */}
                    <div className="h-1" style={{ background: "var(--yellow)" }} />
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <h3 className="font-bold text-sm leading-tight" style={{ color: "var(--text)" }}>
                            {cat.title}
                          </h3>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                            style={{ background: "var(--warm)", color: "var(--text-light)" }}
                          >
                            {cat.phrases.length} phrases
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {cat.phrases.slice(0, 3).map((p, pi) => (
                          <div
                            key={pi}
                            className="text-xs flex items-baseline gap-2 py-1 border-b last:border-0"
                            style={{ borderColor: "var(--warm-dark)" }}
                          >
                            <span className="font-semibold flex-shrink-0" style={{ color: "var(--blue-dark)" }}>
                              {p.sv}
                            </span>
                            <span style={{ color: "var(--text-light)" }} className="truncate">
                              {p.en}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="sm:hidden mt-4 text-center">
                <Link href="/phrases" className="text-sm font-semibold no-underline" style={{ color: "var(--blue)" }}>
                  Alla vardagsfraser →
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
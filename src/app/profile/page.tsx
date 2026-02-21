"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/auth";
import { getProgress, ProgressData } from "@/lib/progress";
import { getUserStats } from "@/lib/sync";
import { BadgeWithStatus } from "@/lib/badges";
import { useBadges } from "@/hooks/useBadges";
import { LoadingState } from "@/components/LoadingSystem";

import {
  loadWeeklyGoal,
  saveWeeklyGoal,
  loadGoalHistory,
  WeeklyGoal,
  goalPresets,
  getEncouragement,
  getWeekLabel,
  getDaysRemaining,
} from "@/lib/weekly-goals";

import { getLevelMeta, getCoursesStructure, type CourseMeta } from "@/lib/content";

type Tab = "overview" | "achievements" | "goals";

interface CourseProgress {
  level: string;
  label: string;
  total: number;
  completed: number;
  avgScore: number;
}

// ─── localStorage helpers (for features that still use it) ────────────────────
function lsGetArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}

function getBestStreak(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem("sfihub_best_streak") ?? "0", 10); } catch { return 0; }
}

function updateBestStreak(current: number) {
  if (typeof window === "undefined") return;
  const best = getBestStreak();
  if (current > best) localStorage.setItem("sfihub_best_streak", String(current));
}

// ─── Animated counter hook ────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return value;
}

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVELS = [
  { min: 0,    max: 100,  label: "Ny",         color: "#5A5A7A", bg: "#F0EBE1", next: 100  },
  { min: 100,  max: 500,  label: "Nybörjare",  color: "#D4A800", bg: "#FFF8D6", next: 500  },
  { min: 500,  max: 1000, label: "Aktiv",      color: "#005B99", bg: "#E8F4FD", next: 1000 },
  { min: 1000, max: 2000, label: "Duktig",     color: "#2D8B4E", bg: "#E8F8EE", next: 2000 },
  { min: 2000, max: 5000, label: "Avancerad",  color: "#8B5CF6", bg: "#F3E8FF", next: 5000 },
  { min: 5000, max: Infinity, label: "Mästare",color: "#D4A800", bg: "#FFF8DC", next: 5000 },
];

function getLevelInfo(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp < l.max) ?? LEVELS[LEVELS.length - 1];
}

function getLevelProgress(xp: number): number {
  const lv = getLevelInfo(xp);
  if (lv.max === Infinity) return 100;
  return Math.min(100, ((xp - lv.min) / (lv.max - lv.min)) * 100);
}

function getXPToNext(xp: number): number {
  const lv = getLevelInfo(xp);
  if (lv.max === Infinity) return 0;
  return lv.max - xp;
}

// ─── Ring component ───────────────────────────────────────────────────────────
function LevelRing({ xp, size = 120 }: { xp: number; size?: number }) {
  const lv = getLevelInfo(xp);
  const pct = getLevelProgress(xp);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={lv.color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: size > 100 ? "1.4rem" : "1rem", fontWeight: 800, color: "white", lineHeight: 1 }}>
          {Math.round(pct)}%
        </div>
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{lv.label}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [cloudStats, setCloudStats] = useState<{ wordsLearned: number; wordsMastered: number } | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<WeeklyGoal[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [courses, setCourses] = useState<Record<string, CourseMeta>>({});
  const [shareMsg, setShareMsg] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // localStorage-sourced stats
  const [storiesRead, setStoriesRead] = useState(0);
  const [storiesGenerated, setStoriesGenerated] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const { allBadges, unlockedBadges, lockedBadges, loading: badgesLoading, refresh: refreshBadges } = useBadges(userId);

  const loadData = useCallback(async () => {
    setLoading(true);
    const user = await getUser();
    const prog = getProgress();
    setProgress(prog);

    // Update best streak in localStorage
    updateBestStreak(prog.streak);
    setBestStreak(Math.max(getBestStreak(), prog.streak));

    // localStorage stats
    setStoriesRead(lsGetArray("sfihub_read_stories").length);
    try {
      const raw = localStorage.getItem("sfihub_gen_limit");
      if (raw) {
        const { count } = JSON.parse(raw);
        setStoriesGenerated(count || 0);
      }
    } catch { /* ignore */ }

    if (user) {
      setUserId(user.id);
      const stats = await getUserStats(user.id);
      if (stats) setCloudStats({ wordsLearned: stats.wordsLearned, wordsMastered: stats.wordsMastered });
      const goal = await loadWeeklyGoal(user.id);
      setWeeklyGoal(goal);
      const history = await loadGoalHistory(user.id);
      setGoalHistory(history);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => {
      const prog = getProgress();
      setProgress(prog);
      updateBestStreak(prog.streak);
      setBestStreak(Math.max(getBestStreak(), prog.streak));
      if (userId) loadWeeklyGoal(userId).then(setWeeklyGoal);
    };
    window.addEventListener("progress-update", handler);
    return () => window.removeEventListener("progress-update", handler);
  }, [loadData, userId]);

  // Fetch course structure from Supabase
  useEffect(() => {
    getCoursesStructure().then(setCourses);
  }, []);

  useEffect(() => {
    if (tab === "achievements") refreshBadges();
  }, [tab, refreshBadges]);

  // Dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.style.setProperty("--warm", "#1a1a2e");
      root.style.setProperty("--warm-dark", "#16213e");
      root.style.setProperty("--text", "#e0e0e0");
      root.style.setProperty("--text-light", "#a0a0b0");
      root.style.setProperty("--white", "#1e1e30");
    } else {
      root.style.setProperty("--warm", "#FAF7F2");
      root.style.setProperty("--warm-dark", "#F0EBE1");
      root.style.setProperty("--text", "#1A1A2E");
      root.style.setProperty("--text-light", "#5A5A7A");
      root.style.setProperty("--white", "#FFFFFF");
    }
    return () => {
      root.style.setProperty("--warm", "#FAF7F2");
      root.style.setProperty("--warm-dark", "#F0EBE1");
      root.style.setProperty("--text", "#1A1A2E");
      root.style.setProperty("--text-light", "#5A5A7A");
      root.style.setProperty("--white", "#FFFFFF");
    };
  }, [darkMode]);

  const animatedXP = useAnimatedCounter(progress?.xp ?? 0);

  if (loading || badgesLoading || !progress) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--warm)" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingState type="data" message="Hämtar din profil..." />
        </div>
        <Footer />
      </div>
    );
  }

  const meta = getLevelMeta();

  // Build courseProgress from Supabase-fetched courses.
  // Topic IDs follow the pattern "a1", "b2" etc — first char is the level key.
  // If courses haven't loaded yet, fall back to counting from completedTopics directly.
  const courseProgress: CourseProgress[] = (["A", "B", "C", "D", "G"] as const).map((level) => {
    const levelKey = level.toLowerCase();
    const levelData = courses[level] || courses[levelKey];
    const topics = levelData?.topics || [];

    if (topics.length > 0) {
      // Use Supabase data — accurate total count
      const completed = topics.filter(t => progress.completedTopics[t.id]).length;
      const scores = topics
        .map(t => progress.completedTopics[t.id]?.bestScore || 0)
        .filter(s => s > 0);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      return { level, label: meta[level]?.label || level, total: topics.length, completed, avgScore };
    } else {
      // Supabase not yet loaded — derive from completedTopics keys (e.g. "a1", "a2")
      const completedForLevel = Object.entries(progress.completedTopics)
        .filter(([id]) => id.startsWith(levelKey));
      const scores = completedForLevel.map(([, d]) => d.bestScore).filter(s => s > 0);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      return {
        level,
        label: meta[level]?.label || level,
        total: completedForLevel.length, // best we can do without Supabase
        completed: completedForLevel.length,
        avgScore,
      };
    }
  });

  const totalTopics    = courseProgress.reduce((s, c) => s + c.total, 0);
  const totalCompleted = courseProgress.reduce((s, c) => s + c.completed, 0);
  const wordsKnown     = Object.keys(progress.wordHistory).length;
  const wordAccuracy   = wordsKnown > 0
    ? Math.round((Object.values(progress.wordHistory).reduce((s, w) => s + w.correct, 0) /
        Object.values(progress.wordHistory).reduce((s, w) => s + w.correct + w.wrong, 0)) * 100)
    : 0;

  const allTopicScores = Object.values(progress.completedTopics);
  const overallAvg     = allTopicScores.length > 0
    ? Math.round(allTopicScores.reduce((s, t) => s + t.bestScore, 0) / allTopicScores.length)
    : 0;

  if (!progress) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--warm)" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoadingState type="data" message="Hämtar din profil..." />
        </div>
        <Footer />
      </div>
    );
  }

  const streakDays = generateStreakCalendar(progress);
  const lv         = getLevelInfo(progress.xp);
  const lvPct      = getLevelProgress(progress.xp);

  async function handleSetGoal(xpTarget: number, topicsTarget: number) {
    if (!userId) return;
    const goal: WeeklyGoal = {
      xpTarget, topicsTarget,
      xpEarned: weeklyGoal?.xpEarned || 0,
      topicsCompleted: weeklyGoal?.topicsCompleted || 0,
      weekStart: weeklyGoal?.weekStart || new Date().toISOString().split("T")[0],
    };
    await saveWeeklyGoal(userId, goal);
    setWeeklyGoal(goal);
    setEditingGoal(false);
  }

  async function generateShareImage(): Promise<Blob | null> {
    if (!progress) return null;

    const canvas = document.createElement("canvas");
    const W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // ── Background gradient ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0A1628");
    bg.addColorStop(0.5, "#0D2144");
    bg.addColorStop(1, "#0A1628");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Decorative circles ──
    const drawGlow = (x: number, y: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color.replace(")", `, ${alpha})`).replace("rgb", "rgba"));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    drawGlow(200, 200, 350, "rgb(0, 91, 153)", 0.35);
    drawGlow(880, 850, 300, "rgb(254, 204, 2)", 0.18);
    drawGlow(900, 150, 200, "rgb(45, 139, 78)", 0.2);

    // ── Grid dot pattern (subtle) ──
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let x = 60; x < W; x += 60) {
      for (let y = 60; y < H; y += 60) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Swedish flag accent bar (top) ──
    ctx.fillStyle = "#005B99";
    ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = "#FECC02";
    ctx.fillRect(0, 8, W, 5);

    // ── sfihub.se branding ──
    ctx.font = "bold 32px 'Arial', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText("sfihub.se", 72, 90);

    // Swedish flag emoji area
    ctx.font = "42px Arial";
    ctx.fillText("🇸🇪", W - 130, 90);

    // ── Main headline ──
    ctx.textAlign = "center";
    ctx.font = "bold 56px 'Georgia', serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("Min Svenska Resa", W / 2, 200);

    // Subtitle
    ctx.font = "28px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText("Lär dig Svenska — SFI Learning Platform", W / 2, 250);

    // ── Divider line ──
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(72, 280);
    ctx.lineTo(W - 72, 280);
    ctx.stroke();

    // ── Big stats row ──
    const stats = [
      { value: String(progress.xp), label: "XP Intjänat", emoji: "⭐", color: "#FECC02" },
      { value: `${progress.streak}d`, label: "Dagars Streak", emoji: "🔥", color: "#FF6B35" },
      { value: `${totalCompleted}`, label: "Ämnen Klara", emoji: "📚", color: "#4DB87A" },
      { value: `${unlockedBadges.length}`, label: "Badges", emoji: "🏅", color: "#C084FC" },
    ];

    const colW = (W - 144) / stats.length;
    stats.forEach((stat, i) => {
      const cx = 72 + colW * i + colW / 2;
      const cy = 400;

      // Card background
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      roundRect(ctx, cx - colW / 2 + 10, cy - 100, colW - 20, 200, 20);
      ctx.fill();

      // Emoji
      ctx.font = "52px Arial";
      ctx.textAlign = "center";
      ctx.fillText(stat.emoji, cx, cy - 30);

      // Value
      ctx.font = `bold 58px 'Georgia', serif`;
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.value, cx, cy + 50);

      // Label
      ctx.font = "22px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(stat.label, cx, cy + 85);
    });

    // ── Level badge ──
    const lvInfo = getLevelInfo(progress.xp);
    const lvPct = Math.round(getLevelProgress(progress.xp));

    // Level pill
    ctx.fillStyle = lvInfo.bg;
    roundRect(ctx, W / 2 - 130, 630, 260, 52, 26);
    ctx.fill();
    ctx.font = "bold 26px Arial";
    ctx.fillStyle = lvInfo.color;
    ctx.textAlign = "center";
    ctx.fillText(`✦ Nivå: ${lvInfo.label} · ${lvPct}%`, W / 2, 664);

    // ── Course progress bars ──
    ctx.textAlign = "left";
    const barY = 730;
    const barW = W - 144;
    const levels = ["A", "B", "C", "D"];
    const barH = 14;
    const gap = 44;

    ctx.font = "bold 22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Kursframsteg", 72, barY - 16);

    levels.forEach((lvl, i) => {
      const y = barY + i * gap;
      const cp = courseProgress.find(c => c.level === lvl);
      const pct = cp && cp.total > 0 ? cp.completed / cp.total : 0;
      const colors = { A: "#4DB87A", B: "#005B99", C: "#C084FC", D: "#FF6B35" } as Record<string, string>;

      // Track
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      roundRect(ctx, 72, y, barW - 160, barH, barH / 2);
      ctx.fill();

      // Fill
      if (pct > 0) {
        ctx.fillStyle = colors[lvl] || "#4DB87A";
        roundRect(ctx, 72, y, Math.max((barW - 160) * pct, barH), barH, barH / 2);
        ctx.fill();
      }

      // Label
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "right";
      ctx.fillText(`Kurs ${lvl}`, barW - 72, y + 12);
      ctx.font = "18px Arial";
      ctx.fillStyle = colors[lvl] || "#4DB87A";
      ctx.textAlign = "right";
      ctx.fillText(`${cp?.completed || 0}/${cp?.total || 0}`, W - 72, y + 12);
    });

    // ── Bottom CTA ──
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 72, 940, W - 144, 90, 16);
    ctx.fill();

    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "#FECC02";
    ctx.textAlign = "center";
    ctx.fillText("🇸🇪 Lär dig Svenska gratis på sfihub.se", W / 2, 975);
    ctx.font = "22px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("Följ SFI-kursen A→D · AI-berättelser · Uttal · Grammatik", W / 2, 1008);

    // ── Bottom accent bar ──
    ctx.fillStyle = "#FECC02";
    ctx.fillRect(0, H - 8, W, 5);
    ctx.fillStyle = "#005B99";
    ctx.fillRect(0, H - 3, W, 3);

    return new Promise(resolve => canvas.toBlob(resolve, "image/png", 0.95));
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async function handleShare() {
    if (!progress) return;
    setShareMsg("Skapar bild...");
    const blob = await generateShareImage();
    if (!blob) {
      setShareMsg("Fel ❌");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }

    const file = new File([blob], "sfihub-min-resa.png", { type: "image/png" });

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Min Svenska Resa 🇸🇪",
          text: `Jag lär mig Svenska på sfihub.se! ⭐ ${progress.xp} XP | 🔥 ${progress.streak} dagars streak | 📚 ${totalCompleted} ämnen klara #LearnSwedish #SFI`,
          files: [file],
          url: "https://sfihub.se",
        });
        setShareMsg("");
      } else {
        // Fallback: open image in new tab for manual save/share
        const url = URL.createObjectURL(blob);
        setShowShareModal(true);
        // Store URL for modal
        (window as unknown as Record<string, string>)._shareImageUrl = url;
        setShareMsg("");
      }
    } catch { setShareMsg(""); }
  }

  return (
    <>
      <Header />
      <div
        className="max-w-[900px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in"
        style={{ background: "var(--warm)", minHeight: "100vh", transition: "background 0.3s" }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-light)" }}>
            <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
            <span>›</span>
            <span>Min Profil</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? "Ljust läge" : "Mörkt läge"}
              style={{
                padding: "7px 14px", borderRadius: "8px", border: "2px solid var(--warm-dark)",
                background: darkMode ? "#1e1e30" : "white", cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", fontSize: "0.82rem", fontWeight: 600,
                color: "var(--text)", display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              {darkMode ? "☀️ Ljust" : "🌙 Mörkt"}
            </button>
            {/* Share button */}
            <button
              onClick={handleShare}
              style={{
                padding: "7px 14px", borderRadius: "8px", border: "none",
                background: "var(--blue)", cursor: "pointer",
                fontFamily: "'Outfit', sans-serif", fontSize: "0.82rem", fontWeight: 600, color: "white",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              📤 {shareMsg || "Dela"}
            </button>
          </div>
        </div>

        {/* ═══ PROFILE HERO CARD ═══ */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          {/* Background decoration */}
          <div style={{
            position: "absolute", top: -60, right: -60,
            width: 200, height: 200,
            background: "radial-gradient(circle, rgba(254,204,2,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Level ring */}
            <LevelRing xp={progress.xp} size={120} />

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className="text-xs px-3 py-1 rounded-full font-bold"
                  style={{ background: lv.bg, color: lv.color }}
                >
                  {lv.label}
                </span>
                <span className="text-sm opacity-60">
                  {unlockedBadges.length}/{allBadges.length} badges
                </span>
                {!userId && (
                  <span className="text-xs opacity-60 italic">· Inte inloggad</span>
                )}
              </div>
              <h2 className="text-3xl mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Min Profil
              </h2>
              <div className="text-sm opacity-70">
                {getXPToNext(progress.xp) > 0
                  ? `${getXPToNext(progress.xp)} XP till ${LEVELS[LEVELS.findIndex(l => l.label === lv.label) + 1]?.label ?? "max"}`
                  : "Max nivå uppnådd! 🎉"}
              </div>
              {/* XP bar */}
              <div className="mt-3 w-full max-w-xs">
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${lvPct}%`,
                      background: "var(--yellow)",
                      transition: "width 1s ease",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Big stats */}
            <div className="flex gap-5 flex-shrink-0">
              <div className="text-center">
                <div className="text-4xl font-black tabular-nums">{animatedXP}</div>
                <div className="text-xs opacity-60 mt-1">XP</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black">{progress.streak}</div>
                <div className="text-xs opacity-60 mt-1">Streak 🔥</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black">{totalCompleted}</div>
                <div className="text-xs opacity-60 mt-1">Ämnen</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STREAK MOTIVATION CARD ═══ */}
        <div
          className="rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-4 items-center"
          style={{
            background: progress.streak >= 7
              ? "linear-gradient(135deg, #FF6B35, #D4380D)"
              : "linear-gradient(135deg, #FFF8D6, #FFF0A0)",
            border: progress.streak >= 7 ? "none" : "1px solid var(--yellow)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "3rem", lineHeight: 1 }}>
            {progress.streak === 0 ? "💤" : progress.streak < 3 ? "🌱" : progress.streak < 7 ? "🔥" : progress.streak < 30 ? "🚀" : "🌟"}
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="font-bold text-lg mb-0.5"
              style={{ color: progress.streak >= 7 ? "white" : "var(--yellow-dark)" }}
            >
              {progress.streak === 0
                ? "Börja din streak idag!"
                : progress.streak < 3
                ? `${progress.streak} dagars streak — bra start!`
                : progress.streak < 7
                ? `${progress.streak} dagars streak — fortsätt!`
                : progress.streak < 30
                ? `🔥 ${progress.streak} dagar i rad — imponerande!`
                : `🌟 ${progress.streak} dagar — du är en legend!`}
            </div>
            <div style={{ fontSize: "0.85rem", color: progress.streak >= 7 ? "rgba(255,255,255,0.8)" : "var(--text-light)" }}>
              Bästa streak: <strong>{bestStreak}</strong> dagar
              {progress.streak > 0 && ` · Öva idag för att hålla din streak!`}
            </div>
          </div>
          <Link
            href="/"
            style={{
              padding: "10px 20px", borderRadius: "8px", fontWeight: 700, fontSize: "0.88rem",
              background: progress.streak >= 7 ? "rgba(255,255,255,0.2)" : "var(--yellow)",
              color: progress.streak >= 7 ? "white" : "var(--text)",
              textDecoration: "none", flexShrink: 0, border: "none",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Öva nu →
          </Link>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex gap-1 mb-8 overflow-x-auto">
          {([
            { key: "overview",      label: "📊 Översikt" },
            { key: "achievements",  label: `🏅 Badges (${unlockedBadges.length})` },
            { key: "goals",         label: "🎯 Veckomål" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-2 transition-all whitespace-nowrap"
              style={{
                background: tab === t.key ? "var(--blue-light)" : "white",
                borderColor: tab === t.key ? "var(--blue)" : "var(--warm-dark)",
                color: tab === t.key ? "var(--blue)" : "var(--text)",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div className="space-y-6">

            {/* ── Big stats grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Ämnen klara",   value: `${totalCompleted}/${totalTopics}`, icon: "📚", sub: `${Math.round((totalCompleted/totalTopics)*100)||0}% av kursen`, color: "var(--blue)" },
                { label: "Snittpoäng",    value: `${overallAvg}%`,                   icon: "📈", sub: "Genomsnitt på quizzen", color: "var(--forest)" },
                { label: "Ord övade",     value: `${wordsKnown}`,                    icon: "📝", sub: `${wordAccuracy}% precision`,  color: "#8B5CF6" },
                { label: "Berättelser",   value: `${storiesRead}`,                   icon: "📖", sub: `${storiesGenerated} AI-genererade`, color: "#D4A800" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}
                >
                  <div className="text-3xl mb-3">{stat.icon}</div>
                  <div className="text-3xl font-black mb-1" style={{ color: stat.color, fontVariantNumeric: "tabular-nums" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold mb-0.5">{stat.label}</div>
                  <div className="text-xs" style={{ color: "var(--text-light)" }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Secondary stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Streak-rekord",  value: `${bestStreak}d`,   icon: "🏆", color: "#D4A800" },
                { label: "Ordprecision",   value: `${wordAccuracy}%`, icon: "🎯", color: "var(--forest)" },
                { label: "Badges",         value: `${unlockedBadges.length}/${allBadges.length}`, icon: "🏅", color: "#8B5CF6" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
                  <div className="text-2xl">{stat.icon}</div>
                  <div>
                    <div className="font-bold text-xl" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-xs" style={{ color: "var(--text-light)" }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Course progress bars ── */}
            <div className="rounded-xl p-6" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h3 className="font-semibold mb-4">Kursframsteg</h3>
              <div className="space-y-5">
                {courseProgress.map(cp => {
                  const pct = cp.total > 0 ? (cp.completed / cp.total) * 100 : 0;
                  return (
                    <div key={cp.level}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-semibold">
                          Kurs {cp.level}{" "}
                          <span style={{ color: "var(--text-light)", fontWeight: 400 }}>({cp.label})</span>
                        </span>
                        <span style={{ color: "var(--text-light)" }}>
                          {cp.completed}/{cp.total}
                          {cp.avgScore > 0 && (
                            <span className="ml-2" style={{ color: "var(--blue)", fontWeight: 600 }}>
                              Snitt: {cp.avgScore}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-4 rounded-full overflow-hidden flex" style={{ background: "var(--warm-dark)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "var(--correct)"
                              : pct > 0 ? "linear-gradient(90deg, var(--blue), var(--forest))"
                              : "transparent",
                          }}
                        />
                      </div>
                      {pct === 100 && (
                        <div className="text-xs mt-1" style={{ color: "var(--correct)", fontWeight: 600 }}>
                          ✅ Kurs {cp.level} avklarad!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Streak calendar ── */}
            <div className="rounded-xl p-6" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h3 className="font-semibold mb-4">
                Aktivitetskalender{" "}
                <span className="text-sm font-normal" style={{ color: "var(--text-light)" }}>
                  (senaste 28 dagarna)
                </span>
              </h3>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {["Mån","Tis","Ons","Tor","Fre","Lör","Sön"].map(d => (
                  <div key={d} className="text-xs text-center font-medium py-1" style={{ color: "var(--text-light)" }}>
                    {d}
                  </div>
                ))}
                {streakDays.map((day, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md flex items-center justify-center text-xs"
                    style={{
                      background: day.active
                        ? day.intensity === "high" ? "var(--forest)"
                          : day.intensity === "medium" ? "var(--correct)"
                          : "#a7d5b8"
                        : day.future ? "transparent" : "var(--warm-dark)",
                      color: day.active ? "white" : "transparent",
                      border: day.isToday ? "2px solid var(--blue)" : "none",
                      opacity: day.future ? 0.3 : 1,
                    }}
                    title={day.date}
                  >
                    {day.isToday && (
                      <span style={{ color: day.active ? "white" : "var(--blue)", fontSize: "0.6rem" }}>
                        idag
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-light)" }}>
                <span>Mindre</span>
                <div className="flex gap-1">
                  {["var(--warm-dark)","#a7d5b8","var(--correct)","var(--forest)"].map((c, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: c }} />
                  ))}
                </div>
                <span>Mer</span>
              </div>
            </div>

            {/* ── Recent badges ── */}
            {unlockedBadges.length > 0 && (
              <div className="rounded-xl p-6" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Senaste badges</h3>
                  <button
                    onClick={() => setTab("achievements")}
                    className="text-sm cursor-pointer bg-transparent border-none"
                    style={{ color: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}
                  >
                    Visa alla →
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {unlockedBadges.slice(-5).reverse().map(b => (
                    <div
                      key={b.id}
                      className="flex-shrink-0 rounded-xl p-4 text-center min-w-[90px]"
                      style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow)" }}
                    >
                      <div className="text-3xl mb-1">{b.icon}</div>
                      <div className="text-xs font-semibold">{b.name_sv}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ACHIEVEMENTS TAB ═══ */}
        {tab === "achievements" && (
          <div className="space-y-6">
            {/* Summary */}
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background: "linear-gradient(135deg, var(--yellow-light), var(--warm))",
                border: "1px solid var(--yellow)",
              }}
            >
              <div className="text-5xl mb-3">🏅</div>
              <div className="text-3xl font-bold mb-1">
                {unlockedBadges.length}{" "}
                <span className="text-lg font-normal" style={{ color: "var(--text-light)" }}>
                  / {allBadges.length}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--text-light)" }}>badges upplåsta</p>
              <div
                className="w-full max-w-[300px] h-3 rounded-full overflow-hidden mx-auto mt-3"
                style={{ background: "var(--warm-dark)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${allBadges.length > 0 ? (unlockedBadges.length / allBadges.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, var(--yellow), var(--yellow-dark))",
                  }}
                />
              </div>
            </div>

            {unlockedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: "var(--correct)" }}>
                  ✅ Upplåsta ({unlockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {unlockedBadges.map(b => <BadgeCard key={b.id} badge={b} unlocked />)}
                </div>
              </div>
            )}

            {lockedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-light)" }}>
                  🔒 Låsta ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lockedBadges.map(b => <BadgeCard key={b.id} badge={b} unlocked={false} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ WEEKLY GOALS TAB ═══ */}
        {tab === "goals" && (
          <div className="space-y-6">
            {!userId ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow)" }}
              >
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-lg font-semibold mb-2">Logga in för att sätta veckomål!</p>
                <p className="text-sm" style={{ color: "var(--text-light)" }}>
                  Veckomål sparas i ditt konto och följer dig mellan enheter.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl p-6" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold">Denna vecka</h3>
                      <p className="text-sm" style={{ color: "var(--text-light)" }}>
                        {getWeekLabel()} · {getDaysRemaining()} dagar kvar
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingGoal(true)}
                      className="text-sm px-3 py-1.5 rounded-lg cursor-pointer border-2"
                      style={{ borderColor: "var(--warm-dark)", background: "white", fontFamily: "'Outfit', sans-serif", color: "var(--text)" }}
                    >
                      Ändra mål
                    </button>
                  </div>

                  {weeklyGoal && (
                    <>
                      {(() => {
                        const enc = getEncouragement(weeklyGoal);
                        return (
                          <div className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3 text-sm" style={{ background: "var(--warm)" }}>
                            <span className="text-2xl">{enc.emoji}</span>
                            <span style={{ color: enc.color, fontWeight: 500 }}>{enc.message}</span>
                          </div>
                        );
                      })()}

                      <div className="mb-5">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">XP denna vecka</span>
                          <span style={{ color: "var(--blue)" }}>{weeklyGoal.xpEarned} / {weeklyGoal.xpTarget} XP</span>
                        </div>
                        <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: "var(--warm-dark)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (weeklyGoal.xpEarned / weeklyGoal.xpTarget) * 100)}%`,
                              background: weeklyGoal.xpEarned >= weeklyGoal.xpTarget ? "var(--correct)" : "linear-gradient(90deg, var(--blue), var(--forest))",
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">Ämnen denna vecka</span>
                          <span style={{ color: "var(--blue)" }}>{weeklyGoal.topicsCompleted} / {weeklyGoal.topicsTarget} ämnen</span>
                        </div>
                        <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: "var(--warm-dark)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (weeklyGoal.topicsCompleted / weeklyGoal.topicsTarget) * 100)}%`,
                              background: weeklyGoal.topicsCompleted >= weeklyGoal.topicsTarget ? "var(--correct)" : "linear-gradient(90deg, var(--yellow), var(--yellow-dark))",
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {editingGoal && (
                    <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--warm-dark)" }}>
                      <h4 className="font-semibold mb-3">Välj ditt veckomål:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {goalPresets.map((preset, i) => (
                          <button
                            key={i}
                            onClick={() => handleSetGoal(preset.xp, preset.topics)}
                            className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                            style={{ borderColor: "var(--warm-dark)", background: "var(--warm)", fontFamily: "'Outfit', sans-serif" }}
                          >
                            <div className="font-semibold text-sm">{preset.label}</div>
                            <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                              {preset.xp} XP · {preset.topics} ämnen per vecka
                            </div>
                            <div className="text-xs mt-0.5 italic" style={{ color: "var(--text-light)" }}>{preset.desc}</div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setEditingGoal(false)}
                        className="mt-3 text-sm cursor-pointer bg-transparent border-none"
                        style={{ color: "var(--text-light)", fontFamily: "'Outfit', sans-serif" }}
                      >
                        Avbryt
                      </button>
                    </div>
                  )}
                </div>

                {goalHistory.length > 1 && (
                  <div className="rounded-xl p-6" style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                    <h3 className="font-semibold mb-4">Tidigare veckor</h3>
                    <div className="space-y-3">
                      {goalHistory.slice(1).map((g, i) => {
                        const xpPct = Math.min(100, Math.round((g.xpEarned / g.xpTarget) * 100));
                        const topicsPct = Math.min(100, Math.round((g.topicsCompleted / g.topicsTarget) * 100));
                        const achieved = xpPct >= 100 && topicsPct >= 100;
                        return (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: "var(--warm)" }}>
                            <span className="text-xl flex-shrink-0">{achieved ? "✅" : "📊"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">
                                Vecka {new Date(g.weekStart).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                              </div>
                              <div className="text-xs" style={{ color: "var(--text-light)" }}>
                                {g.xpEarned}/{g.xpTarget} XP · {g.topicsCompleted}/{g.topicsTarget} ämnen
                              </div>
                            </div>
                            <span className="text-sm font-bold flex-shrink-0" style={{ color: achieved ? "var(--correct)" : "var(--text-light)" }}>
                              {xpPct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <Footer />
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
    </>
  );
}


// ─── SHARE MODAL ─────────────────────────────────────────────────────────────
function ShareModal({ onClose }: { onClose: () => void }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = (window as unknown as Record<string, string>)._shareImageUrl;
    if (url) setImgUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  async function download() {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = "sfihub-min-resa.png";
    a.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText("https://sfihub.se");
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white", borderRadius: "20px", padding: "28px",
          maxWidth: "480px", width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", margin: 0 }}>
              Dela din resa 🇸🇪
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-light)", margin: "4px 0 0" }}>
              Ladda ner bilden och dela den på sociala medier
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--warm-dark)", border: "none", borderRadius: "50%",
              width: 36, height: 36, cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Preview */}
        {imgUrl && (
          <div style={{
            borderRadius: "12px", overflow: "hidden", marginBottom: "20px",
            border: "2px solid var(--warm-dark)", aspectRatio: "1",
          }}>
            <img src={imgUrl} alt="Delningsbild" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={download}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              background: "var(--blue)", color: "white", fontWeight: 700, fontSize: "0.95rem",
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            ⬇️ Ladda ner bild
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=https://sfihub.se`}
              target="_blank" rel="noopener noreferrer"
              style={{
                padding: "12px", borderRadius: "10px", border: "2px solid #0A66C2",
                background: "white", color: "#0A66C2", fontWeight: 600, fontSize: "0.85rem",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              in LinkedIn
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Jag lär mig Svenska på sfihub.se! 🇸🇪 #LearnSwedish #SFI #Svenska")}&url=https://sfihub.se`}
              target="_blank" rel="noopener noreferrer"
              style={{
                padding: "12px", borderRadius: "10px", border: "2px solid #000",
                background: "white", color: "#000", fontWeight: 600, fontSize: "0.85rem",
                cursor: "pointer", fontFamily: "'Outfit', sans-serif", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              𝕏 Twitter/X
            </a>
          </div>

          <button
            onClick={copyLink}
            style={{
              width: "100%", padding: "12px", borderRadius: "10px",
              border: "2px solid var(--warm-dark)", background: "var(--warm)",
              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "'Outfit', sans-serif", color: "var(--text)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            🔗 Kopiera länk till sfihub.se
          </button>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-light)", textAlign: "center", marginTop: "16px", marginBottom: 0 }}>
          Ladda ner bilden → ladda upp den manuellt på Instagram eller Facebook
        </p>
      </div>
    </div>
  );
}

// ─── BADGE CARD ───────────────────────────────────────────────────────────────
function BadgeCard({ badge, unlocked }: { badge: BadgeWithStatus; unlocked: boolean }) {
  const categoryColors: Record<string, string> = {
    beginner: "var(--forest-light)",
    progress: "var(--blue-light)",
    mastery: "var(--yellow-light)",
    streak: "#FDE8E6",
    special: "#F3E8FF",
  };
  return (
    <div
      className="rounded-xl p-4 text-center transition-all hover:-translate-y-0.5"
      style={{
        background: unlocked ? categoryColors[badge.category] || "var(--warm)" : "var(--warm)",
        opacity: unlocked ? 1 : 0.5,
        border: unlocked ? "1px solid rgba(0,0,0,0.06)" : "1px dashed var(--warm-dark)",
        boxShadow: unlocked ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
      }}
    >
      <div className="text-3xl mb-2" style={{ filter: unlocked ? "none" : "grayscale(1)" }}>
        {badge.icon}
      </div>
      <div className="text-xs font-semibold mb-0.5">{badge.name_sv}</div>
      <div className="text-xs" style={{ color: "var(--text-light)", lineHeight: 1.3 }}>
        {badge.description}
      </div>
      {!unlocked && badge.progressPct > 0 && (
        <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--warm-dark)" }}>
          <div className="h-full rounded-full" style={{ width: `${badge.progressPct}%`, background: "var(--blue)" }} />
        </div>
      )}
    </div>
  );
}

// ─── STREAK CALENDAR ──────────────────────────────────────────────────────────
interface StreakDay {
  date: string;
  active: boolean;
  intensity: "low" | "medium" | "high";
  isToday: boolean;
  future: boolean;
}

function generateStreakCalendar(progress: ProgressData): StreakDay[] {
  const days: StreakDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 27);
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  const activityDates = new Map<string, number>();
  for (const [, data] of Object.entries(progress.completedTopics)) {
    const dateKey = (data as { completedAt?: string }).completedAt
      ? (data as { completedAt: string }).completedAt.split("T")[0]
      : new Date().toISOString().split("T")[0];
    activityDates.set(dateKey, (activityDates.get(dateKey) || 0) + Math.ceil(data.bestScore / 20));
  }
  for (const [, wordData] of Object.entries(progress.wordHistory)) {
    if (wordData.lastSeen) {
      const dateKey = wordData.lastSeen.split("T")[0];
      activityDates.set(dateKey, (activityDates.get(dateKey) || 0) + 1);
    }
  }

  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const isToday = dateStr === today.toISOString().split("T")[0];
    const isFuture = date > today;
    const activity = activityDates.get(dateStr) || 0;
    let intensity: "low" | "medium" | "high" = "low";
    if (activity >= 5) intensity = "high";
    else if (activity >= 2) intensity = "medium";
    days.push({ date: dateStr, active: activity > 0, intensity, isToday, future: isFuture });
  }
  return days;
}
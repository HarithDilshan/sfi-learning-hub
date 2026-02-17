"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getUser } from "@/lib/auth";
import { getProgress, ProgressData } from "@/lib/progress";
import { getUserStats } from "@/lib/sync";
import { allBadges, getUnlockedBadges, getLockedBadges, Badge } from "@/lib/badges";
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
import { courseData } from "@/data";
import { getLevelMeta } from "@/lib/content";

type Tab = "overview" | "achievements" | "goals";

interface CourseProgress {
  level: string;
  label: string;
  total: number;
  completed: number;
  avgScore: number;
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [cloudStats, setCloudStats] = useState<{
    wordsLearned: number;
    wordsMastered: number;
  } | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null);
  const [goalHistory, setGoalHistory] = useState<WeeklyGoal[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const user = await getUser();
    const prog = getProgress();
    setProgress(prog);

    if (user) {
      setUserId(user.id);
      const stats = await getUserStats(user.id);
      if (stats) {
        setCloudStats({
          wordsLearned: stats.wordsLearned,
          wordsMastered: stats.wordsMastered,
        });
      }
      const goal = await loadWeeklyGoal(user.id);
      setWeeklyGoal(goal);
      const history = await loadGoalHistory(user.id);
      setGoalHistory(history);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => setProgress(getProgress());
    window.addEventListener("progress-update", handler);
    return () => window.removeEventListener("progress-update", handler);
  }, [loadData]);

  if (loading || !progress) {
    return (
      <>
        <Header />
        <div
          className="text-center py-20"
          style={{ color: "var(--text-light)" }}
        >
          Laddar profil...
        </div>
        <Footer />
      </>
    );
  }

  // Compute data
  const unlockedBadges = getUnlockedBadges(progress);
  const lockedBadges = getLockedBadges(progress);
  const meta = getLevelMeta();

  const courseProgress: CourseProgress[] = (["A", "B", "C", "D", "G"] as const).map(
    (level) => {
      const levelData = courseData[level];
      const topics = levelData?.topics || [];
      const completed = topics.filter(
        (t) => progress.completedTopics[t.id]
      ).length;
      const scores = topics
        .map((t) => progress.completedTopics[t.id]?.bestScore || 0)
        .filter((s) => s > 0);
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      return {
        level,
        label: meta[level]?.label || level,
        total: topics.length,
        completed,
        avgScore,
      };
    }
  );

  const totalTopics = courseProgress.reduce((s, c) => s + c.total, 0);
  const totalCompleted = courseProgress.reduce((s, c) => s + c.completed, 0);
  const wordsKnown = Object.keys(progress.wordHistory).length;
  const wordAccuracy =
    wordsKnown > 0
      ? Math.round(
          (Object.values(progress.wordHistory).reduce(
            (s, w) => s + w.correct,
            0
          ) /
            Object.values(progress.wordHistory).reduce(
              (s, w) => s + w.correct + w.wrong,
              0
            )) *
            100
        )
      : 0;

  const allTopicScores = Object.values(progress.completedTopics);
  const overallAvg =
    allTopicScores.length > 0
      ? Math.round(
          allTopicScores.reduce((s, t) => s + t.bestScore, 0) /
            allTopicScores.length
        )
      : 0;

  // Streak calendar: last 28 days
  const streakDays = generateStreakCalendar(progress);

  function getLevel(xp: number) {
    if (xp >= 5000) return { label: "Mästare", color: "#FFD700", bg: "#FFF8DC" };
    if (xp >= 2000) return { label: "Avancerad", color: "#8B5CF6", bg: "#F3E8FF" };
    if (xp >= 1000) return { label: "Duktig", color: "#2D8B4E", bg: "#E8F8EE" };
    if (xp >= 500) return { label: "Aktiv", color: "#005B99", bg: "#E8F4FD" };
    if (xp >= 100) return { label: "Nybörjare", color: "#D4A800", bg: "#FFF8D6" };
    return { label: "Ny", color: "#5A5A7A", bg: "#F0EBE1" };
  }

  const level = getLevel(progress.xp);

  async function handleSetGoal(xpTarget: number, topicsTarget: number) {
    if (!userId) return;
    const goal: WeeklyGoal = {
      xpTarget,
      topicsTarget,
      xpEarned: weeklyGoal?.xpEarned || 0,
      topicsCompleted: weeklyGoal?.topicsCompleted || 0,
      weekStart: weeklyGoal?.weekStart || new Date().toISOString().split("T")[0],
    };
    await saveWeeklyGoal(userId, goal);
    setWeeklyGoal(goal);
    setEditingGoal(false);
  }

  return (
    <>
      <Header />
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: "var(--text-light)" }}
        >
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>
            Hem
          </Link>
          <span>›</span>
          <span>Min Profil</span>
        </div>

        {/* ═══ PROFILE HEADER ═══ */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-8 text-white"
          style={{
            background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: level.bg, color: level.color }}
                >
                  {level.label}
                </span>
                <span className="text-sm opacity-60">
                  {unlockedBadges.length}/{allBadges.length} badges
                </span>
              </div>
              <h2
                className="text-3xl mb-1"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Min Profil
              </h2>
              {!userId && (
                <p className="text-sm opacity-70">
                  Logga in för att spara din progress permanent
                </p>
              )}
            </div>

            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{progress.xp}</div>
                <div className="text-xs opacity-60">XP</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{progress.streak}</div>
                <div className="text-xs opacity-60">Streak</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{totalCompleted}</div>
                <div className="text-xs opacity-60">Ämnen</div>
              </div>
            </div>
          </div>

          {/* XP progress to next level */}
          <div className="mt-6">
            <div className="flex justify-between text-xs opacity-60 mb-1">
              <span>{level.label}</span>
              <span>{getNextLevelXP(progress.xp)} XP till nästa nivå</span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${getLevelProgress(progress.xp)}%`,
                  background: "var(--yellow)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex gap-1 mb-8 overflow-x-auto">
          {(
            [
              { key: "overview", label: "📊 Översikt" },
              { key: "achievements", label: `🏅 Badges (${unlockedBadges.length})` },
              { key: "goals", label: "🎯 Veckomål" },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
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
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Ämnen klara", value: `${totalCompleted}/${totalTopics}`, icon: "📚" },
                { label: "Snittpoäng", value: `${overallAvg}%`, icon: "📈" },
                { label: "Ord övade", value: `${wordsKnown}`, icon: "📝" },
                { label: "Ordprecision", value: `${wordAccuracy}%`, icon: "🎯" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5 text-center"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: "var(--blue-dark)" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-light)" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Course Progress Bars */}
            <div
              className="rounded-xl p-6"
              style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-semibold mb-4">Kursframsteg</h3>
              <div className="space-y-4">
                {courseProgress.map((cp) => {
                  const pct = cp.total > 0 ? (cp.completed / cp.total) * 100 : 0;
                  return (
                    <div key={cp.level}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">
                          Kurs {cp.level}{" "}
                          <span style={{ color: "var(--text-light)" }}>({cp.label})</span>
                        </span>
                        <span style={{ color: "var(--text-light)" }}>
                          {cp.completed}/{cp.total}
                          {cp.avgScore > 0 && (
                            <span className="ml-2" style={{ color: "var(--blue)" }}>
                              Snitt: {cp.avgScore}%
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        className="w-full h-3 rounded-full overflow-hidden"
                        style={{ background: "var(--warm-dark)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct === 100
                                ? "var(--correct)"
                                : pct > 0
                                ? "linear-gradient(90deg, var(--blue), var(--forest))"
                                : "transparent",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak Calendar */}
            <div
              className="rounded-xl p-6"
              style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-semibold mb-4">
                Aktivitetskalender{" "}
                <span className="text-sm font-normal" style={{ color: "var(--text-light)" }}>
                  (senaste 28 dagarna)
                </span>
              </h3>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
                  <div
                    key={d}
                    className="text-xs text-center font-medium py-1"
                    style={{ color: "var(--text-light)" }}
                  >
                    {d}
                  </div>
                ))}
                {streakDays.map((day, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md flex items-center justify-center text-xs relative group"
                    style={{
                      background: day.active
                        ? day.intensity === "high"
                          ? "var(--forest)"
                          : day.intensity === "medium"
                          ? "var(--correct)"
                          : "#a7d5b8"
                        : day.future
                        ? "transparent"
                        : "var(--warm-dark)",
                      color: day.active ? "white" : "transparent",
                      border: day.isToday ? "2px solid var(--blue)" : "none",
                      opacity: day.future ? 0.3 : 1,
                    }}
                    title={day.date}
                  >
                    {day.isToday && (
                      <span style={{ color: day.active ? "white" : "var(--blue)", fontSize: "0.65rem" }}>
                        idag
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-light)" }}>
                <span>Mindre</span>
                <div className="flex gap-1">
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: "var(--warm-dark)" }} />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: "#a7d5b8" }} />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: "var(--correct)" }} />
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: "var(--forest)" }} />
                </div>
                <span>Mer</span>
              </div>
            </div>

            {/* Recent Badges */}
            {unlockedBadges.length > 0 && (
              <div
                className="rounded-xl p-6"
                style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
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
                  {unlockedBadges.slice(-5).reverse().map((b) => (
                    <div
                      key={b.id}
                      className="flex-shrink-0 rounded-xl p-4 text-center min-w-[100px]"
                      style={{ background: "var(--yellow-light)" }}
                    >
                      <div className="text-3xl mb-1">{b.icon}</div>
                      <div className="text-xs font-semibold">{b.nameSv}</div>
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
              <p className="text-sm" style={{ color: "var(--text-light)" }}>
                badges upplåsta
              </p>
              <div
                className="w-full max-w-[300px] h-3 rounded-full overflow-hidden mx-auto mt-3"
                style={{ background: "var(--warm-dark)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(unlockedBadges.length / allBadges.length) * 100}%`,
                    background: "linear-gradient(90deg, var(--yellow), var(--yellow-dark))",
                  }}
                />
              </div>
            </div>

            {/* Unlocked */}
            {unlockedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: "var(--correct)" }}>
                  ✅ Upplåsta ({unlockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {unlockedBadges.map((b) => (
                    <BadgeCard key={b.id} badge={b} unlocked />
                  ))}
                </div>
              </div>
            )}

            {/* Locked */}
            {lockedBadges.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-light)" }}>
                  🔒 Låsta ({lockedBadges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lockedBadges.map((b) => (
                    <BadgeCard key={b.id} badge={b} unlocked={false} />
                  ))}
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
                <p className="text-lg font-semibold mb-2">
                  Logga in för att sätta veckomål!
                </p>
                <p className="text-sm" style={{ color: "var(--text-light)" }}>
                  Veckomål sparas i ditt konto och följer dig mellan enheter.
                </p>
              </div>
            ) : (
              <>
                {/* Current Goal */}
                <div
                  className="rounded-xl p-6"
                  style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
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
                      style={{
                        borderColor: "var(--warm-dark)",
                        background: "white",
                        fontFamily: "'Outfit', sans-serif",
                        color: "var(--text)",
                      }}
                    >
                      Ändra mål
                    </button>
                  </div>

                  {weeklyGoal && (
                    <>
                      {/* Encouragement */}
                      {(() => {
                        const enc = getEncouragement(weeklyGoal);
                        return (
                          <div
                            className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3 text-sm"
                            style={{ background: "var(--warm)" }}
                          >
                            <span className="text-2xl">{enc.emoji}</span>
                            <span style={{ color: enc.color, fontWeight: 500 }}>
                              {enc.message}
                            </span>
                          </div>
                        );
                      })()}

                      {/* XP Goal */}
                      <div className="mb-5">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">XP denna vecka</span>
                          <span style={{ color: "var(--blue)" }}>
                            {weeklyGoal.xpEarned} / {weeklyGoal.xpTarget} XP
                          </span>
                        </div>
                        <div
                          className="w-full h-4 rounded-full overflow-hidden"
                          style={{ background: "var(--warm-dark)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700 relative"
                            style={{
                              width: `${Math.min(100, (weeklyGoal.xpEarned / weeklyGoal.xpTarget) * 100)}%`,
                              background:
                                weeklyGoal.xpEarned >= weeklyGoal.xpTarget
                                  ? "var(--correct)"
                                  : "linear-gradient(90deg, var(--blue), var(--forest))",
                            }}
                          />
                        </div>
                      </div>

                      {/* Topics Goal */}
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">Ämnen denna vecka</span>
                          <span style={{ color: "var(--blue)" }}>
                            {weeklyGoal.topicsCompleted} / {weeklyGoal.topicsTarget} ämnen
                          </span>
                        </div>
                        <div
                          className="w-full h-4 rounded-full overflow-hidden"
                          style={{ background: "var(--warm-dark)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(100, (weeklyGoal.topicsCompleted / weeklyGoal.topicsTarget) * 100)}%`,
                              background:
                                weeklyGoal.topicsCompleted >= weeklyGoal.topicsTarget
                                  ? "var(--correct)"
                                  : "linear-gradient(90deg, var(--yellow), var(--yellow-dark))",
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Goal Picker */}
                  {editingGoal && (
                    <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--warm-dark)" }}>
                      <h4 className="font-semibold mb-3">Välj ditt veckomål:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {goalPresets.map((preset, i) => (
                          <button
                            key={i}
                            onClick={() => handleSetGoal(preset.xp, preset.topics)}
                            className="text-left p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                            style={{
                              borderColor: "var(--warm-dark)",
                              background: "var(--warm)",
                              fontFamily: "'Outfit', sans-serif",
                            }}
                          >
                            <div className="font-semibold text-sm">{preset.label}</div>
                            <div
                              className="text-xs mt-1"
                              style={{ color: "var(--text-light)" }}
                            >
                              {preset.xp} XP · {preset.topics} ämnen per vecka
                            </div>
                            <div
                              className="text-xs mt-0.5 italic"
                              style={{ color: "var(--text-light)" }}
                            >
                              {preset.desc}
                            </div>
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

                {/* Goal History */}
                {goalHistory.length > 1 && (
                  <div
                    className="rounded-xl p-6"
                    style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                  >
                    <h3 className="font-semibold mb-4">Tidigare veckor</h3>
                    <div className="space-y-3">
                      {goalHistory.slice(1).map((g, i) => {
                        const xpPct = Math.min(100, Math.round((g.xpEarned / g.xpTarget) * 100));
                        const topicsPct = Math.min(
                          100,
                          Math.round((g.topicsCompleted / g.topicsTarget) * 100)
                        );
                        const achieved = xpPct >= 100 && topicsPct >= 100;

                        return (
                          <div
                            key={i}
                            className="flex items-center gap-4 p-3 rounded-lg"
                            style={{ background: "var(--warm)" }}
                          >
                            <span className="text-xl flex-shrink-0">
                              {achieved ? "✅" : "📊"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">
                                Vecka{" "}
                                {new Date(g.weekStart).toLocaleDateString("sv-SE", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: "var(--text-light)" }}
                              >
                                {g.xpEarned}/{g.xpTarget} XP ·{" "}
                                {g.topicsCompleted}/{g.topicsTarget} ämnen
                              </div>
                            </div>
                            <span
                              className="text-sm font-bold flex-shrink-0"
                              style={{
                                color: achieved ? "var(--correct)" : "var(--text-light)",
                              }}
                            >
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
    </>
  );
}

// ─── BADGE CARD COMPONENT ───
function BadgeCard({ badge, unlocked }: { badge: Badge; unlocked: boolean }) {
  const categoryColors: Record<string, string> = {
    beginner: "var(--forest-light)",
    progress: "var(--blue-light)",
    mastery: "var(--yellow-light)",
    streak: "#FDE8E6",
    special: "#F3E8FF",
  };

  return (
    <div
      className="rounded-xl p-4 text-center transition-all"
      style={{
        background: unlocked ? categoryColors[badge.category] || "var(--warm)" : "var(--warm)",
        opacity: unlocked ? 1 : 0.5,
        border: unlocked ? "1px solid rgba(0,0,0,0.06)" : "1px dashed var(--warm-dark)",
      }}
    >
      <div
        className="text-3xl mb-2"
        style={{ filter: unlocked ? "none" : "grayscale(1)" }}
      >
        {badge.icon}
      </div>
      <div className="text-xs font-semibold mb-0.5">{badge.nameSv}</div>
      <div className="text-xs" style={{ color: "var(--text-light)", lineHeight: 1.3 }}>
        {badge.description}
      </div>
    </div>
  );
}

// ─── HELPER FUNCTIONS ───
function getNextLevelXP(xp: number): number {
  const thresholds = [100, 500, 1000, 2000, 5000];
  for (const t of thresholds) {
    if (xp < t) return t - xp;
  }
  return 0;
}

function getLevelProgress(xp: number): number {
  const levels = [0, 100, 500, 1000, 2000, 5000];
  for (let i = 1; i < levels.length; i++) {
    if (xp < levels[i]) {
      const prev = levels[i - 1];
      const next = levels[i];
      return ((xp - prev) / (next - prev)) * 100;
    }
  }
  return 100;
}

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

  // Find the Monday 4 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 27);
  // Adjust to Monday
  const dayOfWeek = startDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + mondayOffset);

  // Collect all activity dates from completedTopics
  const activityDates = new Map<string, number>();
  for (const [topicId, data] of Object.entries(progress.completedTopics)) {
    // We track activity based on existing data
    // Count XP earned per topic as activity indicator
    const xpForTopic = data.bestScore > 0 ? Math.ceil(data.bestScore / 20) : 1;
    // Use today's date as fallback since we don't store per-topic dates in memory
    const dateKey = new Date().toISOString().split("T")[0];
    activityDates.set(dateKey, (activityDates.get(dateKey) || 0) + xpForTopic);
  }

  // Also check word history
  for (const [, wordData] of Object.entries(progress.wordHistory)) {
    if (wordData.lastSeen) {
      const dateKey = wordData.lastSeen.split("T")[0];
      activityDates.set(dateKey, (activityDates.get(dateKey) || 0) + 1);
    }
  }

  // Generate 28 days (4 weeks)
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

    days.push({
      date: dateStr,
      active: activity > 0,
      intensity,
      isToday,
      future: isFuture,
    });
  }

  return days;
}
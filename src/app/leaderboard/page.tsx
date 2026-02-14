"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getLeaderboard, getUserRank, updateDisplayName, LeaderboardEntry } from "@/lib/sync";
import { getUser } from "@/lib/auth";
import { getProgress } from "@/lib/progress";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [myStats, setMyStats] = useState({ xp: 0, streak: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const user = await getUser();
    if (user) {
      setCurrentUserId(user.id);
      const rank = await getUserRank(user.id);
      setMyRank(rank);
    }

    const progress = getProgress();
    setMyStats({ xp: progress.xp, streak: progress.streak });

    const data = await getLeaderboard(50);
    setEntries(data);
    setLoading(false);
  }

  async function handleSaveName() {
    if (!currentUserId || !nameInput.trim()) return;
    await updateDisplayName(currentUserId, nameInput.trim());
    setEditingName(false);
    loadData();
  }

  function getRankEmoji(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function getLevel(xp: number) {
    if (xp >= 5000) return { label: "Mästare", color: "#FFD700", bg: "#FFF8DC" };
    if (xp >= 2000) return { label: "Avancerad", color: "#8B5CF6", bg: "#F3E8FF" };
    if (xp >= 1000) return { label: "Duktig", color: "#2D8B4E", bg: "#E8F8EE" };
    if (xp >= 500) return { label: "Aktiv", color: "#005B99", bg: "#E8F4FD" };
    if (xp >= 100) return { label: "Nybörjare", color: "#D4A800", bg: "#FFF8D6" };
    return { label: "Ny", color: "#5A5A7A", bg: "#F0EBE1" };
  }

  function timeAgo(dateStr: string) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m sedan`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h sedan`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d sedan`;
    return `${Math.floor(days / 7)}v sedan`;
  }

  return (
    <>
      <Header />
      <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-10 pb-20 animate-fade-in">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Topplista</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
            🏆 Topplista (Leaderboard)
          </h2>
          <p style={{ color: "var(--text-light)" }}>
            Se vilka som lär sig mest svenska! Tjäna XP genom att klara övningar.
          </p>
        </div>

        {/* Current user stats card */}
        {currentUserId && (
          <div
            className="rounded-xl p-6 mb-8"
            style={{
              background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm opacity-75 mb-1">Din ranking</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold">
                    {myRank > 0 ? getRankEmoji(myRank) : "—"}
                  </span>
                  <div>
                    <p className="text-lg font-semibold">
                      {entries.find((e) => e.user_id === currentUserId)?.display_name || "Anonym elev"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setNameInput(entries.find((e) => e.user_id === currentUserId)?.display_name || "");
                      }}
                      className="text-xs underline opacity-75 hover:opacity-100 bg-transparent border-none text-white cursor-pointer"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Ändra namn
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{myStats.xp}</p>
                  <p className="text-xs opacity-75">XP</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{myStats.streak}</p>
                  <p className="text-xs opacity-75">Streak</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {entries.find((e) => e.user_id === currentUserId)?.topics_completed || 0}
                  </p>
                  <p className="text-xs opacity-75">Avklarade</p>
                </div>
              </div>
            </div>

            {editingName && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  placeholder="Ditt visningsnamn..."
                  maxLength={30}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "white",
                    fontFamily: "'Outfit', sans-serif",
                    outline: "none",
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-none"
                  style={{
                    background: "var(--yellow)",
                    color: "var(--text)",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Spara
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-3 py-2 rounded-lg text-sm cursor-pointer border-none"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {!currentUserId && (
          <div
            className="rounded-xl p-6 mb-8 text-center"
            style={{ background: "var(--yellow-light)", border: "1px solid var(--yellow)" }}
          >
            <p className="text-lg font-semibold mb-2">Logga in för att synas på topplistan!</p>
            <p className="text-sm" style={{ color: "var(--text-light)" }}>
              Dina poäng sparas bara när du är inloggad. Klicka på &quot;Logga in&quot; uppe till höger.
            </p>
          </div>
        )}

        {/* Leaderboard table */}
        {loading ? (
          <div className="text-center py-16" style={{ color: "var(--text-light)" }}>
            Laddar topplistan...
          </div>
        ) : entries.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-semibold mb-2">Topplistan är tom!</p>
            <p style={{ color: "var(--text-light)" }}>Bli den första — gör en övning och tjäna XP.</p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-3 rounded-lg font-semibold no-underline"
              style={{ background: "var(--blue)", color: "white" }}
            >
              Börja lära dig →
            </Link>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            {/* Table header */}
            <div
              className="grid items-center px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{
                gridTemplateColumns: "50px 1fr 80px 70px 80px 90px",
                background: "var(--warm)",
                color: "var(--text-light)",
              }}
            >
              <span>Rank</span>
              <span>Namn</span>
              <span className="text-center">XP</span>
              <span className="text-center hidden sm:block">Streak</span>
              <span className="text-center hidden sm:block">Ämnen</span>
              <span className="text-right hidden sm:block">Senast</span>
            </div>

            {/* Rows */}
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.user_id === currentUserId;
              const level = getLevel(entry.xp);

              return (
                <div
                  key={entry.user_id}
                  className="grid items-center px-4 sm:px-6 py-4 transition-colors"
                  style={{
                    gridTemplateColumns: "50px 1fr 80px 70px 80px 90px",
                    borderBottom: "1px solid var(--warm-dark)",
                    background: isMe ? "var(--blue-light)" : rank <= 3 ? "var(--yellow-light)" : "transparent",
                  }}
                >
                  {/* Rank */}
                  <span className="text-lg font-bold" style={{ color: rank <= 3 ? "var(--yellow-dark)" : "var(--text-light)" }}>
                    {getRankEmoji(rank)}
                  </span>

                  {/* Name + level badge */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-sm truncate ${isMe ? "font-bold" : "font-medium"}`} style={{ color: "var(--text)" }}>
                      {entry.display_name}
                      {isMe && <span className="ml-1 text-xs" style={{ color: "var(--blue)" }}>(du)</span>}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline"
                      style={{ background: level.bg, color: level.color, fontWeight: 600 }}
                    >
                      {level.label}
                    </span>
                  </div>

                  {/* XP */}
                  <span className="text-center font-bold text-sm" style={{ color: "var(--blue-dark)" }}>
                    {entry.xp.toLocaleString()}
                  </span>

                  {/* Streak */}
                  <span className="text-center text-sm hidden sm:block" style={{ color: "var(--text-light)" }}>
                    {entry.streak > 0 ? `🔥 ${entry.streak}` : "—"}
                  </span>

                  {/* Topics */}
                  <span className="text-center text-sm hidden sm:block" style={{ color: "var(--text-light)" }}>
                    {entry.topics_completed}
                  </span>

                  {/* Last active */}
                  <span className="text-right text-xs hidden sm:block" style={{ color: "var(--text-light)" }}>
                    {timeAgo(entry.last_activity)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* XP guide */}
        <div className="mt-8 rounded-xl p-6" style={{ background: "var(--forest-light)" }}>
          <h3 className="text-base font-semibold mb-3" style={{ color: "var(--forest)" }}>
            📐 Hur fungerar XP?
          </h3>
          <div className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            <p className="mb-2">
              Du tjänar <strong>10 XP</strong> per rätt svar i övningar. Får du 80% eller mer på en övning
              ökar din <strong>streak</strong> med 1.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: "Ny", min: "0" },
                { label: "Nybörjare", min: "100" },
                { label: "Aktiv", min: "500" },
                { label: "Duktig", min: "1000" },
                { label: "Avancerad", min: "2000" },
                { label: "Mästare", min: "5000" },
              ].map((l) => {
                const level = getLevel(parseInt(l.min));
                return (
                  <span
                    key={l.label}
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: level.bg, color: level.color }}
                  >
                    {level.label} ({l.min}+ XP)
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
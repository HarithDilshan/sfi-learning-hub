"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProgress } from "@/lib/progress";
import { getUser, signOut, onAuthChange } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthModal from "./AuthModal";
import { LogOut, User, Menu, X } from "lucide-react";
import NotificationBell from "./NotificationBell";

const navItems = [
  { href: "/", label: "Hem", key: "home" },
  { href: "/kurs/A", label: "Kurs A", key: "A" },
  { href: "/kurs/B", label: "Kurs B", key: "B" },
  { href: "/kurs/C", label: "Kurs C", key: "C" },
  { href: "/kurs/D", label: "Kurs D", key: "D" },
  { href: "/kurs/G", label: "Grammatik", key: "G" },
  { href: "/phrases", label: "Vardagsfraser", key: "phrases" },
  { href: "/daily", label: "📅 Dagens", key: "daily" },
  { href: "/review", label: "🔁 Repetition", key: "review" },
  { href: "/listening", label: "👂 Lyssna", key: "listening" },
  { href: "/sentences", label: "🧩 Meningar", key: "sentences" },
  { href: "/leaderboard", label: "🏆 Topplista", key: "leaderboard" },
  { href: "/profile", label: "👤 Profil", key: "profile" },
];

export default function Header() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const progress = getProgress();
    setXp(progress.xp);
    setStreak(progress.streak);

    const handler = () => {
      const p = getProgress();
      setXp(p.xp);
      setStreak(p.streak);
    };
    window.addEventListener("progress-update", handler);

    if (isSupabaseConfigured) {
      getUser().then(async (u) => {
        if (u) {
          setUser({ email: u.email });
          const { loadCloudProgress } = await import("@/lib/progress");
          await loadCloudProgress(u.id);
        } else {
          setUser(null);
        }
      });
      const sub = onAuthChange((u: unknown) => {
        const typed = u as { email?: string; id?: string } | null;
        setUser(typed);
        if (typed?.id) {
          import("@/lib/progress").then(({ loadCloudProgress }) => {
            loadCloudProgress(typed.id!);
          });
        } else {
          import("@/lib/progress").then(({ setUserId }) => setUserId(null));
        }
      });
      return () => {
        window.removeEventListener("progress-update", handler);
        sub.unsubscribe();
      };
    }

    return () => window.removeEventListener("progress-update", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setShowUserMenu(false);
  }

  function isActive(key: string) {
    if (key === "home") return pathname === "/";
    if (key === "phrases") return pathname === "/phrases";
    if (key === "daily") return pathname === "/daily";
    if (key === "review") return pathname === "/review";
    if (key === "listening") return pathname === "/listening";
    if (key === "sentences") return pathname === "/sentences";
    if (key === "leaderboard") return pathname === "/leaderboard";
    if (key === "profile") return pathname === "/profile";
    return pathname.startsWith(`/kurs/${key}`);
  }

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--blue-dark)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 md:px-8 py-3 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline shrink-0">
            <div
              className="w-[42px] h-[28px] rounded relative overflow-hidden border border-white/20"
              style={{ background: "var(--blue)" }}
            >
              <div className="absolute left-[12px] top-0 w-[7px] h-full" style={{ background: "var(--yellow)" }} />
              <div className="absolute left-0 top-[10px] w-full h-[7px]" style={{ background: "var(--yellow)" }} />
            </div>
            <h1
              className="text-white text-xl md:text-2xl"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Lär dig <span style={{ color: "var(--yellow)" }}>Svenska</span>
            </h1>
          </Link>

          {/* Desktop: stats + auth */}
          <div className="hidden md:flex items-center gap-3 text-white text-sm font-medium">
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
              <span>🔥</span>
              <span>{streak} streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
              <span>⭐</span>
              <span>{xp} XP</span>
            </div>
            <NotificationBell />

            {isSupabaseConfigured && (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-all"
                    >
                      <User size={14} />
                      <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
                    </button>
                    {showUserMenu && (
                      <div
                        className="absolute right-0 top-full mt-2 bg-white rounded-xl py-2 min-w-[200px] z-50"
                        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)", color: "var(--text)" }}
                      >
                        <div className="px-4 py-2 text-xs truncate" style={{ color: "var(--text-light)" }}>
                          {user.email}
                        </div>
                        <div className="border-t my-1" style={{ borderColor: "var(--warm-dark)" }} />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <LogOut size={14} />
                          Logga ut (Sign out)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuth(true)}
                    className="px-4 py-1.5 rounded-full font-semibold cursor-pointer transition-all hover:opacity-90"
                    style={{ background: "var(--yellow)", color: "var(--text)" }}
                  >
                    Logga in
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile: stats pill + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              <span className="bg-white/10 px-2.5 py-1 rounded-full">🔥 {streak}</span>
              <span className="bg-white/10 px-2.5 py-1 rounded-full">⭐ {xp}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all ml-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Desktop nav: horizontally scrollable, compact ── */}
        <nav className="hidden md:flex max-w-[1400px] mx-auto px-4 md:px-8 overflow-x-auto scrollbar-none">
          {navItems.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap no-underline border-b-[3px] transition-all ${isActive(key)
                  ? "text-white border-[var(--yellow)]"
                  : "text-white/60 border-transparent hover:text-white/90 hover:bg-white/5"
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Mobile nav drawer (slide down) ── */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-white/10"
            style={{ background: "var(--blue-dark)" }}
          >
            {/* Auth row */}
            {isSupabaseConfigured && (
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                {user ? (
                  <>
                    <span className="text-white/70 text-sm truncate max-w-[200px]">{user.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 text-white/70 text-sm bg-white/10 px-3 py-1.5 rounded-full"
                    >
                      <LogOut size={13} />
                      Logga ut
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowAuth(true); setMobileMenuOpen(false); }}
                    className="w-full py-2 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--yellow)", color: "var(--text)" }}
                  >
                    Logga in (Sign in)
                  </button>
                )}
              </div>
            )}
            <div className="px-3 pb-2">
              <NotificationBell mobile />
            </div>
            {/* Nav grid — 3 columns */}
            <div className="grid grid-cols-3 gap-px p-3">
              {navItems.map(({ href, label, key }) => (
                <Link
                  key={key}
                  href={href}
                  className={`flex flex-col items-center justify-center text-center px-2 py-3 rounded-xl text-xs font-medium no-underline transition-all ${isActive(key)
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
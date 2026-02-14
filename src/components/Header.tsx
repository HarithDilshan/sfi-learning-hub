"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProgress } from "@/lib/progress";
import { getUser, signOut, onAuthChange } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthModal from "./AuthModal";
import { LogOut, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Hem (Home)", key: "home" },
  { href: "/kurs/A", label: "Kurs A", key: "A" },
  { href: "/kurs/B", label: "Kurs B", key: "B" },
  { href: "/kurs/C", label: "Kurs C", key: "C" },
  { href: "/kurs/D", label: "Kurs D", key: "D" },
  { href: "/kurs/G", label: "Grammatik", key: "G" },
  { href: "/phrases", label: "Vardagsfraser", key: "phrases" },
  { href: "/leaderboard", label: "🏆 Topplista", key: "leaderboard" },
];

export default function Header() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

    // Check auth state
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

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setShowUserMenu(false);
  }

  function isActive(key: string) {
    if (key === "home") return pathname === "/";
    if (key === "phrases") return pathname === "/phrases";
    return pathname.startsWith(`/kurs/${key}`);
  }

  return (
    <>
      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--blue-dark)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 py-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div
              className="w-[42px] h-[28px] rounded relative overflow-hidden border border-white/20"
              style={{ background: "var(--blue)" }}
            >
              <div className="absolute left-[12px] top-0 w-[7px] h-full" style={{ background: "var(--yellow)" }} />
              <div className="absolute left-0 top-[10px] w-full h-[7px]" style={{ background: "var(--yellow)" }} />
            </div>
            <h1
              className="text-white text-2xl"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Lär dig <span style={{ color: "var(--yellow)" }}>Svenska</span>
            </h1>
          </Link>

          <div className="hidden md:flex items-center gap-4 text-white text-sm font-medium">
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
              <span>🔥</span>
              <span>{streak} streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
              <span>⭐</span>
              <span>{xp} XP</span>
            </div>

            {/* Auth section */}
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

          {/* Mobile auth button */}
          {isSupabaseConfigured && (
            <div className="md:hidden">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="text-white/70 text-xs px-3 py-1.5 rounded-full bg-white/10 cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                  style={{ background: "var(--yellow)", color: "var(--text)" }}
                >
                  Logga in
                </button>
              )}
            </div>
          )}
        </div>

        <nav className="flex max-w-[1400px] mx-auto px-4 md:px-8 overflow-x-auto">
          {navItems.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              className={`px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap no-underline border-b-[3px] transition-all ${isActive(key)
                ? "text-white border-[var(--yellow)]"
                : "text-white/60 border-transparent hover:text-white/90 hover:bg-white/5"
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
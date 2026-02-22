"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getProgress } from "@/lib/progress";
import { getUser, signOut, onAuthChange } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import AuthModal from "../AuthModal";
import { LogOut, User, Menu, X, ChevronDown } from "lucide-react";
import NotificationBell from "../NotificationBell";

// ─── NAV GROUPS ──────────────────────────────────────────────────────────────
const navGroups = [
  {
    label: "Kurser",
    key: "kurser",
    items: [
      { href: "/kurs/A", label: "Kurs A", sublabel: "Nybörjare", emoji: "🌱", key: "A" },
      { href: "/kurs/B", label: "Kurs B", sublabel: "Grundläggande", emoji: "📗", key: "B" },
      { href: "/kurs/C", label: "Kurs C", sublabel: "Mellanliggande", emoji: "📘", key: "C" },
      { href: "/kurs/D", label: "Kurs D", sublabel: "Avancerad", emoji: "📙", key: "D" },
      { href: "/kurs/G", label: "Grammatik", sublabel: "Alla regler", emoji: "📐", key: "G" },
      { href: "/phrases", label: "Vardagsfraser", sublabel: "Everyday phrases", emoji: "💬", key: "phrases" },
    ],
  },
  {
    label: "Öva",
    key: "ova",
    items: [
      { href: "/daily", label: "Dagens utmaning", sublabel: "Daily challenge", emoji: "📅", key: "daily" },
      { href: "/review", label: "Repetition", sublabel: "Spaced repetition", emoji: "🔁", key: "review" },
      { href: "/listening", label: "Lyssna", sublabel: "Listening comprehension", emoji: "👂", key: "listening" },
      { href: "/sentences", label: "Meningar", sublabel: "Sentence building", emoji: "🧩", key: "sentences" },
    ],
  },
  {
    label: "Verktyg",
    key: "verktyg",
    items: [
      { href: "/skrivning", label: "Skrivövning", sublabel: "Writing practice", emoji: "✍️", key: "skrivning" },
      { href: "/verb", label: "Verbträning", sublabel: "Conjugation drill", emoji: "🔤", key: "verb" },
      { href: "/berattelser", label: "Berättelser", sublabel: "Mini stories", emoji: "📖", key: "berattelser" },
      { href: "/uttal", label: "Uttal", sublabel: "Pronunciation recorder", emoji: "🎤", key: "uttal" },
    ],
  },
];

// Direct links (not in dropdown)
const directLinks = [
  { href: "/leaderboard", label: "🏆 Topplista", key: "leaderboard" },
  { href: "/profile", label: "👤 Profil", key: "profile" },
];

// All keys for isActive
const allNavKeys = [
  ...navGroups.flatMap(g => g.items.map(i => i.key)),
  ...directLinks.map(d => d.key),
];

// ─── DROPDOWN COMPONENT ───────────────────────────────────────────────────────
function NavDropdown({
  group,
  isGroupActive,
  pathname,
}: {
  group: typeof navGroups[number];
  isGroupActive: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-4 py-3 text-sm font-semibold border-b-[3px] transition-all cursor-pointer bg-transparent ${
          isGroupActive || open
            ? "text-white border-[var(--yellow)]"
            : "text-white/65 border-transparent hover:text-white hover:bg-white/5"
        }`}
      >
        {group.label}
        <ChevronDown
          size={13}
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            opacity: 0.7,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 rounded-xl overflow-hidden"
          style={{
            background: "white",
            boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
            minWidth: "240px",
            border: "1px solid rgba(0,0,0,0.07)",
            animation: "dropIn 0.15s ease",
          }}
        >
          <div className="p-1.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href === "/" ? "/x" : item.href)
                || (item.href === "/phrases" && pathname === "/phrases")
                || (item.key !== "home" && pathname.startsWith(`/kurs/${item.key}`));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-all group"
                  style={{
                    background: active ? "var(--blue-light)" : "transparent",
                    color: active ? "var(--blue)" : "var(--text)",
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "var(--warm)";
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span className="text-lg w-7 text-center shrink-0">{item.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold leading-tight" style={{ color: active ? "var(--blue)" : "var(--text)" }}>
                      {item.label}
                    </div>
                    <div className="text-xs leading-tight mt-0.5" style={{ color: "var(--text-light)" }}>
                      {item.sublabel}
                    </div>
                  </div>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--blue)" }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN HEADER ──────────────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setShowUserMenu(false);
  }

  function isGroupActive(groupKey: string) {
    const group = navGroups.find(g => g.key === groupKey);
    if (!group) return false;
    return group.items.some(item =>
      pathname.startsWith(item.href === "/" ? "/x" : item.href)
      || (item.key !== "home" && pathname.startsWith(`/kurs/${item.key}`))
    );
  }

  function isDirectActive(key: string) {
    if (key === "leaderboard") return pathname === "/leaderboard";
    if (key === "profile") return pathname === "/profile";
    return false;
  }

  return (
    <>
      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header
        className="sticky top-0 z-50"
        style={{ background: "var(--blue-dark)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 lg:px-8 py-3 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 no-underline shrink-0">
            <div
              className="w-[42px] h-[28px] rounded relative overflow-hidden border border-white/20 shrink-0"
              style={{ background: "var(--blue)" }}
            >
              <div className="absolute left-[12px] top-0 w-[7px] h-full" style={{ background: "var(--yellow)" }} />
              <div className="absolute left-0 top-[10px] w-full h-[7px]" style={{ background: "var(--yellow)" }} />
            </div>
            <h1
              className="text-white text-xl lg:text-2xl"
              style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: "-0.02em" }}
            >
              Lär dig <span style={{ color: "var(--yellow)" }}>Svenska</span>
            </h1>
          </Link>

          {/* Desktop: stats + auth */}
          <div className="hidden md:flex items-center gap-2.5 text-white text-sm font-medium">
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full text-xs">
              <span>🔥</span>
              <span>{streak} streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full text-xs">
              <span>⭐</span>
              <span>{xp} XP</span>
            </div>

            <NotificationBell />

            {isSupabaseConfigured && (
              <>
                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-all text-xs"
                    >
                      <User size={13} />
                      <span className="max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
                    </button>
                    {showUserMenu && (
                      <div
                        className="absolute right-0 top-full mt-2 bg-white rounded-xl py-2 min-w-[200px] z-50"
                        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)", color: "var(--text)", animation: "dropIn 0.15s ease" }}
                      >
                        <div className="px-4 py-2 text-xs truncate" style={{ color: "var(--text-light)" }}>
                          {user.email}
                        </div>
                        <div className="border-t my-1" style={{ borderColor: "var(--warm-dark)" }} />
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer no-underline"
                          style={{ color: "var(--text)" }}
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User size={14} />
                          Min profil
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                          style={{ color: "var(--text)" }}
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
                    className="px-4 py-1.5 rounded-full font-semibold cursor-pointer transition-all hover:opacity-90 text-xs"
                    style={{ background: "var(--yellow)", color: "var(--text)" }}
                  >
                    Logga in
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile: stats + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1.5 text-white text-xs font-medium">
              <span className="bg-white/10 px-2 py-1 rounded-full">🔥 {streak}</span>
              <span className="bg-white/10 px-2 py-1 rounded-full">⭐ {xp}</span>
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

        {/* ── Desktop nav: grouped dropdowns + direct links ── */}
        <nav className="hidden md:flex items-center max-w-[1400px] mx-auto px-4 lg:px-8">

          {/* Home link */}
          <Link
            href="/"
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap no-underline border-b-[3px] transition-all ${
              pathname === "/"
                ? "text-white border-[var(--yellow)]"
                : "text-white/65 border-transparent hover:text-white hover:bg-white/5"
            }`}
          >
            Hem
          </Link>

          {/* Group dropdowns */}
          {navGroups.map(group => (
            <NavDropdown
              key={group.key}
              group={group}
              isGroupActive={isGroupActive(group.key)}
              pathname={pathname}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Direct links */}
          {directLinks.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap no-underline border-b-[3px] transition-all ${
                isDirectActive(key)
                  ? "text-white border-[var(--yellow)]"
                  : "text-white/65 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Mobile menu (slide-down drawer) ── */}
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

            <div className="px-3 pt-2 pb-1">
              <NotificationBell mobile />
            </div>

            {/* Mobile: grouped sections */}
            <div className="px-3 pb-4 space-y-3">
              {/* Home */}
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
                style={{
                  background: pathname === "/" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                  color: "white",
                }}
              >
                <span className="text-base">🏠</span>
                <span className="text-sm font-semibold">Hem</span>
              </Link>

              {navGroups.map(group => (
                <div key={group.key}>
                  <div className="text-white/40 text-xs font-bold uppercase tracking-widest px-3 mb-1 mt-3">
                    {group.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map(item => {
                      const active = pathname.startsWith(item.href === "/" ? "/x" : item.href)
                        || (item.key !== "home" && pathname.startsWith(`/kurs/${item.key}`));
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl no-underline transition-all"
                          style={{
                            background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                            border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid transparent",
                            color: active ? "white" : "rgba(255,255,255,0.7)",
                          }}
                        >
                          <span className="text-base shrink-0">{item.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight truncate">{item.label}</div>
                            <div className="text-[10px] opacity-60 leading-tight truncate">{item.sublabel}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Direct links */}
              <div>
                <div className="text-white/40 text-xs font-bold uppercase tracking-widest px-3 mb-1 mt-3">
                  Konto
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {directLinks.map(({ href, label, key }) => (
                    <Link
                      key={key}
                      href={href}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl no-underline text-sm font-semibold transition-all"
                      style={{
                        background: isDirectActive(key) ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                        color: isDirectActive(key) ? "white" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
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
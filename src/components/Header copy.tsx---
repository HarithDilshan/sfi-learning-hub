"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getUser, signIn, signOut, onAuthChange } from "@/lib/auth";
import { getProgress, ProgressData } from "@/lib/progress";

interface NavItem {
  href: string;
  label: string;
  key: string;
  icon?: string;
}

// ─── NAV GROUPS ───
const courseItems: NavItem[] = [
  { href: "/kurs/A", label: "A", key: "A" },
  { href: "/kurs/B", label: "B", key: "B" },
  { href: "/kurs/C", label: "C", key: "C" },
  { href: "/kurs/D", label: "D", key: "D" },
  { href: "/kurs/G", label: "G", key: "G" },
];

const toolItems: NavItem[] = [
  { href: "/daily", label: "Dagens", key: "daily", icon: "📅" },
  { href: "/review", label: "Repetition", key: "review", icon: "🔁" },
  { href: "/listening", label: "Lyssna", key: "listening", icon: "👂" },
  { href: "/sentences", label: "Meningar", key: "sentences", icon: "🧩" },
];

const extraItems: NavItem[] = [
  { href: "/phrases", label: "Vardagsfraser", key: "phrases", icon: "💬" },
  { href: "/leaderboard", label: "Topplista", key: "leaderboard", icon: "🏆" },
  { href: "/profile", label: "Profil", key: "profile", icon: "👤" },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUser().then(async (u) => {
      if (u) {
        setUser({ email: u.email });
        const { setUserId, mergeCloudProgress } = await import("@/lib/progress");
        setUserId(u.id);
        await mergeCloudProgress(u.id);
      } else {
        setUser(null);
      }
    });

    const unsub = onAuthChange((u) => {
      const typed = u as { email?: string; id?: string } | null;
      setUser(typed);
      if (typed?.id) {
        import("@/lib/progress").then(({ setUserId, mergeCloudProgress }) => {
          setUserId(typed.id!);
          mergeCloudProgress(typed.id!);
        });
      } else {
        import("@/lib/progress").then(({ setUserId }) => setUserId(null));
      }
    });

    const updateProgress = () => setProgress(getProgress());
    updateProgress();
    window.addEventListener("progress-update", updateProgress);

    return () => {
      unsub();
      window.removeEventListener("progress-update", updateProgress);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowAuth(false);
  }, [pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleAuth() {
    setAuthError("");
    setAuthLoading(true);
    try {
      await signIn(email, password, authMode === "signup");
      setShowAuth(false);
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Något gick fel");
    }
    setAuthLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    import("@/lib/progress").then(({ setUserId }) => setUserId(null));
    window.dispatchEvent(new Event("progress-update"));
  }

  function isActive(href: string, key?: string) {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    if (key && pathname.includes(key.toLowerCase())) return true;
    return false;
  }

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "var(--blue-dark)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
    >
      {/* ═══ TOP BAR: Logo + Stats + Hamburger ═══ */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline text-white">
          <div className="relative w-[42px] h-[28px] rounded overflow-hidden" style={{ background: "var(--blue)", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div className="absolute left-[12px] top-0 w-[7px] h-full" style={{ background: "var(--yellow)" }} />
            <div className="absolute left-0 top-[10px] w-full h-[7px]" style={{ background: "var(--yellow)" }} />
          </div>
          <h1 className="text-xl sm:text-2xl" style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: "-0.02em" }}>
            Lär dig <span style={{ color: "var(--yellow)" }}>Svenska</span>
          </h1>
        </Link>

        {/* Right: Stats + Auth + Hamburger */}
        <div className="flex items-center gap-3">
          {/* Stats badges - always visible */}
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <span>🔥</span>
              <span className="text-white text-xs sm:text-sm">{progress?.streak || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <span>⭐</span>
              <span className="text-white text-xs sm:text-sm">{progress?.xp || 0}</span>
            </div>
          </div>

          {/* Auth button - desktop only */}
          <div className="hidden lg:block">
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer border-none"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontFamily: "'Outfit', sans-serif" }}
              >
                Logga ut
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-xs px-3 py-1.5 rounded-full cursor-pointer border-none font-semibold"
                style={{ background: "var(--yellow)", color: "var(--text)", fontFamily: "'Outfit', sans-serif" }}
              >
                Logga in
              </button>
            )}
          </div>

          {/* Hamburger - mobile/tablet only */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg cursor-pointer border-none"
            style={{ background: "rgba(255,255,255,0.1)" }}
            aria-label="Meny"
          >
            <span className="block w-5 h-0.5 rounded-full bg-white mb-1 transition-all" style={{
              transform: mobileOpen ? "rotate(45deg) translate(2px, 2px)" : "none",
            }} />
            <span className="block w-5 h-0.5 rounded-full bg-white mb-1 transition-all" style={{
              opacity: mobileOpen ? 0 : 1,
            }} />
            <span className="block w-5 h-0.5 rounded-full bg-white transition-all" style={{
              transform: mobileOpen ? "rotate(-45deg) translate(2px, -2px)" : "none",
            }} />
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP NAV - Two rows ═══ */}
      <nav className="hidden lg:block max-w-[1400px] mx-auto px-8" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1 py-1">
          {/* Home */}
          <NavLink href="/" label="Hem" active={pathname === "/"} />

          {/* Course group */}
          <span className="text-xs text-white/30 mx-2">│</span>
          <span className="text-xs font-semibold text-white/40 mr-1 uppercase tracking-wide">Kurser</span>
          {courseItems.map((item) => (
            <NavLink
              key={item.key}
              href={item.href}
              label={item.label}
              active={isActive(item.href)}
              compact
            />
          ))}

          {/* Tools group */}
          <span className="text-xs text-white/30 mx-2">│</span>
          <span className="text-xs font-semibold text-white/40 mr-1 uppercase tracking-wide">Öva</span>
          {toolItems.map((item) => (
            <NavLink
              key={item.key}
              href={item.href}
              label={`${item.icon} ${item.label}`}
              active={isActive(item.href)}
            />
          ))}

          {/* Extra group */}
          <span className="text-xs text-white/30 mx-2">│</span>
          {extraItems.map((item) => (
            <NavLink
              key={item.key}
              href={item.href}
              label={`${item.icon} ${item.label}`}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </nav>

      {/* ═══ MOBILE MENU - Full-screen overlay ═══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div
            ref={menuRef}
            className="absolute top-0 right-0 w-[85%] max-w-[360px] h-full overflow-y-auto animate-slide-in-right"
            style={{ background: "var(--blue-dark)" }}
          >
            {/* Close button */}
            <div className="flex justify-between items-center p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-white font-semibold">Meny</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer border-none text-white text-xl"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Home */}
              <MobileLink href="/" label="🏠 Hem (Home)" active={pathname === "/"} />

              {/* Courses */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                  Kurser
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {courseItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center py-3 rounded-lg text-sm font-semibold no-underline transition-all"
                      style={{
                        background: isActive(item.href) ? "var(--yellow)" : "rgba(255,255,255,0.08)",
                        color: isActive(item.href) ? "var(--text)" : "white",
                      }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Practice tools */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                  Öva & Lär
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {toolItems.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium no-underline transition-all"
                      style={{
                        background: isActive(item.href) ? "rgba(254,204,2,0.15)" : "rgba(255,255,255,0.05)",
                        color: isActive(item.href) ? "var(--yellow)" : "rgba(255,255,255,0.8)",
                        border: isActive(item.href) ? "1px solid rgba(254,204,2,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Extra */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                  Mer
                </p>
                <div className="space-y-1">
                  {extraItems.map((item) => (
                    <MobileLink
                      key={item.key}
                      href={item.href}
                      label={`${item.icon} ${item.label}`}
                      active={isActive(item.href)}
                    />
                  ))}
                </div>
              </div>

              {/* Auth section */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
                {user ? (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50">{user.email}</p>
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                      className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer border-none"
                      style={{ background: "rgba(255,255,255,0.1)", color: "white", fontFamily: "'Outfit', sans-serif" }}
                    >
                      Logga ut
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAuth(true); setMobileOpen(false); }}
                    className="w-full py-3 rounded-lg text-sm font-semibold cursor-pointer border-none"
                    style={{ background: "var(--yellow)", color: "var(--text)", fontFamily: "'Outfit', sans-serif" }}
                  >
                    Logga in / Registrera
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUTH MODAL ═══ */}
      {showAuth && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => e.target === e.currentTarget && setShowAuth(false)}
        >
          <div className="w-full max-w-[400px] rounded-2xl p-6 sm:p-8 animate-slide-up" style={{ background: "white" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {authMode === "login" ? "Logga in" : "Skapa konto"}
              </h3>
              <button
                onClick={() => setShowAuth(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border-none text-lg"
                style={{ background: "var(--warm)", color: "var(--text-light)" }}
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="px-4 py-2.5 rounded-lg text-sm mb-4" style={{ background: "var(--wrong-bg)", color: "var(--wrong)" }}>
                {authError}
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-post"
              className="w-full px-4 py-3 rounded-lg border-2 text-sm mb-3 focus:outline-none"
              style={{ borderColor: "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              placeholder="Lösenord"
              className="w-full px-4 py-3 rounded-lg border-2 text-sm mb-4 focus:outline-none"
              style={{ borderColor: "var(--warm-dark)", fontFamily: "'Outfit', sans-serif" }}
            />

            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white cursor-pointer border-none disabled:opacity-50"
              style={{ background: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}
            >
              {authLoading ? "Vänta..." : authMode === "login" ? "Logga in" : "Skapa konto"}
            </button>

            <p className="text-center text-sm mt-4" style={{ color: "var(--text-light)" }}>
              {authMode === "login" ? "Inget konto? " : "Har du redan konto? "}
              <button
                onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}
                className="bg-transparent border-none cursor-pointer underline font-medium"
                style={{ color: "var(--blue)", fontFamily: "'Outfit', sans-serif" }}
              >
                {authMode === "login" ? "Registrera dig" : "Logga in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ═══ ANIMATIONS ═══ */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </header>
  );
}

// ─── Desktop nav link ───
function NavLink({ href, label, active, compact }: { href: string; label: string; active: boolean; compact?: boolean }) {
  return (
    <Link
      href={href}
      className="no-underline transition-all text-nowrap"
      style={{
        padding: compact ? "6px 10px" : "6px 14px",
        borderRadius: "6px",
        fontSize: compact ? "0.82rem" : "0.8rem",
        fontWeight: active ? 600 : 500,
        color: active ? "white" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.12)" : "transparent",
        borderBottom: active ? "2px solid var(--yellow)" : "2px solid transparent",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {label}
    </Link>
  );
}

// ─── Mobile nav link ───
function MobileLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center px-4 py-3 rounded-lg no-underline text-sm font-medium transition-all"
      style={{
        background: active ? "rgba(254,204,2,0.15)" : "transparent",
        color: active ? "var(--yellow)" : "rgba(255,255,255,0.8)",
      }}
    >
      {label}
    </Link>
  );
}
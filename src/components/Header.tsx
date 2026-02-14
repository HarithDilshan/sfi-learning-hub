"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getProgress } from "@/lib/progress";

const navItems = [
  { href: "/", label: "Hem (Home)", key: "home" },
  { href: "/kurs/A", label: "Kurs A", key: "A" },
  { href: "/kurs/B", label: "Kurs B", key: "B" },
  { href: "/kurs/C", label: "Kurs C", key: "C" },
  { href: "/kurs/D", label: "Kurs D", key: "D" },
  { href: "/phrases", label: "Vardagsfraser", key: "phrases" },
];

export default function Header() {
  const pathname = usePathname();
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const progress = getProgress();
    setXp(progress.xp);
    setStreak(progress.streak);

    // Listen for custom progress updates
    const handler = () => {
      const p = getProgress();
      setXp(p.xp);
      setStreak(p.streak);
    };
    window.addEventListener("progress-update", handler);
    return () => window.removeEventListener("progress-update", handler);
  }, []);

  function isActive(key: string, href: string) {
    if (key === "home") return pathname === "/";
    if (key === "phrases") return pathname === "/phrases";
    return pathname.startsWith(`/kurs/${key}`);
  }

  return (
    <header className="sticky top-0 z-50" style={{ background: "var(--blue-dark)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
      <div className="flex items-center justify-between px-4 md:px-8 py-4 max-w-[1400px] mx-auto">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-[42px] h-[28px] rounded relative overflow-hidden border border-white/20" style={{ background: "var(--blue)" }}>
            <div className="absolute left-[12px] top-0 w-[7px] h-full" style={{ background: "var(--yellow)" }} />
            <div className="absolute left-0 top-[10px] w-full h-[7px]" style={{ background: "var(--yellow)" }} />
          </div>
          <h1 className="text-white text-2xl" style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400, letterSpacing: "-0.02em" }}>
            Lär dig <span style={{ color: "var(--yellow)" }}>Svenska</span>
          </h1>
        </Link>

        <div className="hidden md:flex items-center gap-5 text-white text-sm font-medium">
          <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>🔥</span>
            <span>{streak} streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full">
            <span>⭐</span>
            <span>{xp} XP</span>
          </div>
        </div>
      </div>

      <nav className="flex max-w-[1400px] mx-auto px-4 md:px-8 overflow-x-auto">
        {navItems.map(({ href, label, key }) => (
          <Link
            key={key}
            href={href}
            className={`px-4 md:px-6 py-3 text-sm font-medium whitespace-nowrap no-underline border-b-[3px] transition-all ${
              isActive(key, href)
                ? "text-white border-[var(--yellow)]"
                : "text-white/60 border-transparent hover:text-white/90 hover:bg-white/5"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

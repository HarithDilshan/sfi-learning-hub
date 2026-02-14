import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { levelMeta, phrasesData } from "@/data";
import { LevelKey } from "@/data/types";

export default function Home() {
  const levels: LevelKey[] = ["A", "B", "C", "D"];

  return (
    <>
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden text-center text-white py-20 px-8" style={{ background: "linear-gradient(135deg, var(--blue) 0%, var(--blue-dark) 100%)" }}>
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-hero-float" style={{
          background: "radial-gradient(circle at 30% 40%, rgba(254,204,2,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.04) 0%, transparent 50%)"
        }} />
        <div className="relative z-10 max-w-[700px] mx-auto animate-slide-up">
          <h2 className="text-4xl md:text-5xl mb-4 leading-tight" style={{ fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
            Learn Swedish the <em style={{ color: "var(--yellow)" }}>SFI Way</em>
          </h2>
          <p className="text-lg opacity-85 leading-relaxed mb-8">
            Free interactive lessons aligned with Sweden&apos;s SFI curriculum. Practice vocabulary, grammar, reading, and conversation skills — from absolute beginner to advanced.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {levels.map((l) => (
              <Link
                key={l}
                href={`/kurs/${l}`}
                className="bg-white/10 backdrop-blur border border-white/15 rounded-xl p-6 min-w-[160px] text-left no-underline text-white transition-all hover:bg-white/18 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl" style={{ fontFamily: "'DM Serif Display', serif", color: "var(--yellow)" }}>Kurs {l}</div>
                <div className="text-sm opacity-80 mt-1">{levelMeta[l].label}</div>
                <div className="text-xs opacity-60 mt-2 leading-snug">{levelMeta[l].desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1100px] mx-auto px-8 py-10 pb-20">
        <div className="mb-8">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Välkommen! 🇸🇪</h2>
          <p style={{ color: "var(--text-light)" }}>Choose your SFI level above or explore everyday phrases below.</p>
        </div>

        <div className="rounded-xl p-5 flex gap-3 items-start mb-10" style={{ background: "var(--yellow-light)" }}>
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-sm leading-relaxed">
            <strong>What is SFI?</strong> Svenska för invandrare (Swedish for Immigrants) is Sweden&apos;s free language program with 4 levels: A (beginner) through D (advanced). Each level builds on the previous one, preparing you for everyday life and work in Sweden.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Quick Start Phrases</h2>
          <p style={{ color: "var(--text-light)" }}>Essential Swedish phrases you&apos;ll use every day.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {phrasesData.slice(0, 3).map((cat, i) => (
            <Link
              key={i}
              href="/phrases"
              className="bg-white rounded-xl p-7 no-underline transition-all hover:-translate-y-1 hover:shadow-lg relative overflow-hidden border border-black/5"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", color: "var(--text)" }}
            >
              <div className="absolute top-0 left-0 w-1 h-full opacity-0 hover:opacity-100 transition-opacity" style={{ background: "var(--blue)" }} />
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-lg font-semibold mb-1.5">{cat.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-light)" }}>{cat.phrases.slice(0, 2).map((p) => p.sv).join(" · ")}</p>
              <div className="mt-4">
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--warm)", color: "var(--text-light)" }}>
                  {cat.phrases.length} phrases
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}

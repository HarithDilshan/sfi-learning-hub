"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { getPhrases } from "@/lib/content";
import { PhraseCategory } from "@/data/types";
import { speak } from "@/lib/speech";
import { Volume2 } from "lucide-react";
import type { Metadata } from "next";
import { LoadingState } from "@/components/LoadingSystem";

export const phrasesMetadata: Metadata = {
  title: "Vardagsfraser — Everyday Swedish Phrases",
  description:
    "Practical Swedish phrases for everyday life in Sweden — at the store, on the bus, at the bank, school, and on the phone. Free SFI learning resource.",
  alternates: { canonical: "/phrases" },
  openGraph: {
    title: "Everyday Swedish Phrases | Lär dig Svenska",
    description:
      "Practical Swedish phrases for everyday life in Sweden. Perfect for SFI students.",
    url: "/phrases",
  },
};

export default function PhrasesPage() {
  const [phrasesData, setPhrasesData] = useState<PhraseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhrases().then((data) => {
      setPhrasesData(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 pb-20 animate-fade-in">
          <LoadingState type="content" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 pb-20 animate-fade-in">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Vardagsfraser (Everyday Phrases)</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Vardagsfraser — Everyday Phrases</h2>
          <p style={{ color: "var(--text-light)" }}>Practical phrases for real-life situations in Sweden. Click 🔊 to hear the pronunciation.</p>
        </div>

        {phrasesData.map((cat, ci) => (
          <div key={ci} className="mb-10">
            <h3 className="text-xl font-semibold mb-4">{cat.icon} {cat.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.phrases.map((p, pi) => (
                <div
                  key={pi}
                  className="bg-white p-4 px-5 rounded-lg flex items-center gap-3 border border-black/5"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
                  <button
                    onClick={() => speak(p.sv)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                    style={{ background: "var(--blue-light)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue)"; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-light)"; e.currentTarget.style.color = "inherit"; }}
                  >
                    <Volume2 size={16} />
                  </button>
                  <div>
                    <div className="font-semibold" style={{ color: "var(--blue-dark)" }}>{p.sv}</div>
                    <div className="text-sm" style={{ color: "var(--text-light)" }}>{p.en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </>
  );
}

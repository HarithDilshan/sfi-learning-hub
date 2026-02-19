"use client";

import { VocabWord } from "@/data/types";
import { speak } from "@/lib/tts";
import { Volume2 } from "lucide-react";

export default function VocabTable({ words }: { words: VocabWord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Svenska", "English", "Pronunciation", ""].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ background: "var(--warm)", color: "var(--text-light)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((w, i) => (
            <tr key={i} className="hover:bg-[var(--blue-light)] transition-colors">
              <td className="px-4 py-3.5 font-semibold" style={{ color: "var(--blue-dark)", borderBottom: "1px solid var(--warm-dark)" }}>{w.sv}</td>
              <td className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--warm-dark)" }}>{w.en}</td>
              <td className="px-4 py-3.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", color: "var(--text-light)", borderBottom: "1px solid var(--warm-dark)" }}>/{w.pron}/</td>
              <td className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--warm-dark)" }}>
                <button
                  onClick={() => speak(w.sv)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:text-white cursor-pointer"
                  style={{ background: "var(--blue-light)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-light)"; e.currentTarget.style.color = "inherit"; }}
                  title="Listen"
                >
                  <Volume2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

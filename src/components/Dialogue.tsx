"use client";

import { DialogueLine } from "@/data/types";
import { speak } from "@/lib/tts";
import { Volume2 } from "lucide-react";

export default function Dialogue({ lines }: { lines: DialogueLine[] }) {
  return (
    <div className="rounded-xl p-7 my-6 bg-white" style={{ borderLeft: "4px solid var(--yellow)" }}>
      {lines.map((line, i) => (
        <div key={i} className={`flex gap-3 items-start ${i < lines.length - 1 ? "mb-4" : ""}`}>
          <div className="font-bold text-xs uppercase tracking-wide min-w-[60px] pt-0.5" style={{ color: "var(--blue)" }}>
            {line.speaker}
          </div>
          <div className="text-base leading-relaxed">
            <span className="font-semibold block">
              {line.sv}
              <button
                onClick={() => speak(line.sv)}
                className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full ml-1 align-middle text-xs transition-all cursor-pointer"
                style={{ background: "var(--blue-light)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--blue)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--blue-light)"; e.currentTarget.style.color = "inherit"; }}
              >
                <Volume2 size={12} />
              </button>
            </span>
            <span className="text-sm italic" style={{ color: "var(--text-light)" }}>{line.en}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

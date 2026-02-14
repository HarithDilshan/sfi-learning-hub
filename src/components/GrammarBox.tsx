import { GrammarNote } from "@/data/types";

export default function GrammarBox({ grammar }: { grammar: GrammarNote }) {
  return (
    <div className="rounded-xl p-7 my-6" style={{ background: "var(--forest-light)" }}>
      <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--forest)" }}>
        📐 {grammar.title}
      </h4>
      <div className="text-[0.95rem] leading-relaxed mb-2">{grammar.rule}</div>
      <div className="bg-white p-3 px-4 rounded-lg mt-3 whitespace-pre-line" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88rem" }}>
        {grammar.example}
      </div>
    </div>
  );
}

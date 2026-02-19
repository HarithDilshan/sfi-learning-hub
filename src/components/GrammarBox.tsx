import { GrammarNote } from "@/data/types";

// Parses a line and renders inline bold (**text**) and highlights (==text==)
function InlineLine({ text }: { text: string }) {
  // Split on **bold** and ==highlight== markers
  const parts = text.split(/(\*\*[^*]+\*\*|==\w[^=]*==)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("==") && part.endsWith("==")) {
          return (
            <mark
              key={i}
              style={{
                background: "var(--yellow-light)",
                color: "var(--text)",
                padding: "1px 4px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              {part.slice(2, -2)}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Renders a block of text with smart formatting:
// - Blank lines → paragraph breaks
// - Lines ending with : → section header
// - Lines starting with spaces or → → indented
// - WRONG/RIGHT/NOTE/TIP/KEY → colored callouts
// - ✓ / ✗ → colored indicators
function FormattedText({
  text,
  monospace = false,
}: {
  text: string;
  monospace?: boolean;
}) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip blank lines (used as spacers)
    if (trimmed === "") {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Section header — line ends with : and is short
    if (trimmed.endsWith(":") && trimmed.length < 60 && !trimmed.includes("→")) {
      elements.push(
        <div
          key={i}
          className="font-semibold mt-3 mb-1 text-[0.8rem] uppercase tracking-wider"
          style={{ color: "var(--forest)" }}
        >
          {trimmed.slice(0, -1)}
        </div>
      );
      i++;
      continue;
    }

    // WRONG / RIGHT callout lines
    if (trimmed.startsWith("WRONG:") || trimmed.includes("✗")) {
      elements.push(
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-1.5 rounded-lg my-1 text-[0.88rem]"
          style={{ background: "var(--wrong-bg)", color: "var(--wrong)" }}
        >
          <span className="flex-shrink-0">✗</span>
          <InlineLine text={trimmed.replace(/^WRONG:\s*/, "").replace("✗", "").trim()} />
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith("RIGHT:") || trimmed.includes("✓")) {
      elements.push(
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-1.5 rounded-lg my-1 text-[0.88rem]"
          style={{ background: "var(--correct-bg)", color: "var(--correct)" }}
        >
          <span className="flex-shrink-0">✓</span>
          <InlineLine text={trimmed.replace(/^RIGHT:\s*/, "").replace("✓", "").trim()} />
        </div>
      );
      i++;
      continue;
    }

    // NOTE / KEY / TIP callout
    if (
      trimmed.startsWith("NOTE:") ||
      trimmed.startsWith("KEY:") ||
      trimmed.startsWith("TIP:") ||
      trimmed.startsWith("IMPORTANT:")
    ) {
      const label = trimmed.split(":")[0];
      const content = trimmed.slice(label.length + 1).trim();
      elements.push(
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2 rounded-lg my-2 text-[0.88rem]"
          style={{ background: "var(--yellow-light)", color: "var(--text)" }}
        >
          <span className="flex-shrink-0 font-bold" style={{ color: "var(--yellow-dark)" }}>
            {label}
          </span>
          <InlineLine text={content} />
        </div>
      );
      i++;
      continue;
    }

    // Indented line (starts with spaces or →) — treat as example sub-item
    if (raw.startsWith("   ") || trimmed.startsWith("→")) {
      elements.push(
        <div
          key={i}
          className="ml-4 pl-3 border-l-2 my-0.5 text-[0.88rem]"
          style={{
            borderColor: "var(--forest)",
            color: "var(--text-light)",
            fontFamily: monospace ? "'JetBrains Mono', monospace" : undefined,
          }}
        >
          <InlineLine text={trimmed.replace(/^→\s*/, "")} />
        </div>
      );
      i++;
      continue;
    }

    // Numbered list item (1. 2. 3.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 text-[0.9rem]">
          <span
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[0.7rem] font-bold mt-0.5"
            style={{ background: "var(--forest)", color: "white" }}
          >
            {numberedMatch[1]}
          </span>
          <div>
            <InlineLine text={numberedMatch[2]} />
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <div
        key={i}
        className="text-[0.92rem] leading-relaxed my-0.5"
        style={{ fontFamily: monospace ? "'JetBrains Mono', monospace" : undefined }}
      >
        <InlineLine text={trimmed} />
      </div>
    );
    i++;
  }

  return <>{elements}</>;
}

// Splits example block into labelled rows if they contain parenthesised translations
function ExampleBlock({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Lines with → separator
        if (trimmed.includes("→")) {
          const [left, right] = trimmed.split("→").map((s) => s.trim());
          return (
            <div key={i} className="flex items-start gap-2 flex-wrap">
              <span
                className="font-semibold"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--blue-dark)",
                  fontSize: "0.88rem",
                }}
              >
                {left}
              </span>
              <span style={{ color: "var(--forest)", fontSize: "0.85rem" }}>→</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--forest)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                {right}
              </span>
            </div>
          );
        }

        // Lines with parenthesised English translation
        const parenMatch = trimmed.match(/^(.+?)\s*\((.+)\)\s*$/);
        if (parenMatch) {
          return (
            <div key={i} className="flex items-baseline gap-3 flex-wrap">
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--blue-dark)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                {parenMatch[1].trim()}
              </span>
              <span
                style={{
                  color: "var(--text-light)",
                  fontSize: "0.82rem",
                  fontStyle: "italic",
                }}
              >
                ({parenMatch[2]})
              </span>
            </div>
          );
        }

        // Plain example line
        return (
          <div
            key={i}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--blue-dark)",
              fontSize: "0.88rem",
            }}
          >
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

export default function GrammarBox({ grammar }: { grammar: GrammarNote }) {
  return (
    <div
      className="rounded-xl my-6 overflow-hidden border"
      style={{ borderColor: "rgba(45,90,61,0.15)" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ background: "var(--forest)", color: "white" }}
      >
        <span className="text-xl">📐</span>
        <h4 className="font-semibold text-[1rem]">{grammar.title}</h4>
      </div>

      {/* Rule body */}
      <div className="px-6 py-5" style={{ background: "var(--forest-light)" }}>
        <FormattedText text={grammar.rule} />
      </div>

      {/* Example block */}
      {grammar.example && (
        <div
          className="px-6 py-4 border-t"
          style={{
            background: "white",
            borderColor: "rgba(45,90,61,0.12)",
          }}
        >
          <div
            className="text-[0.75rem] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--forest)" }}
          >
            Examples
          </div>
          <ExampleBlock text={grammar.example} />
        </div>
      )}
    </div>
  );
}
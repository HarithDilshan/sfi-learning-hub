import Link from "next/link";

export default function Footer() {
  return (
    <footer className="text-center py-8 px-8 text-sm" style={{ background: "var(--blue-dark)", color: "rgba(255,255,255,0.7)" }}>
      <p>Lär dig Svenska — A free SFI learning resource. Built with ❤️ for Swedish learners everywhere.</p>
      <p className="mt-2">This is a free educational tool — not affiliated with any SFI program.</p>
      <p className="mt-3 flex items-center justify-center gap-4">
        <Link href="/privacy" className="no-underline hover:underline" style={{ color: "var(--yellow)" }}>
          Privacy Policy
        </Link>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
        <Link href="/terms" className="no-underline hover:underline" style={{ color: "var(--yellow)" }}>
          Terms of Service
        </Link>
      </p>
    </footer>
  );
}
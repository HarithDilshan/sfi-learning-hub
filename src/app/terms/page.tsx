import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — SFI Hub",
  description: "Terms of service for sfihub.se — rules and conditions for using the platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const lastUpdated = "20 February 2026";

  return (
    <>
      <Header />
      <div className="max-w-[760px] mx-auto px-4 sm:px-8 py-10 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-8" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Terms of Service</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: "var(--text-light)" }}>
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Intro */}
        <div className="rounded-xl p-5 mb-8 flex gap-3 items-start" style={{ background: "var(--blue-light)" }}>
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm leading-relaxed" style={{ color: "var(--blue-dark)" }}>
            By using <strong>sfihub.se</strong>, you agree to these terms. Please read them carefully.
            SFI Hub is a free educational tool — we just ask that you use it respectfully and legally.
          </p>
        </div>

        <div className="space-y-8" style={{ lineHeight: "1.8" }}>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              1. About SFI Hub
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub (<strong>sfihub.se</strong>) is a free, non-commercial educational web application
              that provides interactive Swedish language lessons aligned with the SFI (Svenska för Invandrare)
              curriculum. It is operated as a personal project and is not affiliated with any official
              Swedish government body, municipality, or SFI institution.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              2. Acceptance of Terms
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              By accessing or using sfihub.se, you confirm that you have read, understood, and agree
              to be bound by these Terms of Service and our{" "}
              <Link href="/privacy" className="no-underline" style={{ color: "var(--blue)" }}>
                Privacy Policy
              </Link>
              . If you do not agree, please stop using the service.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              3. Eligibility
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub is intended for users aged 16 and over, in line with the minimum age for SFI
              enrollment in Sweden. By creating an account, you confirm that you are at least 16 years
              old. If you are under 16, please do not create an account or submit any personal information.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              4. Your Account
            </h2>
            <p className="mb-3" style={{ color: "var(--text-light)" }}>
              When you create an account on SFI Hub, you are responsible for:
            </p>
            <ul className="space-y-1 text-sm" style={{ color: "var(--text-light)" }}>
              {[
                "Keeping your login credentials secure and confidential",
                "All activity that occurs under your account",
                "Notifying us immediately if you suspect unauthorized use of your account",
                "Providing accurate information when registering",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: "var(--blue)" }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm" style={{ color: "var(--text-light)" }}>
              We reserve the right to suspend or delete accounts that violate these terms.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              5. Acceptable Use
            </h2>
            <p className="mb-3" style={{ color: "var(--text-light)" }}>
              You agree to use SFI Hub only for lawful, personal, and educational purposes. You must not:
            </p>
            <div className="space-y-2">
              {[
                "Use the service for any commercial purpose without our written permission",
                "Attempt to gain unauthorized access to any part of the service or its systems",
                "Scrape, copy, or redistribute the course content without permission",
                "Transmit any harmful, offensive, or disruptive content",
                "Impersonate any person or entity",
                "Use automated tools (bots, scrapers) to access the service",
                "Attempt to reverse-engineer or tamper with the platform",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm px-4 py-2 rounded-lg"
                  style={{ background: "var(--wrong-bg)", color: "var(--wrong)" }}>
                  <span>✕</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              6. Intellectual Property
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              All content on SFI Hub — including lesson content, vocabulary, exercises, dialogues,
              stories, and code — is owned by SFI Hub or its content providers and is protected by
              applicable intellectual property laws. You may use the content for personal, non-commercial
              learning purposes only. You may not reproduce, distribute, or create derivative works
              from the content without explicit written permission.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              7. Free Service & No Guarantees
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub is provided completely free of charge. While we strive to keep the service
              available and accurate, we make no guarantees about:
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-light)" }}>
              {[
                "Uninterrupted or error-free availability of the service",
                "The accuracy or completeness of lesson content",
                "That using SFI Hub will help you pass any official SFI examination",
                "That the service will be available indefinitely",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: "var(--text-light)" }}>—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm" style={{ color: "var(--text-light)" }}>
              SFI Hub is a supplementary learning tool and is not a substitute for official SFI
              education provided by your municipality.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              8. Limitation of Liability
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              To the fullest extent permitted by law, SFI Hub and its operator shall not be liable
              for any indirect, incidental, special, or consequential damages arising from your use
              of — or inability to use — the service. This includes but is not limited to loss of
              progress data, service interruptions, or reliance on content accuracy.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              9. Third-Party Services
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub uses third-party services including Supabase (database), Vercel (hosting), and
              Google Fonts (typography). These services have their own terms and privacy policies which
              apply independently. We are not responsible for the practices of these third parties.
              See our{" "}
              <Link href="/privacy" className="no-underline" style={{ color: "var(--blue)" }}>
                Privacy Policy
              </Link>{" "}
              for more details.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              10. Termination
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              You may stop using SFI Hub and delete your account at any time. We reserve the right
              to suspend or terminate access for any user who violates these terms, without prior notice.
              We also reserve the right to discontinue the service at any time, with reasonable notice
              where possible.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              11. Governing Law
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              These terms are governed by the laws of Sweden. Any disputes arising from the use of
              SFI Hub shall be subject to the exclusive jurisdiction of the Swedish courts.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              12. Changes to These Terms
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              We may update these terms from time to time. When we do, we will update the "Last updated"
              date at the top of this page. Continued use of SFI Hub after changes are posted constitutes
              your acceptance of the updated terms.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              13. Contact
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              If you have any questions about these terms, please contact us:
            </p>
            <div className="mt-3 rounded-xl p-5" style={{ background: "var(--warm)", border: "1px solid var(--warm-dark)" }}>
              <p className="font-semibold">SFI Hub</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
                Website:{" "}
                <a href="https://sfihub.se" className="no-underline" style={{ color: "var(--blue)" }}>
                  sfihub.se
                </a>
              </p>
              <p className="text-sm" style={{ color: "var(--text-light)" }}>
                Email:{" "}
                <a href="mailto:privacy@sfihub.se" className="no-underline" style={{ color: "var(--blue)" }}>
                  privacy@sfihub.se
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
      <Footer />
    </>
  );
}
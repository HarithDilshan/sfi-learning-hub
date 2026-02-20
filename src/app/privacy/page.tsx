import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — SFI Hub",
  description: "Privacy policy for sfihub.se — how we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const lastUpdated = "20 February 2026";

  return (
    <>
      <Header />
      <div className="max-w-[760px] mx-auto px-4 sm:px-8 py-10 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-8" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Privacy Policy</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: "var(--text-light)" }}>
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Intro */}
        <div className="rounded-xl p-5 mb-8 flex gap-3 items-start" style={{ background: "var(--blue-light)" }}>
          <span className="text-xl flex-shrink-0">🔒</span>
          <p className="text-sm leading-relaxed" style={{ color: "var(--blue-dark)" }}>
            SFI Hub (<strong>sfihub.se</strong>) is a free educational tool for Swedish language learners.
            We take your privacy seriously and only collect what is strictly necessary to provide the service.
          </p>
        </div>

        <div className="space-y-8" style={{ lineHeight: "1.8" }}>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              1. Who We Are
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub is a free, non-commercial educational web application available at{" "}
              <strong>sfihub.se</strong>. It provides interactive Swedish language lessons aligned
              with the SFI (Svenska för Invandrare) curriculum. The service is operated as a
              personal project and is not affiliated with any official Swedish government body or
              SFI institution.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              2. What Data We Collect
            </h2>
            <p className="mb-3" style={{ color: "var(--text-light)" }}>
              We collect the minimum data necessary to provide the service:
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--warm-dark)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--warm)" }}>
                    <th className="text-left px-4 py-3 font-semibold">Data</th>
                    <th className="text-left px-4 py-3 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold">Stored</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Email address", "Account login via Supabase Auth", "Supabase (EU)"],
                    ["Learning progress", "XP, streaks, completed topics, word history", "Your browser (localStorage) + Supabase"],
                    ["Word attempt history", "Spaced repetition — knowing which words to review", "Supabase (EU)"],
                    ["Usage data (anonymous)", "Vercel analytics — page views, performance", "Vercel (anonymised)"],
                  ].map(([data, purpose, stored], i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--warm-dark)" }}>
                      <td className="px-4 py-3 font-medium">{data}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-light)" }}>{purpose}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-light)" }}>{stored}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--text-light)" }}>
              We do <strong>not</strong> collect names, phone numbers, addresses, payment information,
              or any sensitive personal data. We do <strong>not</strong> sell your data to third parties.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              3. How We Use Your Data
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              Your data is used solely to:
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-light)" }}>
              {[
                "Authenticate you when you log in",
                "Save your learning progress, XP, and streaks across devices",
                "Power the spaced repetition review system by tracking which words you find difficult",
                "Improve the app through anonymised performance analytics",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span style={{ color: "var(--blue)" }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              4. Third-Party Services
            </h2>
            <p className="mb-3" style={{ color: "var(--text-light)" }}>
              SFI Hub uses the following third-party services:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "Supabase",
                  role: "Database & authentication",
                  info: "Data is stored in EU-based servers. Supabase is GDPR compliant.",
                  link: "https://supabase.com/privacy",
                },
                {
                  name: "Vercel",
                  role: "Hosting & deployment",
                  info: "Collects anonymised request logs and performance metrics.",
                  link: "https://vercel.com/legal/privacy-policy",
                },
                {
                  name: "Google Fonts",
                  role: "Typography",
                  info: "Fonts are loaded from Google's CDN. Google may log font requests.",
                  link: "https://policies.google.com/privacy",
                },
                {
                  name: "Web Speech API",
                  role: "Text-to-speech pronunciation",
                  info: "Built into your browser — no data is sent to our servers.",
                  link: null,
                },
              ].map((service, i) => (
                <div key={i} className="rounded-lg p-4" style={{ background: "var(--warm)", border: "1px solid var(--warm-dark)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{service.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
                      {service.role}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-light)" }}>{service.info}</p>
                  {service.link && (
                    <a href={service.link} target="_blank" rel="noopener noreferrer"
                      className="text-xs mt-1 inline-block no-underline" style={{ color: "var(--blue)" }}>
                      Privacy policy →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              5. Cookies & Local Storage
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub uses <strong>browser localStorage</strong> (not cookies) to store your learning
              progress locally on your device. This data never leaves your browser unless you are
              logged in, in which case it is also synced to Supabase. We do not use advertising
              cookies or tracking cookies of any kind.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              6. Your Rights (GDPR)
            </h2>
            <p className="mb-3" style={{ color: "var(--text-light)" }}>
              If you are based in the EU/EEA, you have the following rights under GDPR:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: "👁️", right: "Access", desc: "Request a copy of your data" },
                { icon: "✏️", right: "Rectification", desc: "Correct inaccurate data" },
                { icon: "🗑️", right: "Erasure", desc: "Request deletion of your account and data" },
                { icon: "📦", right: "Portability", desc: "Receive your data in a portable format" },
                { icon: "🚫", right: "Objection", desc: "Object to how your data is processed" },
                { icon: "⏸️", right: "Restriction", desc: "Request restriction of processing" },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-3 flex gap-3 items-start"
                  style={{ background: "var(--forest-light)", border: "1px solid rgba(45,90,61,0.1)" }}>
                  <span>{item.icon}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--forest)" }}>{item.right}</div>
                    <div className="text-xs" style={{ color: "var(--text-light)" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--text-light)" }}>
              To exercise any of these rights, contact us at the email below. We will respond within 30 days.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              7. Data Retention
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              Your account data is retained for as long as your account is active. If you delete
              your account, all associated data (progress, word history, login credentials) is
              permanently deleted from our database within 30 days. Local browser data
              (localStorage) can be cleared at any time by clearing your browser data.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              8. Children's Privacy
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              SFI Hub is intended for users aged 16 and over, in line with the minimum age for SFI
              enrollment in Sweden. We do not knowingly collect data from children under 16. If you
              believe a child has created an account, please contact us and we will delete it promptly.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              9. Changes to This Policy
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              We may update this privacy policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. Continued use of SFI Hub after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
              10. Contact
            </h2>
            <p style={{ color: "var(--text-light)" }}>
              For any privacy-related questions or requests, please contact us at:
            </p>
            <div className="mt-3 rounded-xl p-5" style={{ background: "var(--warm)", border: "1px solid var(--warm-dark)" }}>
              <p className="font-semibold">SFI Hub</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-light)" }}>
                Website: <a href="https://sfihub.se" className="no-underline" style={{ color: "var(--blue)" }}>sfihub.se</a>
              </p>
              <p className="text-sm" style={{ color: "var(--text-light)" }}>
                Email: <a href="mailto:privacy@sfihub.se" className="no-underline" style={{ color: "var(--blue)" }}>privacy@sfihub.se</a>
              </p>
            </div>
          </section>

        </div>
      </div>
      <Footer />
    </>
  );
}
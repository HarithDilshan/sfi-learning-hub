"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface TestResult {
  name: string;
  status: "pending" | "pass" | "fail";
  message: string;
  detail?: string;
}

export default function TestSupabasePage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runTests() {
    setRunning(true);
    const tests: TestResult[] = [];

    // Test 1: Check env vars exist
    const configured = isSupabaseConfigured;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    tests.push({
      name: "Environment Variables",
      status: configured ? "pass" : "fail",
      message: configured ? "Both SUPABASE_URL and ANON_KEY are set" : "Missing environment variables",
      detail: configured
        ? `URL: ${url.substring(0, 30)}...`
        : "NEXT_PUBLIC_SUPABASE_URL or ANON_KEY is empty. Check your .env.local file and restart the dev server.",
    });
    setResults([...tests]);

    if (!configured) {
      setRunning(false);
      return;
    }

    // Test 2: Ping Supabase (basic connection)
    try {
      const { error } = await supabase.from("_test_ping").select("*").limit(1);
      // We expect a "relation does not exist" error — that's fine, it means we connected!
      if (error && error.message.includes("does not exist")) {
        tests.push({
          name: "Supabase Connection",
          status: "pass",
          message: "Successfully connected to Supabase!",
          detail: "The database responded (table doesn't exist yet, which is expected).",
        });
      } else if (error) {
        // Could be an auth error or other issue
        tests.push({
          name: "Supabase Connection",
          status: error.message.includes("JWSError") || error.message.includes("Invalid") ? "fail" : "pass",
          message: error.message.includes("JWSError") || error.message.includes("Invalid")
            ? "Connection failed — invalid API key"
            : "Connected to Supabase",
          detail: error.message,
        });
      } else {
        tests.push({
          name: "Supabase Connection",
          status: "pass",
          message: "Successfully connected to Supabase!",
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      tests.push({
        name: "Supabase Connection",
        status: "fail",
        message: "Could not reach Supabase",
        detail: errorMessage,
      });
    }
    setResults([...tests]);

    // Test 3: Auth service check
    try {
      const { data, error } = await supabase.auth.getSession();
      tests.push({
        name: "Auth Service",
        status: error ? "fail" : "pass",
        message: error ? "Auth service error" : "Auth service is running",
        detail: error
          ? error.message
          : data.session
          ? `Active session found: ${data.session.user.email}`
          : "No active session (expected — no one is logged in yet).",
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      tests.push({
        name: "Auth Service",
        status: "fail",
        message: "Auth check failed",
        detail: errorMessage,
      });
    }
    setResults([...tests]);

    // Test 4: Check if our tables exist
    try {
      const { error } = await supabase.from("user_progress").select("*").limit(1);
      if (error && error.message.includes("does not exist")) {
        tests.push({
          name: "Database Tables",
          status: "pending",
          message: "Tables not created yet",
          detail:
            "The 'user_progress' table doesn't exist. This is expected if you haven't run the SQL setup yet. See the setup instructions below.",
        });
      } else if (error) {
        tests.push({
          name: "Database Tables",
          status: "fail",
          message: "Table query error",
          detail: error.message,
        });
      } else {
        tests.push({
          name: "Database Tables",
          status: "pass",
          message: "user_progress table exists and is accessible!",
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      tests.push({
        name: "Database Tables",
        status: "fail",
        message: "Table check failed",
        detail: errorMessage,
      });
    }
    setResults([...tests]);
    setRunning(false);
  }

  const statusIcon = (s: TestResult["status"]) =>
    s === "pass" ? "✅" : s === "fail" ? "❌" : "⏳";

  const statusColor = (s: TestResult["status"]) =>
    s === "pass"
      ? "var(--correct-bg)"
      : s === "fail"
      ? "var(--wrong-bg)"
      : "var(--yellow-light)";

  const statusTextColor = (s: TestResult["status"]) =>
    s === "pass"
      ? "var(--correct)"
      : s === "fail"
      ? "var(--wrong)"
      : "var(--yellow-dark)";

  return (
    <>
      <Header />
      <div className="max-w-[800px] mx-auto px-4 md:px-8 py-10 pb-20">
        <div className="flex items-center gap-2 text-sm mb-6" style={{ color: "var(--text-light)" }}>
          <Link href="/" className="no-underline" style={{ color: "var(--blue)" }}>Hem</Link>
          <span>›</span>
          <span>Supabase Test</span>
        </div>

        <h2 className="text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Supabase Connection Test
        </h2>
        <p className="mb-8" style={{ color: "var(--text-light)" }}>
          Click the button below to test if your Supabase is properly connected.
        </p>

        <button
          onClick={runTests}
          disabled={running}
          className="px-8 py-3.5 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-60 mb-8"
          style={{ background: "var(--blue)" }}
        >
          {running ? "Running tests..." : "🧪 Run Connection Test"}
        </button>

        {results.length > 0 && (
          <div className="space-y-4 mb-10">
            {results.map((r, i) => (
              <div
                key={i}
                className="rounded-xl p-5 border-2"
                style={{
                  background: statusColor(r.status),
                  borderColor: statusTextColor(r.status) + "33",
                }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xl">{statusIcon(r.status)}</span>
                  <h3 className="font-semibold text-base">{r.name}</h3>
                </div>
                <p className="text-sm font-medium ml-9" style={{ color: statusTextColor(r.status) }}>
                  {r.message}
                </p>
                {r.detail && (
                  <p className="text-xs mt-2 ml-9 opacity-80" style={{ color: "var(--text-light)" }}>
                    {r.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Setup instructions */}
        <div className="bg-white rounded-xl p-8 mt-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 className="text-xl font-semibold mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Setup Checklist
          </h3>

          <div className="space-y-4 text-sm leading-relaxed">
            <div className="flex gap-3">
              <span className="font-bold text-base">1.</span>
              <div>
                <strong>Create a Supabase project</strong> at{" "}
                <a href="https://supabase.com" target="_blank" className="underline" style={{ color: "var(--blue)" }}>
                  supabase.com
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-base">2.</span>
              <div>
                <strong>Copy your credentials</strong> from Project Settings → API:
                <div
                  className="mt-2 p-3 rounded-lg text-xs"
                  style={{
                    background: "var(--warm)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-base">3.</span>
              <div>
                <strong>Save them in <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--warm)", fontFamily: "'JetBrains Mono', monospace" }}>.env.local</code></strong> in your project root
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-base">4.</span>
              <div>
                <strong>Restart your dev server</strong> — environment variables only load on startup:
                <div
                  className="mt-2 p-3 rounded-lg text-xs"
                  style={{
                    background: "var(--warm)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  # Stop the server (Ctrl+C) then:
                  <br />
                  npm run dev
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-base">5.</span>
              <div>
                <strong>Create the database tables</strong> — go to Supabase → SQL Editor and run:
                <div
                  className="mt-2 p-3 rounded-lg text-xs overflow-x-auto"
                  style={{
                    background: "var(--warm)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <pre>{`-- User progress table
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_attempted TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Spaced repetition cards
CREATE TABLE spaced_repetition (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word_sv TEXT NOT NULL,
  word_en TEXT NOT NULL,
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_sv)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cards"
  ON spaced_repetition FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON spaced_repetition FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON spaced_repetition FOR UPDATE
  USING (auth.uid() = user_id);`}</pre>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="font-bold text-base">6.</span>
              <div>
                <strong>Run the test again</strong> — all checks should pass!
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5 flex gap-3 items-start mt-6" style={{ background: "var(--yellow-light)" }}>
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-sm leading-relaxed">
            <strong>Important:</strong> After changing <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--warm)", fontFamily: "'JetBrains Mono', monospace" }}>.env.local</code>, you must restart the dev server. Environment variables are only read when Next.js starts up. Stop the server with Ctrl+C and run <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--warm)", fontFamily: "'JetBrains Mono', monospace" }}>npm run dev</code> again.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}

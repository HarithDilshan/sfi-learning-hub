"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { signIn, signUp, signInWithGoogle } from "@/lib/auth";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error: err } = await signUp(email, password);
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Check your email for a confirmation link! Then sign in.");
        setMode("signin");
      }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.message);
      } else {
        onSuccess();
      }
    }
    setLoading(false);
  }

 async function handleGoogle() {
  setError("");
  setGoogleLoading(true);
  const { error: err } = await signInWithGoogle();
  if (err) {
    setError(err.message);
    setGoogleLoading(false);
  }
  // If successful, Supabase redirects to Google — no need to setLoading(false)
} 

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="bg-white rounded-2xl w-full max-w-[420px] relative animate-slide-up"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2
              className="text-2xl mb-1"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {mode === "signin" ? "Välkommen tillbaka!" : "Skapa konto"}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-light)" }}>
              {mode === "signin"
                ? "Sign in to track your progress"
                : "Create an account to save your learning"}
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div
              className="p-3 rounded-lg mb-4 text-sm font-medium"
              style={{ background: "var(--correct-bg)", color: "var(--correct)" }}
            >
              {success}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="p-3 rounded-lg mb-4 text-sm font-medium"
              style={{ background: "var(--wrong-bg)", color: "var(--wrong)" }}
            >
              {error}
            </div>
          )}

          {/* Google Sign In */}
<button
  onClick={handleGoogle}
  disabled={googleLoading}
  className="w-full py-3.5 rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-3 border-2 mb-4"
  style={{ borderColor: "var(--warm-dark)", background: "white", color: "var(--text)" }}
>
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
  {googleLoading ? "Redirecting..." : "Continue with Google"}
</button>

<div className="flex items-center gap-3 mb-4">
  <div className="flex-1 h-px" style={{ background: "var(--warm-dark)" }} />
  <span className="text-xs" style={{ color: "var(--text-light)" }}>or use email</span>
  <div className="flex-1 h-px" style={{ background: "var(--warm-dark)" }} />
</div>
          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                className="w-full px-4 py-3 border-2 rounded-lg text-base transition-colors focus:outline-none focus:border-[var(--blue)]"
                style={{
                  borderColor: "var(--warm-dark)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 border-2 rounded-lg text-base transition-colors focus:outline-none focus:border-[var(--blue)]"
                style={{
                  borderColor: "var(--warm-dark)",
                  fontFamily: "'Outfit', sans-serif",
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-lg font-semibold text-white cursor-pointer disabled:opacity-50 transition-all"
              style={{ background: "var(--blue)" }}
            >
              {loading
                ? "..."
                : mode === "signin"
                ? "Logga in (Sign in)"
                : "Registrera (Sign up)"}
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center mt-6 text-sm" style={{ color: "var(--text-light)" }}>
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                  className="font-semibold cursor-pointer underline"
                  style={{ color: "var(--blue)" }}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(""); }}
                  className="font-semibold cursor-pointer underline"
                  style={{ color: "var(--blue)" }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
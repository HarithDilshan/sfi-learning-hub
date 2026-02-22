"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingState } from "@/components/ui/LoadingSystem";
import { addXP } from "@/lib/progress";
import { supabase } from "@/lib/supabase";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PronunciationWord {
  id: string;
  swedish: string;
  english: string;
  category: string;
  tip: string | null;
  phonetic: string | null;
}

// ─── MOBILE-SAFE MIME TYPE ────────────────────────────────────────────────────
// iOS Safari doesn't support audio/webm — must detect supported type at runtime

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "",  // fallback — let browser decide
  ];
  for (const type of types) {
    if (!type || MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

// ─── FETCH ────────────────────────────────────────────────────────────────────

async function fetchWords(category: string): Promise<PronunciationWord[]> {
  let query = supabase
    .from("pronunciation_words")
    .select("id, swedish, english, category, tip, phonetic")
    .order("sort_order", { ascending: true });

  if (category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error || !data?.length) {
    console.error("[PronunciationPage] fetchWords:", error?.message);
    return [];
  }
  return data as PronunciationWord[];
}

async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("pronunciation_words")
    .select("category");
  if (error || !data) return [];
  return ["all", ...Array.from(new Set(data.map((r: any) => r.category)))];
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

function speakSwedish(text: string, rate = 1) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "sv-SE";
  utt.rate = rate;
  window.speechSynthesis.speak(utt);
}

// ─── AI PRONUNCIATION SCORING ────────────────────────────────────────────────
// We can't send audio to Claude, but we CAN ask the user to self-evaluate
// using a structured checklist, then Claude gives personalised tips based on
// the word + their self-evaluation. This is honest, practical, and works on all devices.

interface PronunciationScore {
  score: number;           // 1–5
  what_was_good: string;
  what_to_improve: string;
  try_this: string;        // One concrete exercise/tip
}

async function getAIPronunciationTips(
  word: PronunciationWord,
  selfScore: number       // 1–5 from user
): Promise<PronunciationScore> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are a Swedish pronunciation coach for SFI (Swedish for Immigrants) students.

Word: "${word.swedish}" (${word.english})
Phonetic: ${word.phonetic ?? "not provided"}
Pronunciation tip: ${word.tip ?? "none"}
Student self-score: ${selfScore}/5 (1=very different, 5=sounds identical)

Based on their self-score and this specific word, give personalised pronunciation feedback.
Respond ONLY with a JSON object, no markdown:
{
  "score": ${selfScore},
  "what_was_good": "<one encouraging sentence about what they likely got right at score ${selfScore}>",
  "what_to_improve": "<one specific thing to focus on for '${word.swedish}' — mention the actual sound>",
  "try_this": "<one concrete 10-second exercise to practice right now>"
}
Keep each field under 25 words. Be encouraging and specific to this word.`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim()) as PronunciationScore;
  } catch {
    const msgs: Record<number, PronunciationScore> = {
      1: { score: 1, what_was_good: "You tried — that's the most important step!", what_to_improve: `Focus on the vowel sounds in "${word.swedish}" — listen again carefully.`, try_this: "Listen 3 times, then repeat immediately each time." },
      2: { score: 2, what_was_good: "You're getting the word shape right!", what_to_improve: "The stress pattern needs work — which syllable feels strongest?", try_this: "Clap the syllables: which one is loudest in the native audio?" },
      3: { score: 3, what_was_good: "Solid attempt — you have the basics!", what_to_improve: "Fine-tune the vowel quality — Swedish vowels are very precise.", try_this: "Hold the vowel sound for 3 seconds and adjust your lip shape." },
      4: { score: 4, what_was_good: "Really close! Your pronunciation is clear and understandable.", what_to_improve: "Small refinements — listen for the exact vowel length.", try_this: "Record twice more in a row and compare all three recordings." },
      5: { score: 5, what_was_good: "Excellent! You nailed it — sounds very natural.", what_to_improve: "Keep this quality consistent when speaking faster.", try_this: "Use this word in a full sentence to practice flow." },
    };
    return msgs[selfScore] ?? msgs[3];
  }
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function PronunciationRecorderPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories]             = useState<string[]>(["all"]);
  const [words, setWords]                       = useState<PronunciationWord[]>([]);
  const [currentIdx, setCurrentIdx]             = useState(0);
  const [loadingWords, setLoadingWords]         = useState(true);

  const [isRecording, setIsRecording]           = useState(false);
  const [recordedUrl, setRecordedUrl]           = useState<string | null>(null);
  const [recordingTime, setRecordingTime]       = useState(0);
  const [mediaSupported, setMediaSupported]     = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [slowMode, setSlowMode]                 = useState(false);

  // Track recorded words per session
  const [recordings, setRecordings]             = useState<Record<string, string>>({});
  const [xpAwarded, setXpAwarded]               = useState<Set<string>>(new Set());

  // AI pronunciation scoring
  const [selfScore, setSelfScore]               = useState<number | null>(null);
  const [aiScore, setAiScore]                   = useState<PronunciationScore | null>(null);
  const [loadingAiScore, setLoadingAiScore]     = useState(false);
  const [scores, setScores]                     = useState<Record<string, PronunciationScore>>({});

  // Waveform visualizer
  const canvasRef         = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef      = useRef<number | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── DOM audio element — works on iOS where new Audio() fails ──
  const audioElRef       = useRef<HTMLAudioElement | null>(null);

  // ─── Load categories + words ───
  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  const loadWords = useCallback(async (cat: string) => {
    setLoadingWords(true);
    const data = await fetchWords(cat);
    setWords(data);
    setCurrentIdx(0);
    setRecordedUrl(null);
    setIsRecording(false);
    setRecordingTime(0);
    setLoadingWords(false);
  }, []);

  useEffect(() => { loadWords(selectedCategory); }, [selectedCategory, loadWords]);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) setMediaSupported(false);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const word = words[currentIdx];

  // ─── Navigate to word ───
  function goToWord(idx: number) {
    if (idx < 0 || idx >= words.length) return;
    setCurrentIdx(idx);
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const key = words[idx]?.swedish;
    setRecordedUrl(recordings[key] ?? null);
    setSelfScore(null);
    setAiScore(scores[key] ?? null);
  }

  // ─── Waveform draw loop ───
  function startWaveform(stream: MediaStream) {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext("2d");
      if (!canvasCtx) return;

      const bufLen = analyser.frequencyBinCount;
      const dataArr = new Uint8Array(bufLen);

      function draw() {
        animFrameRef.current = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArr);

        canvasCtx!.fillStyle = "#1A1A2E";
        canvasCtx!.fillRect(0, 0, canvas!.width, canvas!.height);

        const barW = (canvas!.width / bufLen) * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const barH = (dataArr[i] / 255) * canvas!.height;
          const hue = (i / bufLen) * 60 + 200; // blue → teal
          canvasCtx!.fillStyle = `hsl(${hue},70%,55%)`;
          canvasCtx!.fillRect(x, canvas!.height - barH, barW, barH);
          x += barW + 1;
        }
      }
      draw();
    } catch (e) {
      console.warn("[Waveform] AudioContext failed:", e);
    }
  }

  function stopWaveform() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  // ─── Start recording ───
  async function startRecording() {
    if (!word) return;
    setSelfScore(null);
    setAiScore(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startWaveform(stream);
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopWaveform();
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const url  = URL.createObjectURL(blob);

        // Update DOM audio element src — works reliably on iOS
        if (audioElRef.current) {
          audioElRef.current.src = url;
          audioElRef.current.load();
        }

        setRecordedUrl(url);
        setRecordings(prev => ({ ...prev, [word.swedish]: url }));
        stream.getTracks().forEach(t => t.stop());

        // Award XP first time recording this word
        if (!xpAwarded.has(word.swedish)) {
          addXP(5);
          setXpAwarded(prev => new Set([...prev, word.swedish]));
          window.dispatchEvent(new Event("progress-update"));
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 5) { stopRecording(); return 5; }
          return t + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setPermissionDenied(true);
      console.error("[PronunciationPage] recording error:", err);
    }
  }

  // ─── Stop recording ───
  function stopRecording() {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    stopWaveform();
    setIsRecording(false);
  }

  // ─── Play recording via DOM element (iOS-safe) ───
  function playRecording() {
    const el = audioElRef.current;
    if (!el || !recordedUrl) return;
    if (isPlayingRecording) {
      el.pause();
      el.currentTime = 0;
      setIsPlayingRecording(false);
      return;
    }
    el.src = recordedUrl;
    el.load();
    el.onplay  = () => setIsPlayingRecording(true);
    el.onended = () => setIsPlayingRecording(false);
    el.onpause = () => setIsPlayingRecording(false);
    el.play().catch(err => console.error("[PronunciationPage] playback error:", err));
  }

  const recordedCount = Object.keys(recordings).length;
  const totalInCategory = words.length;
  const allRecorded = recordedCount >= totalInCategory && totalInCategory > 0;

  if (loadingWords) {
    return (
      <>
        <Header />
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--warm)" }}>
          <LoadingState type="data" message="Laddar uttal..." />
        </div>
        <Footer />
      </>
    );
  }

  if (!word) return null;

  return (
    <>
      <Header />
      {/* Hidden DOM audio element — required for iOS Safari playback */}
      <audio ref={audioElRef} style={{ display: "none" }} playsInline />

      <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 20px" }}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
            <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
            <span>›</span>
            <span>🎤 Uttal</span>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>🎤 Uttalsövning</h1>
            <p style={{ color: "var(--text-light)" }}>
              Listen to native pronunciation, then record yourself and compare!
            </p>
          </div>

          {/* Alerts */}
          {!mediaSupported && (
            <div style={{ background: "var(--wrong-bg)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "var(--wrong)" }}>
              ⚠️ Your browser doesn't support audio recording. You can still listen and practice out loud!
            </div>
          )}
          {permissionDenied && (
            <div style={{ background: "var(--wrong-bg)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "var(--wrong)" }}>
              🎙 Microphone access was denied. Please allow microphone access in your browser settings and refresh.
            </div>
          )}

          {/* Category Filter */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
            {categories.map(cat => (
              <button key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 14px", borderRadius: "16px", border: "2px solid",
                  borderColor: selectedCategory === cat ? "var(--blue)" : "var(--warm-dark)",
                  background:  selectedCategory === cat ? "var(--blue)" : "white",
                  color:       selectedCategory === cat ? "white" : "var(--text)",
                  fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}>
                {cat === "all" ? "Alla ord" : cat}
              </button>
            ))}
          </div>

          {/* XP banner when all recorded */}
          {allRecorded && (
            <div style={{ background: "var(--correct-bg)", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", color: "var(--correct)", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
              🎉 Bra jobbat! Du har spelat in alla ord i denna kategori! +{totalInCategory * 5} XP earned!
            </div>
          )}

          {/* Main Card */}
          <div style={{ background: "white", borderRadius: "16px", padding: "40px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>

            {/* Counter + progress dots */}
            <div style={{ textAlign: "center", marginBottom: "8px", fontSize: "0.82rem", color: "var(--text-light)" }}>
              Word {currentIdx + 1} of {words.length} · 🎤 {recordedCount} recorded
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "28px", flexWrap: "wrap" }}>
              {words.map((w, i) => (
                <div key={i} onClick={() => goToWord(i)} style={{
                  width: "8px", height: "8px", borderRadius: "50%", cursor: "pointer",
                  background: i === currentIdx ? "var(--blue)" : recordings[w.swedish] ? "var(--correct)" : "var(--warm-dark)",
                  transition: "all 0.2s",
                }} />
              ))}
            </div>

            {/* Word display */}
            <div style={{
              textAlign: "center", marginBottom: "8px",
              background: "linear-gradient(135deg, var(--blue), var(--blue-dark))",
              borderRadius: "16px", padding: "36px", color: "white",
            }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "3.5rem", marginBottom: "8px" }}>
                {word.swedish}
              </div>
              <div style={{ fontSize: "1rem", opacity: 0.8 }}>{word.english}</div>
              {word.phonetic && (
                <div style={{ fontSize: "0.85rem", opacity: 0.65, marginTop: "8px", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                  {word.phonetic}
                </div>
              )}
            </div>

            {/* Category badge */}
            <div style={{ textAlign: "center", marginBottom: "20px", marginTop: "12px" }}>
              <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 14px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600 }}>
                {word.category}
              </span>
            </div>

            {/* Pronunciation tip */}
            {word.tip && (
              <div style={{ background: "var(--yellow-light)", borderRadius: "10px", padding: "14px 18px", marginBottom: "24px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>💡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "4px" }}>PRONUNCIATION TIP:</div>
                  <div style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>{word.tip}</div>
                </div>
              </div>
            )}

            {/* STEP 1 — Listen */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)", marginBottom: "10px" }}>
                STEG 1 — Lyssna:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                <button
                  onClick={() => speakSwedish(word.swedish, slowMode ? 0.6 : 1)}
                  style={{
                    padding: "16px", borderRadius: "12px",
                    background: "var(--blue-light)", border: "2px solid var(--blue)",
                    color: "var(--blue)", fontSize: "1rem", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    transition: "all 0.2s",
                  }}>
                  <span style={{ fontSize: "1.4rem" }}>🔊</span>
                  {slowMode ? `Slow: "${word.swedish}"` : `Listen: "${word.swedish}"`}
                </button>
                {/* Slow toggle */}
                <button
                  onClick={() => setSlowMode(s => !s)}
                  title="Toggle slow playback"
                  style={{
                    padding: "16px", borderRadius: "12px",
                    background: slowMode ? "var(--blue)" : "white",
                    border: "2px solid var(--blue)",
                    color: slowMode ? "white" : "var(--blue)",
                    fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                  }}>
                  🐢 {slowMode ? "Slow ON" : "Slow"}
                </button>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-light)", textAlign: "center", marginTop: "8px" }}>
                Click 🐢 for 60% speed — great for tricky sounds!
              </div>
            </div>

            {/* STEP 2 — Record */}
            {mediaSupported && !permissionDenied && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)", marginBottom: "10px" }}>
                  STEG 2 — Spela in dig själv:
                </div>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{
                    width: "100%", padding: "16px", borderRadius: "12px",
                    background: isRecording ? "#C0392B" : "var(--forest-light)",
                    border: `2px solid ${isRecording ? "#C0392B" : "var(--forest)"}`,
                    color: isRecording ? "white" : "var(--forest)",
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    transition: "all 0.2s",
                    animation: isRecording ? "pulse 1s ease-in-out infinite" : "none",
                  }}>
                  <span style={{ fontSize: "1.4rem" }}>{isRecording ? "⏹" : "🎤"}</span>
                  {isRecording ? `Recording... ${recordingTime}s (tap to stop)` : recordings[word.swedish] ? "Record again 🔄" : "Record yourself"}
                </button>
                {isRecording && (
                  <div style={{ marginTop: "8px" }}>
                    {/* Waveform visualizer */}
                    <canvas
                      ref={canvasRef}
                      width={780}
                      height={60}
                      style={{ width: "100%", height: "60px", borderRadius: "8px", display: "block", marginBottom: "6px" }}
                    />
                    <div style={{ width: "100%", height: "4px", background: "var(--warm-dark)", borderRadius: "2px" }}>
                      <div style={{ width: `${(recordingTime / 5) * 100}%`, height: "100%", background: "#C0392B", borderRadius: "2px", transition: "width 1s linear" }} />
                    </div>
                    <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-light)", marginTop: "4px" }}>Auto-stops after 5 seconds</div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Compare + AI Score */}
            {(recordedUrl || recordings[word.swedish]) && (
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)", marginBottom: "10px" }}>
                  STEG 3 — Jämför & Betygsätt:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <button onClick={() => speakSwedish(word.swedish, slowMode ? 0.6 : 1)} style={{
                    padding: "14px", borderRadius: "10px",
                    background: "var(--blue-light)", border: "2px solid var(--blue)",
                    color: "var(--blue)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
                  }}>
                    🔊 Native {slowMode ? "(slow)" : ""}
                  </button>
                  <button onClick={playRecording} style={{
                    padding: "14px", borderRadius: "10px",
                    background: isPlayingRecording ? "var(--forest)" : "var(--forest-light)",
                    border: "2px solid var(--forest)",
                    color: isPlayingRecording ? "white" : "var(--forest)",
                    fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
                    transition: "all 0.2s",
                  }}>
                    {isPlayingRecording ? "▶ Playing..." : "🎧 Your recording"}
                  </button>
                </div>

                {/* Self-score prompt */}
                {!aiScore && !loadingAiScore && (
                  <div style={{ background: "var(--blue-light)", borderRadius: "12px", padding: "16px 20px", marginBottom: "0" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "12px", color: "var(--blue-dark)" }}>
                      🎯 How close did you sound to the native audio?
                    </div>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setSelfScore(n)}
                          style={{
                            width: "44px", height: "44px", borderRadius: "50%", border: "2px solid",
                            borderColor: selfScore === n ? "var(--blue)" : "var(--warm-dark)",
                            background:  selfScore === n ? "var(--blue)" : "white",
                            color:       selfScore === n ? "white" : "var(--text)",
                            fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                            fontFamily: "'Outfit', sans-serif",
                          }}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-light)", marginBottom: "14px" }}>
                      <span>1 = Very different</span>
                      <span>5 = Sounds identical</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!selfScore) return;
                        setLoadingAiScore(true);
                        const fb = await getAIPronunciationTips(word, selfScore);
                        setAiScore(fb);
                        setScores(prev => ({ ...prev, [word.swedish]: fb }));
                        setLoadingAiScore(false);
                      }}
                      disabled={!selfScore}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "8px",
                        background: selfScore ? "var(--blue)" : "var(--warm-dark)",
                        color: selfScore ? "white" : "var(--text-light)",
                        border: "none", fontWeight: 700, fontSize: "0.9rem",
                        cursor: selfScore ? "pointer" : "default",
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                      Get AI Feedback →
                    </button>
                  </div>
                )}

                {/* Loading AI */}
                {loadingAiScore && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px", background: "var(--blue-light)", borderRadius: "10px", fontSize: "0.88rem", color: "var(--blue)" }}>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    AI analyserar ditt uttal...
                  </div>
                )}

                {/* AI Score Result */}
                {aiScore && !loadingAiScore && (
                  <div style={{ background: "var(--forest-light)", borderRadius: "12px", padding: "20px", borderLeft: "4px solid var(--forest)" }}>
                    {/* Score badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--forest)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        🤖 AI Uttalsfeedback
                      </div>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ fontSize: "1rem" }}>
                            {n <= aiScore.score ? "⭐" : "☆"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "10px" }}>
                      <div style={{ background: "var(--correct-bg)", borderRadius: "8px", padding: "10px 14px", fontSize: "0.88rem" }}>
                        <strong style={{ color: "var(--correct)" }}>✅ Bra:</strong> {aiScore.what_was_good}
                      </div>
                      <div style={{ background: "var(--yellow-light)", borderRadius: "8px", padding: "10px 14px", fontSize: "0.88rem" }}>
                        <strong style={{ color: "var(--yellow-dark)" }}>🎯 Förbättra:</strong> {aiScore.what_to_improve}
                      </div>
                      <div style={{ background: "var(--blue-light)", borderRadius: "8px", padding: "10px 14px", fontSize: "0.88rem" }}>
                        <strong style={{ color: "var(--blue)" }}>💡 Prova detta:</strong> {aiScore.try_this}
                      </div>
                    </div>
                    <button onClick={() => { setSelfScore(null); setAiScore(null); }}
                      style={{ marginTop: "12px", background: "none", border: "none", fontSize: "0.82rem", color: "var(--forest)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      Re-score →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <button onClick={() => goToWord(currentIdx - 1)} disabled={currentIdx === 0}
              style={{
                padding: "12px 24px", borderRadius: "8px",
                background: currentIdx === 0 ? "var(--warm-dark)" : "white",
                border: "2px solid var(--warm-dark)",
                color: currentIdx === 0 ? "var(--text-light)" : "var(--text)",
                fontWeight: 600, cursor: currentIdx === 0 ? "default" : "pointer", fontSize: "0.9rem",
                fontFamily: "'Outfit', sans-serif",
              }}>← Previous</button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
              🎤 {recordedCount} / {totalInCategory} recorded
            </span>
            <button onClick={() => goToWord(currentIdx + 1)} disabled={currentIdx >= words.length - 1}
              style={{
                padding: "12px 24px", borderRadius: "8px",
                background: currentIdx >= words.length - 1 ? "var(--warm-dark)" : "var(--blue)",
                border: "2px solid transparent",
                color: currentIdx >= words.length - 1 ? "var(--text-light)" : "white",
                fontWeight: 700, cursor: currentIdx >= words.length - 1 ? "default" : "pointer", fontSize: "0.9rem",
                fontFamily: "'Outfit', sans-serif",
              }}>Next →</button>
          </div>

          {/* Word list grid */}
          <div style={{ background: "white", borderRadius: "14px", padding: "24px", boxShadow: "var(--shadow)" }}>
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", marginBottom: "16px" }}>
              📋 All Words in This Category
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
              {words.map((w, i) => (
                <div key={w.id} onClick={() => goToWord(i)} style={{
                  padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                  background: i === currentIdx ? "var(--blue-light)" : recordings[w.swedish] ? "var(--correct-bg)" : "var(--warm)",
                  border: `2px solid ${i === currentIdx ? "var(--blue)" : recordings[w.swedish] ? "var(--correct)" : "transparent"}`,
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span style={{ fontSize: "0.8rem" }}>{recordings[w.swedish] ? "✅" : "○"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--blue-dark)" }}>{w.swedish}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>{w.english}</div>
                    {w.phonetic && <div style={{ fontSize: "0.7rem", color: "var(--text-light)", fontFamily: "monospace", opacity: 0.7 }}>{w.phonetic}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <Footer />
    </>
  );
}
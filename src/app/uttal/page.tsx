"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// ─── PRONUNCIATION WORDS ─────────────────────────────────────────────────────
interface PronunciationWord {
  sv: string;
  en: string;
  category: string;
  tip?: string; // pronunciation tip
}

const pronunciationWords: PronunciationWord[] = [
  // Tricky Swedish sounds
  { sv: "sju", en: "seven", category: "Tricky Sounds", tip: "The 'sj' sounds like 'sh' — a soft, hushing sound from the back of the throat" },
  { sv: "kön", en: "gender/queue", category: "Tricky Sounds", tip: "The Swedish ö is like the 'e' in 'her' — round your lips" },
  { sv: "åtta", en: "eight", category: "Tricky Sounds", tip: "The å sounds like 'aw' in 'paw'" },
  { sv: "kyckling", en: "chicken", category: "Tricky Sounds", tip: "kj/tj sounds — like a softer 'sh' sound" },
  { sv: "ljus", en: "light/candle", category: "Tricky Sounds", tip: "'lj' is pronounced like 'y' — yoos" },
  { sv: "hjärta", en: "heart", category: "Tricky Sounds", tip: "'hj' is pronounced like 'y' — yerta" },
  { sv: "tjugo", en: "twenty", category: "Tricky Sounds", tip: "'tj' sounds like a soft 'sh' — shoo-go" },
  { sv: "Sverige", en: "Sweden", category: "Tricky Sounds", tip: "Sver-ye — the 'g' before 'e' sounds like 'y'" },

  // Common greetings
  { sv: "Välkommen", en: "welcome", category: "Greetings", tip: "vel-KOM-men — the double m is important" },
  { sv: "Trevligt att träffas", en: "nice to meet you", category: "Greetings", tip: "Trev-ligt att TREF-fas" },
  { sv: "Hur mår du", en: "how are you", category: "Greetings", tip: "Hoor more doo — 'mår' rhymes with 'more'" },
  { sv: "Varsågod", en: "you're welcome / here you go", category: "Greetings", tip: "Var-so-GOD — stress on the last syllable" },

  // Numbers
  { sv: "fjorton", en: "fourteen", category: "Numbers", tip: "FYOR-ton — the 'fj' is a common Swedish consonant cluster" },
  { sv: "sjutton", en: "seventeen", category: "Numbers", tip: "HWOO-ton — 'sj' makes that unique Swedish sound" },
  { sv: "tjugofem", en: "twenty-five", category: "Numbers", tip: "HWOO-go-fem — 'tj' = sh sound" },
  { sv: "hundra", en: "one hundred", category: "Numbers", tip: "HUN-dra — roll the r slightly" },

  // Food words
  { sv: "köttbullar", en: "meatballs", category: "Food", tip: "SHET-bool-ar — the ö is short here" },
  { sv: "smörgåsbord", en: "Swedish buffet", category: "Food", tip: "SMUR-goes-bood — ö sounds like oo-ish" },
  { sv: "filmjölk", en: "soured milk", category: "Food", tip: "Film-yulk — 'lm' and then the ö sound" },
  { sv: "kanelbullar", en: "cinnamon buns", category: "Food", tip: "Ka-nel-bool-ar — Swedish comfort food!" },

  // Work/Society
  { sv: "arbetsförmedlingen", en: "the employment office", category: "Society", tip: "ar-BETs-fur-med-LING-en — break it into parts: arbets + förmedlingen" },
  { sv: "sjukhuset", en: "the hospital", category: "Society", tip: "HWOOK-hoo-set — 'sjuk' has that special sj sound" },
  { sv: "utbildning", en: "education", category: "Society", tip: "OOT-bild-ning — 'ut' = out, 'bildning' = formation/cultivation" },
  { sv: "jämställdhet", en: "gender equality", category: "Society", tip: "yem-STELD-het — starts with the 'y' sound (j = y)" },
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function PronunciationRecorderPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaSupported, setMediaSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setMediaSupported(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const filteredWords = selectedCategory === "all"
    ? pronunciationWords
    : pronunciationWords.filter(w => w.category === selectedCategory);

  const word = filteredWords[currentIdx];
  const wordKey = word?.sv;

  const categories = ["all", ...Array.from(new Set(pronunciationWords.map(w => w.category)))];

  function speakNative(text: string) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "sv-SE";
    utterance.rate = 0.8;
    utterance.onstart = () => setIsPlayingNative(true);
    utterance.onend = () => setIsPlayingNative(false);
    speechSynthesis.speak(utterance);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setRecordings(prev => ({ ...prev, [wordKey]: blob }));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          if (t >= 5) { stopRecording(); return t; }
          return t + 1;
        });
      }, 1000);
    } catch (err: any) {
      if (err.name === "NotAllowedError") setPermissionDenied(true);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }

  function playRecording() {
    if (!recordedUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(recordedUrl);
    audioRef.current = audio;
    audio.onplay = () => setIsPlayingRecording(true);
    audio.onended = () => setIsPlayingRecording(false);
    audio.play();
  }

  function goToWord(idx: number) {
    setCurrentIdx(idx);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    // Load saved recording for this word if exists
    const saved = recordings[filteredWords[idx]?.sv];
    if (saved) {
      const url = URL.createObjectURL(saved);
      setRecordedBlob(saved);
      setRecordedUrl(url);
    }
  }

  if (!word) return null;

  const hasRecording = !!recordedUrl || !!recordings[wordKey];

  return (
    <>
    <Header/>
    <div style={{ background: "var(--warm)", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-light)", marginBottom: "24px" }}>
          <Link href="/" style={{ color: "var(--blue)", textDecoration: "none" }}>Hem</Link>
          <span>›</span>
          <span>🎤 Uttal</span>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "2rem", marginBottom: "8px" }}>
            🎤 Uttalsövning
          </h1>
          <p style={{ color: "var(--text-light)" }}>
            Listen to native pronunciation, then record yourself and compare! Swedish has sounds that don't exist in most other languages.
          </p>
        </div>

        {/* Media not supported */}
        {!mediaSupported && (
          <div style={{ background: "var(--wrong-bg)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "var(--wrong)" }}>
            ⚠️ Your browser doesn't support audio recording. You can still listen to the native pronunciation and practice out loud!
          </div>
        )}

        {/* Permission denied */}
        {permissionDenied && (
          <div style={{ background: "var(--wrong-bg)", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", color: "var(--wrong)" }}>
            🎙 Microphone access was denied. To record yourself, please allow microphone access in your browser settings and refresh the page.
          </div>
        )}

        {/* Category Filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setCurrentIdx(0); setRecordedBlob(null); setRecordedUrl(null); }} style={{
              padding: "6px 14px", borderRadius: "16px", border: "2px solid",
              borderColor: selectedCategory === cat ? "var(--blue)" : "var(--warm-dark)",
              background: selectedCategory === cat ? "var(--blue)" : "white",
              color: selectedCategory === cat ? "white" : "var(--text)",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
            }}>
              {cat === "all" ? "Alla ord" : cat}
            </button>
          ))}
        </div>

        {/* Main Practice Card */}
        <div style={{ background: "white", borderRadius: "16px", padding: "40px", boxShadow: "var(--shadow-lg)", marginBottom: "20px" }}>

          {/* Word Counter */}
          <div style={{ textAlign: "center", marginBottom: "8px", fontSize: "0.82rem", color: "var(--text-light)" }}>
            Word {currentIdx + 1} of {filteredWords.length}
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "28px", flexWrap: "wrap" }}>
            {filteredWords.map((w, i) => (
              <div key={i} onClick={() => goToWord(i)} style={{
                width: "8px", height: "8px", borderRadius: "50%", cursor: "pointer",
                background: i === currentIdx
                  ? "var(--blue)"
                  : recordings[w.sv]
                  ? "var(--correct)"
                  : "var(--warm-dark)",
                transition: "all 0.2s",
              }} />
            ))}
          </div>

          {/* Word Display */}
          <div style={{
            textAlign: "center", marginBottom: "8px",
            background: "linear-gradient(135deg, var(--blue), var(--blue-dark))",
            borderRadius: "16px", padding: "36px",
            color: "white",
          }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "3.5rem", marginBottom: "8px" }}>
              {word.sv}
            </div>
            <div style={{ fontSize: "1rem", opacity: 0.8 }}>{word.en}</div>
          </div>

          {/* Category badge */}
          <div style={{ textAlign: "center", marginBottom: "20px", marginTop: "12px" }}>
            <span style={{ background: "var(--warm)", color: "var(--text-light)", padding: "4px 14px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: 600 }}>
              {word.category}
            </span>
          </div>

          {/* Pronunciation tip */}
          {word.tip && (
            <div style={{
              background: "var(--yellow-light)", borderRadius: "10px",
              padding: "14px 18px", marginBottom: "24px",
              display: "flex", gap: "10px", alignItems: "flex-start",
            }}>
              <span style={{ fontSize: "1.2rem" }}>💡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "4px" }}>PRONUNCIATION TIP:</div>
                <div style={{ fontSize: "0.88rem", lineHeight: 1.5 }}>{word.tip}</div>
              </div>
            </div>
          )}

          {/* Step 1: Listen */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)", marginBottom: "10px" }}>
              STEG 1 — Lyssna på native-ljud:
            </div>
            <button
              onClick={() => speakNative(word.sv)}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px",
                background: isPlayingNative ? "var(--blue)" : "var(--blue-light)",
                border: "2px solid var(--blue)",
                color: isPlayingNative ? "white" : "var(--blue)",
                fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.4rem" }}>
                {isPlayingNative ? "⏸" : "🔊"}
              </span>
              {isPlayingNative ? "Playing..." : `Listen: "${word.sv}"`}
            </button>
            <div style={{ fontSize: "0.8rem", color: "var(--text-light)", textAlign: "center", marginTop: "8px" }}>
              Click multiple times to hear it again. Try to notice the sounds!
            </div>
          </div>

          {/* Step 2: Record */}
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
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>
                  {isRecording ? "⏹" : "🎤"}
                </span>
                {isRecording ? `Recording... ${recordingTime}s (click to stop)` : "Record yourself"}
              </button>
              {isRecording && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ width: "100%", height: "4px", background: "var(--warm-dark)", borderRadius: "2px" }}>
                    <div style={{ width: `${(recordingTime / 5) * 100}%`, height: "100%", background: "#C0392B", borderRadius: "2px", transition: "width 1s linear" }} />
                  </div>
                  <div style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-light)", marginTop: "4px" }}>Auto-stops after 5 seconds</div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Compare */}
          {(recordedUrl || recordings[wordKey]) && (
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)", marginBottom: "10px" }}>
                STEG 3 — Jämför:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Native */}
                <button onClick={() => speakNative(word.sv)} style={{
                  padding: "14px", borderRadius: "10px",
                  background: "var(--blue-light)", border: "2px solid var(--blue)",
                  color: "var(--blue)", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
                }}>
                  🔊 Native (TTS)
                </button>
                {/* Your recording */}
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
              <div style={{
                background: "var(--forest-light)", borderRadius: "10px",
                padding: "14px 18px", marginTop: "14px", fontSize: "0.88rem",
                borderLeft: "3px solid var(--forest)",
              }}>
                <strong style={{ color: "var(--forest)" }}>🎯 Compare & improve:</strong> Listen to both versions carefully. Do the vowels sound similar? Is the stress on the right syllable? Swedish has a unique "tonal" quality — some words have rising/falling pitch patterns.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => goToWord(currentIdx - 1)}
            disabled={currentIdx === 0}
            style={{
              padding: "12px 24px", borderRadius: "8px",
              background: currentIdx === 0 ? "var(--warm-dark)" : "white",
              border: "2px solid var(--warm-dark)",
              color: currentIdx === 0 ? "var(--text-light)" : "var(--text)",
              fontWeight: 600, cursor: currentIdx === 0 ? "default" : "pointer", fontSize: "0.9rem",
            }}
          >← Previous</button>

          <span style={{ fontSize: "0.85rem", color: "var(--text-light)" }}>
            🎤 Recorded: {Object.keys(recordings).length} / {filteredWords.length} words
          </span>

          <button
            onClick={() => goToWord(currentIdx + 1)}
            disabled={currentIdx >= filteredWords.length - 1}
            style={{
              padding: "12px 24px", borderRadius: "8px",
              background: currentIdx >= filteredWords.length - 1 ? "var(--warm-dark)" : "var(--blue)",
              border: "2px solid transparent",
              color: currentIdx >= filteredWords.length - 1 ? "var(--text-light)" : "white",
              fontWeight: 700, cursor: currentIdx >= filteredWords.length - 1 ? "default" : "pointer", fontSize: "0.9rem",
            }}
          >Next →</button>
        </div>

        {/* Word list */}
        <div style={{ marginTop: "24px", background: "white", borderRadius: "14px", padding: "24px", boxShadow: "var(--shadow)" }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", marginBottom: "16px" }}>
            📋 All Words in This Category
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
            {filteredWords.map((w, i) => (
              <div key={w.sv} onClick={() => goToWord(i)} style={{
                padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                background: i === currentIdx ? "var(--blue-light)" : recordings[w.sv] ? "var(--correct-bg)" : "var(--warm)",
                border: `2px solid ${i === currentIdx ? "var(--blue)" : recordings[w.sv] ? "var(--correct)" : "transparent"}`,
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{ fontSize: "0.8rem" }}>
                  {recordings[w.sv] ? "✅" : "○"}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--blue-dark)" }}>{w.sv}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>{w.en}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
    <Footer />
    </>
  );
}
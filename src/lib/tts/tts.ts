// lib/tts.ts
// Consistent Swedish TTS across all browsers.
// Uses ElevenLabs if API key is set, otherwise picks the best
// available browser voice for Swedish (not just the default).

// ─── BROWSER VOICE SELECTOR ─────────────────────────────────
// Instead of using whatever voice the browser picks by default,
// we rank available voices and pick the best Swedish one.

let cachedVoice: SpeechSynthesisVoice | null = null;

function getBestSwedishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority order — most natural sounding first
  const preferred = [
    "Microsoft Hedvig Online (Natural) - Swedish (Sweden)",  // Edge/Windows
    "Microsoft Hedvig - Swedish (Sweden)",
    "Google svenska",                                         // Chrome
    "Alva",                                                   // macOS/iOS
    "Fiona",
  ];

  for (const name of preferred) {
    const match = voices.find((v) => v.name === name);
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  // Fallback: any sv-SE voice
  const svVoice = voices.find(
    (v) => v.lang === "sv-SE" || v.lang === "sv_SE" || v.lang.startsWith("sv")
  );
  if (svVoice) {
    cachedVoice = svVoice;
    return svVoice;
  }

  return null;
}

// ─── MAIN SPEAK FUNCTION ─────────────────────────────────────
interface SpeakOptions {
  rate?: number;   // 0.5 - 2.0, default 0.85
  pitch?: number;  // 0 - 2.0, default 1
  onEnd?: () => void;
}

export async function speak(text: string, options: SpeakOptions = {}, language: string = "sv"): Promise<void> {
  const { rate = 0.85, pitch = 1, onEnd } = options;

  // Try ElevenLabs if configured
  if (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
    try {
      await speakElevenLabs(text, rate, language, onEnd);
      return;
    } catch {
      console.warn("[tts] ElevenLabs failed, falling back to browser TTS");
    }
  }

  // Browser TTS with best available Swedish voice
  speakBrowser(text, rate, pitch, onEnd);
}

// ─── BROWSER TTS ─────────────────────────────────────────────
function speakBrowser(
  text: string,
  rate: number,
  pitch: number,
  onEnd?: () => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = rate;
  utterance.pitch = pitch;

  // Voices may not be loaded yet — wait for them
  const trySpeak = () => {
    const voice = getBestSwedishVoice();
    if (voice) utterance.voice = voice;
    if (onEnd) utterance.onend = onEnd;
    speechSynthesis.speak(utterance);
  };

  if (speechSynthesis.getVoices().length > 0) {
    trySpeak();
  } else {
    // Voices not loaded yet (common on first load)
    speechSynthesis.addEventListener("voiceschanged", trySpeak, { once: true });
  }
}

// ─── ELEVENLABS TTS (browser-compatible fetch approach) ───────
// Free tier = 10k chars/month
// Swedish voice: "XB0fDUnXU5powFXDhCwa" = Charlotte
const ELEVENLABS_VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "UlR7oZMONx0n2zw37ccS";

let currentAudio: HTMLAudioElement | null = null;

async function speakElevenLabs(
  text: string,
  rate: number,
  language: string = "sv",
  onEnd?: () => void
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("No ElevenLabs API key");

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        language_code: language,  
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${err}`);
  }

  // Convert response to blob → object URL → Audio element
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  const audio = new Audio(audioUrl);
  currentAudio = audio;

  // Clean up object URL after playback
  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
    onEnd?.();
  });

  audio.addEventListener("error", () => {
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
    throw new Error("Audio playback failed");
  });

  await audio.play();
}

// ─── STOP SPEAKING ────────────────────────────────────────────
export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}
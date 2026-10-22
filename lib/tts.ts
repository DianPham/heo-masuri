/**
 * Server-side text-to-speech via Google Cloud Text-to-Speech (Chirp 3 HD
 * voices — natural English and Mandarin), cached in Supabase Storage so each
 * phrase is synthesized once and replayed for free.
 *
 * Env:
 *   GOOGLE_TTS_API_KEY   — API key restricted to the Cloud Text-to-Speech API
 *   GOOGLE_TTS_VOICE_EN  — optional, default en-US-Chirp3-HD-Aoede
 *   GOOGLE_TTS_VOICE_ZH  — optional, default cmn-CN-Chirp3-HD-Aoede
 *
 * Audio is synthesized at natural speed; the client slows playback for
 * learners (pitch-preserving playbackRate), so one cached file serves any pace.
 */
import { createHash } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import type { LessonLang } from "@/types/notebook";

const BUCKET = "tts";

const DEFAULT_VOICES: Record<LessonLang, string> = {
  en: "en-US-Chirp3-HD-Aoede",
  zh: "cmn-CN-Chirp3-HD-Aoede",
};

export function ttsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TTS_API_KEY);
}

function voiceFor(lang: LessonLang): string {
  return (lang === "zh" ? process.env.GOOGLE_TTS_VOICE_ZH : process.env.GOOGLE_TTS_VOICE_EN) || DEFAULT_VOICES[lang];
}

async function synthesize(text: string, voice: string): Promise<Buffer> {
  // Voice names start with their language code: "cmn-CN-Chirp3-HD-Aoede" → "cmn-CN"
  const languageCode = voice.split("-").slice(0, 2).join("-");
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voice },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google TTS ${res.status}: ${detail.slice(0, 300)}`);
  }
  const { audioContent } = (await res.json()) as { audioContent?: string };
  if (!audioContent) throw new Error("Google TTS returned no audio");
  return Buffer.from(audioContent, "base64");
}

/**
 * Parse an HTTP Range header against a body of `total` bytes.
 * null = no/unsupported range (send the whole body); "unsatisfiable" → 416.
 */
export function parseByteRange(
  header: string | null,
  total: number
): { start: number; end: number } | "unsatisfiable" | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  let start: number, end: number;
  if (m[1]) {
    start = parseInt(m[1]);
    end = m[2] ? Math.min(parseInt(m[2]), total - 1) : total - 1;
  } else {
    // Suffix range: the last N bytes
    start = Math.max(total - parseInt(m[2]), 0);
    end = total - 1;
  }
  if (start >= total || start > end) return "unsatisfiable";
  return { start, end };
}

/** MP3 for `text` in `lang` — from the storage cache, or synthesized and cached. */
export async function getSpeech(text: string, lang: LessonLang): Promise<Buffer> {
  const voice = voiceFor(lang);
  const path = `${lang}/${voice}/${createHash("sha256").update(text).digest("hex")}.mp3`;
  const storage = createServerClient().storage.from(BUCKET);

  const cached = await storage.download(path);
  if (cached.data) return Buffer.from(await cached.data.arrayBuffer());

  const audio = await synthesize(text, voice);
  // Cache write is best-effort — a missing bucket must not break playback.
  const { error } = await storage.upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) console.warn("[tts] cache upload failed:", error.message);
  return audio;
}

/**
 * Server-side text-to-speech, stored in Supabase Storage so each phrase is
 * synthesized once and replayed for free.
 *
 * Providers (TTS_PROVIDER):
 *   edge   (default) — Microsoft Edge "Read Aloud" neural voices via msedge-tts.
 *          Free, no key. Unofficial: if Microsoft changes the service, bump
 *          msedge-tts; stored audio keeps playing meanwhile.
 *   google — Google Cloud Text-to-Speech (Chirp 3 HD); needs GOOGLE_TTS_API_KEY.
 * Voices: TTS_VOICE_EN / TTS_VOICE_ZH override the provider defaults below.
 *
 * Audio is synthesized at natural speed; the client slows playback for
 * learners (pitch-preserving playbackRate), so one cached file serves any pace.
 *
 * Lessons are voiced ahead of time: when a lesson arrives (routine draft,
 * Chinese backfill, Masuri's edits, publish), prepareLessonAudio() stores
 * every clip the lesson can play, so Heo's taps only ever play stored files.
 * /api/tts still synthesizes on a miss as a safety net.
 */
import { createHash } from "crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { HttpsProxyAgent } from "https-proxy-agent";
import { createServerClient } from "@/lib/supabase/server";
import { lessonSpeechClips, pageFromRow } from "@/lib/notebook/lesson";
import type { LessonLang } from "@/types/notebook";

const BUCKET = "tts";

type Provider = "edge" | "google";

const DEFAULT_VOICES: Record<Provider, Record<LessonLang, string>> = {
  edge: { en: "en-US-AvaNeural", zh: "zh-CN-XiaoxiaoNeural" },
  google: { en: "en-US-Chirp3-HD-Aoede", zh: "cmn-CN-Chirp3-HD-Aoede" },
};

function provider(): Provider {
  return process.env.TTS_PROVIDER === "google" ? "google" : "edge";
}

export function ttsConfigured(): boolean {
  return provider() === "edge" || Boolean(process.env.GOOGLE_TTS_API_KEY);
}

function voiceFor(lang: LessonLang): string {
  return (lang === "zh" ? process.env.TTS_VOICE_ZH : process.env.TTS_VOICE_EN) || DEFAULT_VOICES[provider()][lang];
}

function synthesize(text: string, voice: string): Promise<Buffer> {
  return provider() === "google" ? synthesizeGoogle(text, voice) : synthesizeEdge(text, voice);
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** One Edge synthesis over its own WebSocket; retried once (the service is flaky). */
async function synthesizeEdge(text: string, voice: string, attempt = 1): Promise<Buffer> {
  // Honour HTTPS_PROXY where one is required (not on Vercel).
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const tts = new MsEdgeTTS({
    connectionTimeoutMs: 10_000,
    synthesisTimeoutMs: 20_000,
    ...(proxy ? { agent: new HttpsProxyAgent(proxy) } : {}),
  });
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // msedge-tts drops the text into SSML as-is, so escape it
    const { audioStream } = tts.toStream(escapeXml(text));
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) chunks.push(Buffer.from(chunk));
    const audio = Buffer.concat(chunks);
    if (audio.length === 0) throw new Error("Edge TTS returned no audio");
    return audio;
  } catch (err) {
    if (attempt < 2) return synthesizeEdge(text, voice, attempt + 1);
    throw new Error(`Edge TTS failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    tts.close();
  }
}

async function synthesizeGoogle(text: string, voice: string): Promise<Buffer> {
  // Voice names start with their language code: "cmn-CN-Chirp3-HD-Aoede" → "cmn-CN"
  const languageCode = voice.split("-").slice(0, 2).join("-");
  const res = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      // Key in a header rather than ?key= so it never lands in URL logs
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_TTS_API_KEY ?? "" },
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

/** Storage path of a clip. The voice is part of it, so changing voices re-voices. */
function speechPath(text: string, lang: LessonLang): string {
  return `${lang}/${voiceFor(lang)}/${createHash("sha256").update(text).digest("hex")}.mp3`;
}

/** MP3 for `text` in `lang` — from the storage cache, or synthesized and cached. */
export async function getSpeech(text: string, lang: LessonLang): Promise<Buffer> {
  const voice = voiceFor(lang);
  const path = speechPath(text, lang);
  const storage = createServerClient().storage.from(BUCKET);

  const cached = await storage.download(path);
  if (cached.data) return Buffer.from(await cached.data.arrayBuffer());

  const audio = await synthesize(text, voice);
  // Cache write is best-effort — a missing bucket must not break playback.
  const { error } = await storage.upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  if (error) console.warn("[tts] cache upload failed:", error.message);
  return audio;
}

export type AudioStats = { clips: number; generated: number; stored: number; failed: number };

const PREGEN_CONCURRENCY = 6;

/**
 * Make sure every clip of a lesson (both tracks) is in storage. Clips already
 * there are skipped (a cheap existence check), so re-running after an edit
 * only voices the new text. Marks generation_meta.audio_ready_at once all
 * clips are stored (or after 3 partial runs). Never throws — a clip that
 * failed here is synthesized on first tap instead.
 */
export async function prepareLessonAudio(pageId: string): Promise<AudioStats | null> {
  if (!ttsConfigured()) return null;
  try {
    const supabase = createServerClient();
    const { data: row } = await supabase.from("daily_pages").select("*").eq("id", pageId).maybeSingle();
    if (!row) return null;

    const clips = lessonSpeechClips(pageFromRow(row));
    const storage = supabase.storage.from(BUCKET);
    const stats: AudioStats = { clips: clips.length, generated: 0, stored: 0, failed: 0 };

    let next = 0;
    const worker = async () => {
      while (next < clips.length) {
        const { text, lang } = clips[next++];
        const path = speechPath(text, lang);
        try {
          const { data: exists } = await storage.exists(path);
          if (exists) { stats.stored++; continue; }
          const audio = await synthesize(text, voiceFor(lang));
          const { error } = await storage.upload(path, audio, { contentType: "audio/mpeg", upsert: true });
          if (error) throw new Error(error.message);
          stats.generated++;
        } catch (err) {
          stats.failed++;
          console.warn(`[tts] pre-generate failed (${lang}) "${text.slice(0, 40)}":`, err instanceof Error ? err.message : err);
        }
      }
    };
    await Promise.all(Array.from({ length: PREGEN_CONCURRENCY }, worker));

    // A run where every clip failed means the service is down — don't count
    // it. Otherwise a clip that keeps failing (e.g. text the voice rejects)
    // stops being retried after 3 runs; it still synthesizes on tap.
    if (stats.failed < stats.clips || stats.clips === 0) {
      // Re-read the meta right before writing: voicing takes a while, and
      // Masuri may have stored a regenerate hint on this page meanwhile.
      const { data: fresh } = await supabase.from("daily_pages").select("generation_meta").eq("id", pageId).maybeSingle();
      const meta = (fresh?.generation_meta as Record<string, unknown> | null) ?? {};
      const attempts = (typeof meta.audio_attempts === "number" ? meta.audio_attempts : 0) + 1;
      const done = stats.failed === 0 || attempts >= 3;
      await supabase
        .from("daily_pages")
        .update({
          generation_meta: {
            ...meta,
            audio_attempts: attempts,
            ...(done ? { audio_ready_at: new Date().toISOString(), audio_failed_clips: stats.failed } : {}),
          },
        })
        .eq("id", pageId);
    }
    return stats;
  } catch (err) {
    console.error("[tts] prepareLessonAudio failed", err);
    return null;
  }
}

/**
 * GET /api/tts?lang=en|zh&text=...
 * Natural-voice pronunciation audio (MP3) for lesson words and sentences.
 * See lib/tts.ts. Soft-gated to Heo/Masuri — every uncached call costs money.
 *
 * Supports Range requests: iOS Safari won't play <audio> from a server that
 * ignores them. 503 when the TTS provider isn't configured (Google without a
 * key) — the client then falls back to the browser's built-in voice.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSpeech, parseByteRange, ttsConfigured } from "@/lib/tts";
import { parseLang } from "@/lib/notebook/lesson";

export const dynamic = "force-dynamic";

const MAX_CHARS = 400;

export async function GET(req: NextRequest) {
  const who = (await cookies()).get("who")?.value;
  if (who !== "heo" && who !== "masuri") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!ttsConfigured()) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const params = req.nextUrl.searchParams;
  const lang = parseLang(params.get("lang"));
  const text = (params.get("text") ?? "").trim();
  if (!lang || !text || text.length > MAX_CHARS) {
    return NextResponse.json({ error: "lang (en|zh) and text (≤400 chars) required" }, { status: 400 });
  }

  let audio: Buffer;
  try {
    audio = await getSpeech(text, lang);
  } catch (err) {
    console.error("[tts]", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }

  const total = audio.length;
  const headers: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // Same text + voice → same audio; let the browser keep it.
    "Cache-Control": "private, max-age=31536000, immutable",
  };

  const range = parseByteRange(req.headers.get("range"), total);
  if (range === "unsatisfiable") {
    return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${total}` } });
  }
  if (range) {
    const { start, end } = range;
    return new NextResponse(new Uint8Array(audio.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new NextResponse(new Uint8Array(audio), {
    status: 200,
    headers: { ...headers, "Content-Length": String(total) },
  });
}

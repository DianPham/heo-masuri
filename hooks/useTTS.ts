"use client";

/**
 * useTTS — pronunciation for the study languages (English, Mandarin).
 *
 * Plays natural-voice audio from /api/tts (Google Cloud TTS, cached server-side).
 * Falls back to the browser's speechSynthesis when the service isn't
 * configured or a request fails — once it fails, later calls go straight to
 * the fallback so they still run inside the tap gesture (iOS requirement).
 *
 * `useTTS("zh")` speaks Mandarin by default; `speak(text, lang)` overrides
 * per call (the vocab book mixes both languages).
 */
import { useCallback, useEffect } from "react";
import type { LessonLang } from "@/types/notebook";
import { LANG_META } from "@/lib/notebook/lesson";

// One shared element for the whole app: once a tap has played it, iOS keeps
// it unlocked, and a new word cleanly interrupts the previous one.
let audioEl: HTMLAudioElement | null = null;
let serviceDown = false;
let browserVoices: Partial<Record<LessonLang, SpeechSynthesisVoice | null>> = {};

function pickVoice(voices: SpeechSynthesisVoice[], lang: LessonLang): SpeechSynthesisVoice | null {
  if (lang === "zh") {
    // Mainland Mandarin first (Tingting on iOS/macOS), then any Mandarin voice.
    // Skip zh-HK (Cantonese) unless nothing else exists.
    const mandarin = voices.filter((v) => /^zh[-_](CN|Hans)/i.test(v.lang));
    return (
      mandarin.find((v) => /ting/i.test(v.name)) ??
      mandarin.find((v) => v.localService) ??
      mandarin[0] ??
      voices.find((v) => /^zh[-_]TW/i.test(v.lang)) ??
      voices.find((v) => v.lang.startsWith("zh")) ??
      null
    );
  }
  return (
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ??
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

function speakWithBrowser(text: string, lang: LessonLang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG_META[lang].ttsLang;
  utter.rate = LANG_META[lang].ttsRate;
  utter.pitch = 1.05;
  const voice = browserVoices[lang];
  if (voice) utter.voice = voice;
  // Cancel previous before speaking — avoids iOS queue buildup
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function speakWithService(text: string, lang: LessonLang) {
  if (!audioEl) audioEl = new Audio();
  const el = audioEl;
  el.pause();
  el.src = `/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`;
  // Learner pace without re-synthesizing; a new source resets playbackRate
  // to defaultPlaybackRate, so set both.
  el.defaultPlaybackRate = LANG_META[lang].ttsRate;
  el.playbackRate = LANG_META[lang].ttsRate;
  el.preservesPitch = true;
  el.play().catch((err: unknown) => {
    const name = err instanceof DOMException ? err.name : "";
    // Interrupted by the next tap — not a failure
    if (name === "AbortError") return;
    // Source unusable (503 not configured, 5xx) → browser voice for the rest
    // of this session. Other errors (e.g. autoplay policy) only skip this one.
    if (name === "NotSupportedError") serviceDown = true;
    speakWithBrowser(text, lang);
  });
}

export function useTTS(defaultLang: LessonLang = "en") {
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function loadVoices() {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;
      browserVoices = { en: pickVoice(voices, "en"), zh: pickVoice(voices, "zh") };
    }

    loadVoices();

    // iOS Safari loads voices async — wait for the event
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, lang: LessonLang = defaultLang) => {
      if (typeof window === "undefined" || !text.trim()) return;
      if (serviceDown) speakWithBrowser(text, lang);
      else speakWithService(text.trim(), lang);
    },
    [defaultLang]
  );

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    audioEl?.pause();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}

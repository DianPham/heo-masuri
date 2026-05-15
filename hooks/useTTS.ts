"use client";

/**
 * useTTS — Text-to-speech hook for English words.
 * Handles iOS Safari's async voice-list loading.
 * Cancels any previous utterance before speaking a new one.
 */
import { useCallback, useEffect, useRef } from "react";

export function useTTS() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function pickVoice() {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;
      voiceRef.current =
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ??
        voices.find((v) => v.lang.startsWith("en") && v.localService) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    }

    pickVoice();

    // iOS Safari loads voices async — wait for the event
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = pickVoice;
    }

    return () => {
      if ("speechSynthesis" in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    utter.pitch = 1.05;
    if (voiceRef.current) utter.voice = voiceRef.current;

    // Cancel previous before speaking — avoids iOS queue buildup
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}

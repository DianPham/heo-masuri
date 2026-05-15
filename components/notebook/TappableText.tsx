"use client";

/**
 * TappableText — renders English text with each word tappable.
 * Single tap: shows VI translation bubble (2.5s) + speaks the word.
 * Long press (500ms): opens Ask Masuri sheet.
 *
 * Blueprint §7: "Every English word on every card is tappable."
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useTTS } from "@/hooks/useTTS";
import { AskMasuriSheet } from "@/components/notebook/AskMasuriSheet";

interface TappableTextProps {
  /** English text to render */
  text: string;
  /** Map of lowercase English word → Vietnamese translation */
  viMap?: Record<string, string>;
  /** Words to visually highlight (from vocab_highlights) */
  highlights?: string[];
  className?: string;
  /** Extra class for each word span */
  wordClassName?: string;
}

interface Bubble {
  word: string;
  vi: string;
  x: number;
  y: number;
}

/** Strip punctuation from a word for lookup / TTS */
function cleanWord(w: string): string {
  return w.replace(/[^a-zA-Z''-]/g, "").toLowerCase();
}

export function TappableText({
  text,
  viMap = {},
  highlights = [],
  className = "",
  wordClassName = "",
}: TappableTextProps) {
  const { speak } = useTTS();
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [askWord, setAskWord] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const highlightSet = new Set(highlights.map((h) => h.toLowerCase()));

  const clearBubble = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  function handlePointerDown(e: React.PointerEvent, rawWord: string) {
    isLongPress.current = false;
    const clean = cleanWord(rawWord);
    if (!clean) return;

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      // Haptic feedback on mobile
      if (navigator.vibrate) navigator.vibrate(40);
      setAskWord(clean);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleClick(e: React.MouseEvent, rawWord: string) {
    if (isLongPress.current) return; // was a long press — don't also handle as tap
    const clean = cleanWord(rawWord);
    if (!clean) return;

    // Speak
    speak(clean);

    // Show bubble if we have a translation
    const vi = viMap[clean];
    if (vi) {
      clearBubble();
      setBubble({ word: clean, vi, x: e.clientX, y: e.clientY });
      bubbleTimer.current = setTimeout(clearBubble, 2500);
    }
  }

  // Split into tokens (words + spaces/punctuation between words)
  const tokens = text.split(/(\s+)/);

  return (
    <>
      <span className={`leading-relaxed ${className}`} data-no-nav="true">
        {tokens.map((token, i) => {
          if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
          const clean = cleanWord(token);
          const isHighlighted = highlightSet.has(clean);

          return (
            <button
              key={i}
              type="button"
              data-no-nav="true"
              onPointerDown={(e) => handlePointerDown(e, token)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={(e) => handleClick(e, token)}
              className={`
                inline touch-manipulation select-none
                rounded-sm px-0.5 -mx-0.5
                transition-colors duration-100
                active:bg-rose-200/60
                ${isHighlighted ? "text-rose-500 font-semibold" : ""}
                ${wordClassName}
              `}
              style={{ WebkitTouchCallout: "none" }}
            >
              {token}
            </button>
          );
        })}
      </span>

      {/* Translation bubble */}
      <AnimatePresence>
        {bubble && (
          <motion.div
            key="bubble"
            className="fixed z-[55] pointer-events-none"
            style={{
              left: Math.min(bubble.x, window.innerWidth - 160),
              top: bubble.y - 56,
            }}
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-xl px-3 py-2 text-sm font-semibold text-white max-w-[160px]"
              style={{
                background: "linear-gradient(135deg, #D14D6F 0%, #E97A95 100%)",
                boxShadow: "0 4px 12px rgba(209,77,111,0.4)",
              }}
            >
              <span className="text-rose-200 text-xs block leading-none mb-0.5">
                {bubble.word}
              </span>
              {bubble.vi}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ask Masuri sheet */}
      <AnimatePresence>
        {askWord && (
          <AskMasuriSheet word={askWord} onClose={() => setAskWord(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

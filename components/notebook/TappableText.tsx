"use client";

/**
 * TappableText — renders English text with each word tappable.
 *
 * Single tap  → VI translation bubble (2.5s auto-dismiss) + TTS
 * Long press  → Ask Masuri sheet
 *
 * Long-press is detected via onContextMenu (the browser's native
 * long-press event on iOS/Android). This is more reliable than a
 * pointer-timer approach because iOS fires pointerleave/pointercancel
 * when it takes over the gesture, which would cancel a setTimeout-based
 * detector before it fires.
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
  /** Extra class for each word button */
  wordClassName?: string;
}

interface Bubble {
  word: string;
  vi: string;
  x: number;
  y: number;
}

/** Strip punctuation for lookup / TTS */
function cleanWord(w: string): string {
  return w.replace(/[^a-zA-Z''‑-]/g, "").toLowerCase();
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
  // Track whether the last action was a long-press so onClick doesn't also fire
  const suppressNextClick = useRef(false);

  const highlightSet = new Set(highlights.map((h) => h.toLowerCase()));

  const clearBubble = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  /** Long-press: use onContextMenu — fires natively on iOS/Android after ~500ms hold */
  function handleContextMenu(e: React.MouseEvent, rawWord: string) {
    e.preventDefault();      // suppress the browser's native context menu
    e.stopPropagation();     // don't let it bubble to StoriesRenderer

    const clean = cleanWord(rawWord);
    if (!clean) return;

    suppressNextClick.current = true;
    if (navigator.vibrate) navigator.vibrate(40);
    setAskWord(clean);
  }

  /** Single tap: TTS + VI translation bubble */
  function handleClick(e: React.MouseEvent, rawWord: string) {
    e.stopPropagation();

    // Was a long-press — skip the tap handler this time
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }

    const clean = cleanWord(rawWord);
    if (!clean) return;

    speak(clean);

    const vi = viMap[clean];
    if (vi) {
      clearBubble();
      // Clamp bubble so it doesn't overflow right edge
      const x = Math.min(e.clientX, (typeof window !== "undefined" ? window.innerWidth : 400) - 168);
      const y = e.clientY;
      setBubble({ word: clean, vi, x, y });
      bubbleTimer.current = setTimeout(clearBubble, 2500);
    }
  }

  // Split text into word tokens and whitespace tokens
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
              onContextMenu={(e) => handleContextMenu(e, token)}
              onClick={(e) => handleClick(e, token)}
              className={[
                "inline touch-manipulation select-none",
                "rounded-sm px-0.5 -mx-0.5",
                "transition-colors duration-100",
                "active:bg-rose-200/60",
                isHighlighted ? "text-rose-500 font-semibold" : "",
                wordClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                // Prevent double-tap zoom without disabling single-tap
                touchAction: "manipulation",
              } as React.CSSProperties}
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
            style={{ left: bubble.x, top: bubble.y - 60 }}
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, #D14D6F 0%, #E97A95 100%)",
                boxShadow: "0 4px 12px rgba(209,77,111,0.4)",
                maxWidth: 160,
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

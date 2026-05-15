"use client";

/**
 * TappableText — renders English text with each word tappable.
 *
 * Single tap  → VI translation bubble (2.5s auto-dismiss) + TTS + save button
 * Long press  → Ask Masuri sheet
 *
 * Long-press strategy (per-platform):
 *   Mobile  → onTouchStart timer (500ms). onTouchMove > 10px cancels it.
 *             touch-action:manipulation + webkit-touch-callout:none prevent
 *             the OS from taking over; touchcancel only fires for scroll/zoom
 *             so a stationary hold completes cleanly.
 *   Desktop → onContextMenu (right-click). Pointer long-press not needed on
 *             desktop; right-click is the standard interaction.
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
  /** Source context for saving words to vocab */
  sourcePageId?: string;
  sourcePageTopic?: string;
  sourcePageTitleVi?: string;
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
  sourcePageId,
  sourcePageTopic,
  sourcePageTitleVi,
}: TappableTextProps) {
  const { speak } = useTTS();
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [askWord, setAskWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent onClick firing right after a long-press
  const suppressNextClick = useRef(false);

  // Touch long-press tracking
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const highlightSet = new Set(highlights.map((h) => h.toLowerCase()));

  const clearBubble = useCallback(() => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  // ── Long-press (mobile: touch timer) ──────────────────────────
  function handleTouchStart(e: React.TouchEvent, rawWord: string) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchTimer.current = setTimeout(() => {
      touchTimer.current = null;
      const clean = cleanWord(rawWord);
      if (!clean) return;
      suppressNextClick.current = true;
      clearBubble();
      if (navigator.vibrate) navigator.vibrate(40);
      setAskWord(clean);
    }, 500);
  }

  function cancelTouchTimer() {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    touchStart.current = null;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 10 || dy > 10) cancelTouchTimer();
  }

  // ── Long-press (desktop: right-click / contextmenu) ───────────
  function handleContextMenu(e: React.MouseEvent, rawWord: string) {
    e.preventDefault();
    e.stopPropagation();
    const clean = cleanWord(rawWord);
    if (!clean) return;
    suppressNextClick.current = true;
    clearBubble();
    if (navigator.vibrate) navigator.vibrate(40);
    setAskWord(clean);
  }

  // ── Single tap ────────────────────────────────────────────────
  function handleClick(e: React.MouseEvent, rawWord: string) {
    e.stopPropagation();
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
      const x = Math.min(
        e.clientX,
        (typeof window !== "undefined" ? window.innerWidth : 400) - 168
      );
      const y = e.clientY;
      setBubble({ word: clean, vi, x, y });
      bubbleTimer.current = setTimeout(clearBubble, 3000);
    }
  }

  // ── Save word to vocab ─────────────────────────────────────────
  async function handleSave(word: string, vi: string) {
    if (savedWords.has(word) || savingWord === word) return;
    setSavingWord(word);
    try {
      await fetch("/api/notebook/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_en: word,
          word_vi: vi,
          source_page_id: sourcePageId,
          source_page_topic: sourcePageTopic,
          source_page_title_vi: sourcePageTitleVi,
        }),
      });
      setSavedWords((prev) => new Set(prev).add(word));
    } finally {
      setSavingWord(null);
    }
  }

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
              onTouchStart={(e) => handleTouchStart(e, token)}
              onTouchEnd={cancelTouchTimer}
              onTouchMove={handleTouchMove}
              onTouchCancel={cancelTouchTimer}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
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
            className="fixed z-[55]"
            style={{ left: bubble.x, top: bubble.y - 72 }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 6 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="rounded-xl px-3 py-2 text-sm font-semibold text-white flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #D14D6F 0%, #E97A95 100%)",
                boxShadow: "0 4px 12px rgba(209,77,111,0.4)",
                maxWidth: 200,
              }}
            >
              <div className="flex-1 min-w-0">
                <span className="text-rose-200 text-xs block leading-none mb-0.5">
                  {bubble.word}
                </span>
                <span className="leading-snug">{bubble.vi}</span>
              </div>

              {/* Save button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave(bubble.word, bubble.vi);
                }}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: savedWords.has(bubble.word)
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.2)",
                }}
                title={savedWords.has(bubble.word) ? "Đã lưu" : "Lưu từ"}
              >
                {savingWord === bubble.word ? (
                  <span style={{ fontSize: 12 }}>⏳</span>
                ) : savedWords.has(bubble.word) ? (
                  <span style={{ fontSize: 12 }}>✓</span>
                ) : (
                  <span style={{ fontSize: 12 }}>📚</span>
                )}
              </button>
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

"use client";

/**
 * StoriesRenderer — full-screen Stories experience for a daily page.
 * Sits above the bottom nav (z-50, position fixed).
 *
 * Navigation:
 *   - Tap right 65% of screen → forward
 *   - Tap left 35% → backward
 *   - Swipe down (>80px) → exit confirmation
 *   - Interactive elements marked data-no-nav="true" intercept taps first
 *
 * Blueprint §7: card animations, progress dots, localStorage resume,
 * swipe-down exit, skip + "khó quá" flows.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { DailyPage, WordCard as WordCardType } from "@/types/notebook";
import { buildViMap } from "@/lib/notebook/test-page";
import { useRealtimeBroadcast } from "@/components/realtime/RealtimeProvider";
import { StoriesProgress } from "./StoriesProgress";
import { IntroCard } from "./cards/IntroCard";
import { WordCard } from "./cards/WordCard";
import { ReadingCard } from "./cards/ReadingCard";
import { ExerciseCard } from "./cards/ExerciseCard";
import { AskPromptCard } from "./cards/AskPromptCard";
import { CompletionCard } from "./cards/CompletionCard";

// ── Background ─────────────────────────────────────────────────
const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

// ── Card transition variants ───────────────────────────────────
const cardVariants = {
  enter: (dir: 1 | -1) => ({
    y: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 340, damping: 36 },
  },
  exit: (dir: 1 | -1) => ({
    y: dir > 0 ? "-60%" : "60%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const },
  }),
};

interface StoriesRendererProps {
  page: DailyPage;
  /** true when viewing an already-completed page from the scrapbook */
  isReview?: boolean;
}

export function StoriesRenderer({ page, isReview = false }: StoriesRendererProps) {
  const router = useRouter();
  const broadcast = useRealtimeBroadcast();
  const storageKey = `notebook_progress_${page.id}`;
  const viMap = buildViMap(page);
  const cards = page.cards;
  const total = cards.length;

  // Extract word cards once for CompletionCard vocab auto-save
  const wordCards = cards.filter((c): c is WordCardType => c.type === "word");

  // ── Card state ─────────────────────────────────────────────────
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [direction, setDirection] = useState<1 | -1>(1);

  // ── UI overlays ────────────────────────────────────────────────
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [tooHardToast, setTooHardToast] = useState(false);
  const tooHardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Gesture tracking ───────────────────────────────────────────
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const gestureHandled = useRef(false);

  // ── Restore from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { card_index, visited: savedVisited } = JSON.parse(saved) as {
          card_index: number;
          visited: number[];
        };
        if (card_index > 0 && card_index < total) {
          setCurrent(card_index);
          setVisited(new Set(savedVisited));
          setShowResumeBanner(true);
          setTimeout(() => setShowResumeBanner(false), 3000);
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to localStorage ───────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ card_index: current, visited: [...visited] })
      );
    } catch {
      // ignore quota errors
    }
  }, [current, visited, storageKey]);

  // ── Broadcast live card position to Masuri ────────────────────
  // Skip review mode (scrapbook re-reads) — only broadcast active study sessions.
  useEffect(() => {
    if (isReview) return;
    broadcast("heo:studying", {
      card_index: current,
      total,
      page_title: page.title_vi,
    });
  }, [broadcast, current, total, page.title_vi, isReview]);

  // ── Navigation ────────────────────────────────────────────────
  const goTo = useCallback(
    (index: number, dir: 1 | -1) => {
      if (index < 0 || index >= total) return;
      setDirection(dir);
      setCurrent(index);
      setVisited((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    },
    [total]
  );

  const goForward = useCallback(() => goTo(current + 1, 1), [current, goTo]);
  const goBack = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // Desktop keyboard nav (§8.1): ←/→ navigate, Space advances, Esc exits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goForward();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowExitConfirm(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goForward]);

  // ── Pointer handlers (swipe-down detection only) ─────────────
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    gestureHandled.current = false;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = null;

    // Swipe-down only: more than 80px down and not too wide
    if (dy > 80 && Math.abs(dx) < 60) {
      setShowExitConfirm(true);
      gestureHandled.current = true;
    }
  }

  // ── Click handler (tap navigation) ───────────────────────────
  // Uses onClick so e.target is reliable on iOS (unlike pointerup).
  // Skips navigation for: interactive elements (button/input/textarea/a/label)
  // and anything marked data-no-nav. Empty card space still navigates.
  function onTapNav(e: React.MouseEvent<HTMLDivElement>) {
    if (gestureHandled.current) {
      gestureHandled.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "[data-no-nav], button, input, textarea, select, a, label, [contenteditable]"
      )
    ) return;

    const pct = e.clientX / window.innerWidth;
    if (pct <= 0.35 && current > 0) {
      goBack();
    } else if (pct > 0.35 && current < total - 1) {
      goForward();
    }
  }

  // ── Skip / too hard ───────────────────────────────────────────
  function handleSkip() {
    if (current < total - 1) goForward();
  }

  function handleTooHard() {
    if (tooHardTimer.current) clearTimeout(tooHardTimer.current);
    setTooHardToast(true);
    tooHardTimer.current = setTimeout(() => {
      setTooHardToast(false);
      if (current < total - 1) goForward();
    }, 2500);

    // Blueprint §7: ping Masuri (rate-limited: max 1 per page per day).
    // Client-side guard via localStorage so we don't even hit the server on subsequent taps.
    const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const lsKey = `toohardPinged_${page.id}_${today}`;
    try {
      if (!localStorage.getItem(lsKey)) {
        localStorage.setItem(lsKey, "1");
        fetch("/api/notebook/too-hard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_id: page.id, card_index: current }),
        }).catch(() => {});
      }
    } catch {
      // ignore localStorage errors
    }
  }

  // ── Render card ───────────────────────────────────────────────
  function renderCard() {
    const card = cards[current];
    switch (card.type) {
      case "intro":
        return <IntroCard card={card} />;
      case "word":
        return <WordCard card={card} viMap={viMap} />;
      case "reading":
        return (
          <ReadingCard
            card={card}
            viMap={viMap}
            sourcePageId={page.id}
            sourcePageTopic={page.topic}
            sourcePageTitleVi={page.title_vi}
          />
        );
      case "exercise":
        return (
          <ExerciseCard card={card} onSkip={handleSkip} onTooHard={handleTooHard} />
        );
      case "ask_prompt":
        return <AskPromptCard card={card} />;
      case "completion":
        return (
          <CompletionCard
            card={card}
            pageTitle={page.title_vi}
            pageId={page.id}
            wordCards={wordCards}
            onReview={() => goTo(0, -1)}
            isReview={isReview}
          />
        );
      default:
        return null;
    }
  }

  return (
    <>
      {/* ── Full-screen lesson view ───────────────────────────────────────
         Mobile: covers the whole viewport (above the bottom nav).
         Desktop (lg+): the SideNav stays visible on the left (240px), the
         story fills the rest of the viewport — content max-width 720px
         centered inside so readable line length stays sane.
         Earlier this was a 420px floating modal — too small on a Macbook. */}
      <div
        className="fixed inset-0 z-50 overflow-hidden select-none lg:left-60"
        style={PAPER_BG}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onTapNav}
      >
        {/* Top bar: close + progress dots + counter
           Max-width matches the card column on desktop so the dots line up. */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 lg:max-w-3xl lg:mx-auto lg:px-8">
          <button
            type="button"
            data-no-nav="true"
            onClick={() => setShowExitConfirm(true)}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100"
            aria-label="Thoát"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex-1">
            <StoriesProgress
              total={total}
              current={current}
              visited={visited}
              onJump={(i) => goTo(i, i > current ? 1 : -1)}
            />
          </div>

          <span className="shrink-0 text-xs text-rose-300 font-medium tabular-nums w-8 text-right">
            {current + 1}/{total}
          </span>
        </div>

        {/* Card area — capped to 720px on desktop so reading width stays sane */}
        <div className="absolute inset-0 pt-16">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 pt-4 overflow-y-auto lg:max-w-3xl lg:mx-auto"
            >
              {renderCard()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Resume banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {showResumeBanner && (
          <motion.div
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] px-5 py-2.5 rounded-2xl text-sm font-semibold text-white whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #D14D6F, #E97A95)",
              boxShadow: "0 4px 16px rgba(209,77,111,0.4)",
            }}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
          >
            Tiếp tục từ đây nha 💕
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Too hard toast ────────────────────────────────────── */}
      <AnimatePresence>
        {tooHardToast && (
          <motion.div
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl text-sm font-semibold text-ink text-center whitespace-nowrap"
            style={{
              backgroundColor: "#FFF5F7",
              border: "1px solid #FFC9D5",
              boxShadow: "var(--shadow)",
            }}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
          >
            Không sao đâu, mai mình thử lại nha 🌸
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exit confirmation sheet ────────────────────────────── */}
      <AnimatePresence>
        {showExitConfirm && (
          <>
            <motion.div
              className="fixed inset-0 z-[65] bg-ink/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExitConfirm(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[66] bg-white rounded-t-3xl px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
              style={{ boxShadow: "0 -8px 32px rgba(58,33,41,0.18)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mx-auto w-10 h-1 bg-rose-200 rounded-full mb-5" />
              <p className="text-lg font-bold text-ink mb-1 text-center">
                Lưu tiến độ và quay lại?
              </p>
              <p className="text-sm text-ink-soft text-center mb-6">
                Heo có thể tiếp tục sau — tiến độ được lưu lại nha 💕
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 rounded-2xl border border-rose-200 text-sm font-semibold text-rose-400"
                >
                  Học tiếp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(storageKey);
                    router.push("/heo/notebook");
                  }}
                  className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold"
                >
                  Quay lại sổ
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

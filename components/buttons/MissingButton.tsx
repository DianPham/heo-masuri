"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Pig } from "@/components/theme/Pig";
import { FloatingHeart } from "@/components/theme/Heart";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { RealtimeEvent } from "@/components/realtime/RealtimeProvider";

const HOLD_2 = 400;   // ms → intensity 2
const HOLD_3 = 1500;  // ms → intensity 3
const DEBOUNCE = 500; // ms minimum between sends

// Ring at r=68, C = 2π×68 ≈ 427.3
const RING_C = 427.3;

type Phase = "idle" | "pressing" | "sending" | "sent" | "acked";

interface SpawnedHeart {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export function MissingButton({ initialCountToday = 0 }: { initialCountToday?: number }) {
  const t = useTranslations("missing");

  const [phase, setPhase] = useState<Phase>("idle");
  const [holdProgress, setHoldProgress] = useState(0);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(1);
  const [countToday, setCountToday] = useState(initialCountToday);
  const [pigPose, setPigPose] = useState<"neutral" | "heart-eyes">("neutral");
  const [hearts, setHearts] = useState<SpawnedHeart[]>([]);

  const phaseRef = useRef<Phase>("idle");
  const pendingAckIdRef = useRef<string | null>(null);
  const pressStartRef = useRef(0);
  const lastSentRef = useRef(0);
  const rafRef = useRef<number>(0);
  const intensityRef = useRef<1 | 2 | 3>(1);
  const heartIdRef = useRef(0);

  phaseRef.current = phase;

  // ── Press start ──────────────────────────────────────────────────
  function startHold() {
    if (phaseRef.current !== "idle") return;
    if (Date.now() - lastSentRef.current < DEBOUNCE) return;

    pressStartRef.current = Date.now();
    intensityRef.current = 1;
    setPhase("pressing");
    setHoldProgress(0);
    setIntensity(1);
    if (navigator.vibrate) navigator.vibrate(8);

    function tick() {
      const elapsed = Date.now() - pressStartRef.current;
      let next: 1 | 2 | 3;
      let progress: number;

      if (elapsed < HOLD_2) {
        next = 1;
        progress = (elapsed / HOLD_2) * 0.48;
      } else if (elapsed < HOLD_3) {
        next = 2;
        progress = 0.48 + ((elapsed - HOLD_2) / (HOLD_3 - HOLD_2)) * 0.48;
      } else {
        next = 3;
        progress = 1;
        if (intensityRef.current !== 3) {
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        }
      }

      intensityRef.current = next;
      setIntensity(next);
      setHoldProgress(progress);

      if (phaseRef.current === "pressing") {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // ── Press end ────────────────────────────────────────────────────
  function endHold() {
    if (phaseRef.current !== "pressing") return;
    cancelAnimationFrame(rafRef.current);

    const elapsed = Date.now() - pressStartRef.current;
    const final: 1 | 2 | 3 = elapsed >= HOLD_3 ? 3 : elapsed >= HOLD_2 ? 2 : 1;
    setHoldProgress(0);
    sendMissing(final);
  }

  function cancelHold() {
    if (phaseRef.current !== "pressing") return;
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setHoldProgress(0);
  }

  // ── Heart burst ──────────────────────────────────────────────────
  function spawnHearts(fin: 1 | 2 | 3) {
    const color = fin === 3 ? "#A8324F" : "#D14D6F";
    const count = fin === 3 ? 8 : fin === 2 ? 6 : 4;
    const batch: SpawnedHeart[] = Array.from({ length: count }, () => ({
      id: heartIdRef.current++,
      x: (Math.random() - 0.5) * 100,
      y: -(24 + Math.random() * 48),
      size: 10 + Math.floor(Math.random() * 10),
      color,
    }));
    setHearts(prev => [...prev, ...batch]);
    setTimeout(() => setHearts(prev => prev.filter(h => !batch.some(b => b.id === h.id))), 1400);
  }

  // ── Send to server ───────────────────────────────────────────────
  async function sendMissing(fin: 1 | 2 | 3) {
    setPhase("sending");
    setIntensity(fin);
    lastSentRef.current = Date.now();

    try {
      const res = await fetch("/api/signal/missing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intensity: fin }),
      });
      if (!res.ok) throw new Error();

      const { id, count_today } = await res.json();
      pendingAckIdRef.current = id;
      setCountToday(count_today);
      setPhase("sent");
      spawnHearts(fin);

      // Auto-reset after 30s if no ack arrives
      setTimeout(() => {
        if (phaseRef.current === "sent") {
          pendingAckIdRef.current = null;
          setPhase("idle");
        }
      }, 30_000);
    } catch {
      // TODO: queue in IndexedDB for offline retry
      setPhase("idle");
    }
  }

  // ── Realtime: Masuri acked ───────────────────────────────────────
  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event === "missing:ack" && e.payload.id === pendingAckIdRef.current) {
      pendingAckIdRef.current = null;
      setPhase("acked");
      setPigPose("heart-eyes");
      setTimeout(() => {
        setPigPose("neutral");
        setPhase("idle");
      }, 5000);
    }
  }, []);

  useRealtime(handleRealtime);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const isPressing = phase === "pressing";
  const isSending  = phase === "sending";
  const isSent     = phase === "sent";
  const isAcked    = phase === "acked";
  const glow       = intensity === 3 && isPressing;

  return (
    <div className="flex flex-col items-center gap-8">

      {/* ── Button + ring + hearts ── */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>

        {/* Progress ring */}
        <svg
          className="absolute inset-0 -rotate-90 pointer-events-none"
          width={160}
          height={160}
          viewBox="0 0 160 160"
        >
          <circle
            cx={80} cy={80} r={68}
            fill="none"
            stroke="#D14D6F"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${holdProgress * RING_C} ${RING_C}`}
            style={{ opacity: holdProgress > 0 ? 0.55 : 0, transition: "opacity 0.15s" }}
          />
        </svg>

        {/* Floating hearts */}
        {hearts.map(h => (
          <FloatingHeart
            key={h.id}
            size={h.size}
            color={h.color}
            style={{ left: "50%", top: "50%", marginLeft: h.x, marginTop: h.y }}
          />
        ))}

        {/* The button */}
        <motion.button
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          disabled={isSending}
          className="w-36 h-36 rounded-full flex items-center justify-center
                     touch-none select-none cursor-pointer disabled:opacity-70
                     bg-gradient-to-br from-rose-300 to-rose-500"
          animate={{
            scale: isPressing ? 0.95 : 1,
            boxShadow: glow
              ? [
                  "0 0 0 0 rgba(209,77,111,0)",
                  "0 0 36px 14px rgba(209,77,111,0.45)",
                  "0 0 0 0 rgba(209,77,111,0)",
                ]
              : "0 8px 32px -8px rgba(168,50,79,0.32)",
          }}
          transition={
            glow
              ? {
                  boxShadow: { repeat: Infinity, duration: 1.1, ease: "easeInOut" },
                  scale: { type: "spring", stiffness: 400, damping: 25 },
                }
              : { type: "spring", stiffness: 400, damping: 25 }
          }
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Pig pose={pigPose} size={76} animate={false} />
        </motion.button>
      </div>

      {/* ── Status label ── */}
      <div className="h-10 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {isAcked ? (
            <motion.p key="acked"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-body text-base font-medium text-rose-500"
            >
              {t("ackedJustNow")}
            </motion.p>
          ) : isSent ? (
            <motion.p key="sent"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="font-body text-base text-ink-soft"
            >
              {t("sent")}
            </motion.p>
          ) : isSending ? (
            <motion.p key="sending"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-body text-sm text-ink-soft/60"
            >
              {t("sending")}
            </motion.p>
          ) : isPressing ? (
            <motion.p key={`pressing-${intensity}`}
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={[
                "font-body text-sm font-medium",
                intensity === 3 ? "text-rose-600" : "text-ink-soft",
              ].join(" ")}
            >
              {intensity === 1 ? t("tap") : intensity === 2 ? t("hold") : t("longHold")}
            </motion.p>
          ) : (
            <motion.p key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="font-body text-sm text-ink-soft/50"
            >
              {countToday > 0 ? t("todayCount", { count: countToday }) : ""}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Pig } from "@/components/theme/Pig";
import { useRealtime } from "./RealtimeProvider";
import type { RealtimeEvent } from "./RealtimeProvider";
import { signalPushEligible } from "@/lib/push-eligible";

type Who = "heo" | "masuri";

interface IncomingPing {
  id: string;
  kind: "thinking" | "hug" | "kiss";
  from: string;
  from_name: string;
}

// Gap between sequentially queued animations (ms)
const INTER_PING_GAP = 600;

export function ThinkingIncoming({ who }: { who: Who }) {
  const t = useTranslations("thinking");
  const [currentPing, setCurrentPing] = useState<IncomingPing | null>(null);
  const [batchToast, setBatchToast]   = useState<{ count: number } | null>(null);

  // Use a ref for the queue so the processor always sees the latest value
  const queueRef     = useRef<IncomingPing[]>([]);
  const isPlayingRef = useRef(false);

  // Mark a single ping as seen (fire-and-forget)
  const markSeen = useCallback((id: string) => {
    fetch("/api/signal/thinking/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  // Drain the queue one item at a time (or batch if >3)
  const drainQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    const queue = queueRef.current;
    if (queue.length === 0) return;

    isPlayingRef.current = true;

    if (queue.length > 3) {
      // Batch: show a count toast, mark all as seen immediately
      const batch = queue.splice(0, queue.length);
      batch.forEach(p => markSeen(p.id));
      setBatchToast({ count: batch.length });
      setTimeout(() => {
        setBatchToast(null);
        isPlayingRef.current = false;
        drainQueue();
      }, 5000);
      return;
    }

    const next = queue.shift()!;
    markSeen(next.id);
    setCurrentPing(next);

    const duration = next.kind === "thinking" ? 5000 : 3000;
    setTimeout(() => {
      setCurrentPing(null);
      isPlayingRef.current = false;
      setTimeout(drainQueue, INTER_PING_GAP);
    }, duration);
  }, [markSeen]);

  // Fetch unseen pings (on mount + when app becomes visible again)
  const fetchUnseen = useCallback(async () => {
    try {
      const res = await fetch("/api/signal/thinking/unseen");
      if (!res.ok) return;
      const { pings } = await res.json() as { pings: IncomingPing[] };
      if (!pings || pings.length === 0) return;
      // Dedupe against pings already in the queue
      const existingIds = new Set(queueRef.current.map(p => p.id));
      const newPings = pings.filter(p => !existingIds.has(p.id));
      if (newPings.length === 0) return;
      queueRef.current.push(...newPings);
      drainQueue();
    } catch { /* ignore — Realtime covers live events */ }
  }, [drainQueue]);

  useEffect(() => {
    fetchUnseen();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchUnseen();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      // Mark any still-queued pings as seen on unmount
      queueRef.current.forEach(p => markSeen(p.id));
      queueRef.current = [];
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchUnseen, markSeen]);

  // Realtime handler: push to queue rather than showing immediately,
  // so queued replays and live events don't collide
  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event !== "thinking:new") return;
    if (e.payload.from === who) return;
    signalPushEligible();
    const { id, kind, from_name } = e.payload;
    queueRef.current.push({ id, kind: kind as IncomingPing["kind"], from: e.payload.from, from_name });
    drainQueue();
  }, [who, drainQueue]);

  useRealtime(handleRealtime);

  const msgKey =
    currentPing?.kind === "thinking" ? "thinkingReceived"
    : currentPing?.kind === "hug"    ? "hugReceived"
    :                                   "kissReceived";

  return (
    <AnimatePresence>

      {/* ── Batch toast (>3 unseen at once) ── */}
      {batchToast && (
        <motion.div
          key="batch"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => setBatchToast(null)}
        >
          <div
            className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            <Pig pose="heart-eyes" size={40} animate={false} />
            <p className="font-body text-sm font-semibold text-ink leading-snug flex-1">
              {who === "heo" ? "Masuri" : "Heo"} đã nhớ em {batchToast.count} lần khi đi vắng 🥰
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Thinking: slide-down toast ── */}
      {currentPing?.kind === "thinking" && (
        <motion.div
          key={`thinking-${currentPing.id}`}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => setCurrentPing(null)}
        >
          <div
            className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            <Pig pose="heart-eyes" size={40} animate={false} />
            <p className="font-body text-sm font-semibold text-ink leading-snug flex-1">
              {t(msgKey, { name: currentPing.from_name })}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Hug: screen-edge pink glow pulse ── */}
      {currentPing?.kind === "hug" && (
        <motion.div
          key={`hug-${currentPing.id}`}
          className="fixed inset-0 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1, 0] }}
          transition={{ duration: 2.8, times: [0, 0.15, 0.5, 0.7, 1], ease: "easeInOut" }}
          style={{ boxShadow: "inset 0 0 120px 60px rgba(209,77,111,0.4)" }}
        />
      )}

      {/* ── Kiss: 💋 slides across screen ── */}
      {currentPing?.kind === "kiss" && (
        <motion.div
          key={`kiss-${currentPing.id}`}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            className="absolute text-7xl"
            style={{ top: "38%" }}
            initial={{ x: "110vw", opacity: 1, scale: 0.8 }}
            animate={{
              x: ["110vw", "50vw", "-20vw"],
              scale: [0.8, 1.5, 1.1],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 2.4, ease: [0.22, 0.61, 0.36, 1] }}
          >
            💋
          </motion.span>
        </motion.div>
      )}

    </AnimatePresence>
  );
}

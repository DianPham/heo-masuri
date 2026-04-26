"use client";

import { useState, useCallback } from "react";
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
  from_name: string;
}

export function ThinkingIncoming({ who }: { who: Who }) {
  const t = useTranslations("thinking");
  const [ping, setPing] = useState<IncomingPing | null>(null);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event !== "thinking:new") return;
    if (e.payload.from === who) return; // ignore own sends

    const { id, kind, from_name } = e.payload;
    setPing({ id, kind: kind as IncomingPing["kind"], from_name });
    signalPushEligible();

    fetch("/api/signal/thinking/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setTimeout(() => setPing(null), kind === "thinking" ? 5000 : 3000);
  }, [who]);

  useRealtime(handleRealtime);

  const msgKey =
    ping?.kind === "thinking" ? "thinkingReceived"
    : ping?.kind === "hug"    ? "hugReceived"
    :                           "kissReceived";

  return (
    <AnimatePresence>

      {/* ── Thinking: slide-down toast ── */}
      {ping?.kind === "thinking" && (
        <motion.div
          key={`thinking-${ping.id}`}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-auto"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => setPing(null)}
        >
          <div
            className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            <Pig pose="heart-eyes" size={40} animate={false} />
            <p className="font-body text-sm font-semibold text-ink leading-snug flex-1">
              {t(msgKey, { name: ping.from_name })}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Hug: screen-edge pink glow pulse ── */}
      {ping?.kind === "hug" && (
        <motion.div
          key={`hug-${ping.id}`}
          className="fixed inset-0 z-40 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.5, 1, 0] }}
          transition={{ duration: 2.8, times: [0, 0.15, 0.5, 0.7, 1], ease: "easeInOut" }}
          style={{ boxShadow: "inset 0 0 120px 60px rgba(209,77,111,0.4)" }}
        />
      )}

      {/* ── Kiss: 💋 slides across screen ── */}
      {ping?.kind === "kiss" && (
        <motion.div
          key={`kiss-${ping.id}`}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            className="absolute text-7xl"
            style={{ top: "38%" }}
            initial={{ x: "110vw", opacity: 1, scale: 0.8 }}
            animate={{
              x: [" 110vw", "50vw", "-20vw"],
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

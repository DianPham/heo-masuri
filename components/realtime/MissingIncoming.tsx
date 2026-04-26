"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { Pig } from "@/components/theme/Pig";
import { useRealtime } from "./RealtimeProvider";
import type { RealtimeEvent } from "./RealtimeProvider";

interface IncomingSignal {
  id: string;
  intensity: number;
  count_today: number;
}

export function MissingIncoming() {
  const t = useTranslations("missing");
  const locale = useLocale();
  const [signal, setSignal] = useState<IncomingSignal | null>(null);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event !== "missing:new") return;
    const { id, intensity, count_today } = e.payload;
    setSignal({ id, intensity, count_today });
    setTimeout(() => setSignal(null), 6000);
  }, []);

  useRealtime(handleRealtime);

  const title =
    signal?.intensity === 3
      ? locale === "vi" ? "💔 Heo nhớ Masuri lắm lắm" : "💔 Heo misses you so much"
      : locale === "vi" ? "🐷 Heo nhớ Masuri"          : "🐷 Heo is missing you";

  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          key={signal.id}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-safe"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
          onClick={() => setSignal(null)}
        >
          <div
            className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            <Pig pose="heart-eyes" size={40} animate={false} />
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-semibold text-ink leading-snug">
                {title}
              </p>
              <p className="font-body text-xs text-ink-soft mt-0.5">
                {t("todayCount", { count: signal.count_today })}
              </p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: signal.intensity }).map((_, i) => (
                <span key={i} className="text-rose-400 text-sm">❤️</span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

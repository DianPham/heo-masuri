"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { useRealtime } from "./RealtimeProvider";
import type { RealtimeEvent } from "./RealtimeProvider";

export function ReunionListener() {
  const router = useRouter();
  const locale = useLocale();
  const [msg, setMsg] = useState<string | null>(null);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event !== "reunion:updated") return;
    router.refresh();
    setMsg(
      e.payload.target_date
        ? (locale === "vi" ? "Masuri đã cập nhật ngày gặp lại 💕" : "Masuri updated the reunion date 💕")
        : (locale === "vi" ? "Masuri đã xóa countdown 🌙" : "Masuri removed the countdown 🌙")
    );
    setTimeout(() => setMsg(null), 5000);
  }, [router, locale]);

  useRealtime(handleRealtime);

  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div
            className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 max-w-xs w-full"
            style={{ boxShadow: "0 8px 24px -6px rgba(168,50,79,0.22)" }}
          >
            <p className="font-body text-sm font-semibold text-ink leading-snug">{msg}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

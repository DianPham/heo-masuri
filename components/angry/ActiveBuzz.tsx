"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { RealtimeEvent } from "@/components/realtime/RealtimeProvider";

type NeedType = "space" | "presence" | "vent" | "fix";

const REPLY_LABELS: Record<string, string> = {
  sorry:      "Xin lỗi em 🙏",
  on_my_way:  "Anh đang đến 🏃",
  talk_in_10: "10 phút nữa mình nói chuyện nhé 💬",
  heard_you:  "Anh nghe em rồi 💕",
};

interface ActiveBuzzProps {
  id: string;
  needType: NeedType;
  needLabel: string;
  initialReply: string | null;
}

export function ActiveBuzz({ id, needType, needLabel, initialReply }: ActiveBuzzProps) {
  const t = useTranslations("angry");
  const router = useRouter();
  const [reply, setReply]         = useState<string | null>(initialReply);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved]   = useState(false);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event === "angry:reply" && e.payload.id === id) {
      setReply(e.payload.reply);
    }
  }, [id]);

  useRealtime(handleRealtime);

  async function handleResolve() {
    if (resolving || resolved) return;
    setResolving(true);
    try {
      await fetch("/api/signal/angry/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setResolved(true);
      setTimeout(() => router.push("/heo"), 2000);
    } catch {
      setResolving(false);
    }
  }

  // suppress unused warning — needType reserved for future colour theming
  void needType;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] px-5 pt-8 pb-10">
      <AnimatePresence mode="wait">

        {/* ── Resolved state ── */}
        {resolved ? (
          <motion.div
            key="resolved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="flex flex-col items-center justify-center gap-6 flex-1"
          >
            <Pig pose="sparkle" size={100} animate={false} />
            <p
              className="font-display text-2xl text-rose-500 italic text-center"
              style={{ fontVariationSettings: "'opsz' 36" }}
            >
              {t("okayNow")}
            </p>
          </motion.div>

        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 w-full flex-1"
          >

            {/* ── What was sent ── */}
            <div className="rounded-2xl px-5 py-5 bg-white/50 border-2 border-rose-200/50">
              <p className="font-accent text-sm text-ink-soft/60 mb-1">{t("sent")}</p>
              <p className="font-accent text-base font-semibold text-ink">{needLabel}</p>
            </div>

            {/* ── Reply card ── */}
            <div
              className="rounded-3xl px-5 py-5 flex-1 flex flex-col justify-center min-h-[110px]"
              style={{
                background: "linear-gradient(145deg, #FFE4EA 0%, #FFF5F7 100%)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <p className="font-accent text-sm text-ink-soft/60 mb-3">{t("danReplied")}</p>
              <AnimatePresence mode="wait">
                {reply ? (
                  <motion.p
                    key={reply}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-accent text-lg text-ink"
                  >
                    {REPLY_LABELS[reply] ?? reply}
                  </motion.p>
                ) : (
                  <motion.p
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.75, 0.4] }}
                    transition={{
                      opacity: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      default: { duration: 0.3 },
                    }}
                    className="font-accent text-base text-ink-soft/60 italic"
                  >
                    {t("waitingReply")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* ── Resolve button ── */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleResolve}
              disabled={resolving}
              className="w-full py-4 rounded-2xl font-accent text-base text-white
                         disabled:opacity-50 transition-colors duration-150"
              style={{
                backgroundColor: "#9CAF88",
                boxShadow: "0 8px 24px -8px rgba(156,175,136,0.55)",
              }}
            >
              {t("okayNow")}
            </motion.button>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

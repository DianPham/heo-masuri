"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";
import { useRealtime } from "@/components/realtime/RealtimeProvider";
import type { RealtimeEvent } from "@/components/realtime/RealtimeProvider";

type NeedType = "space" | "presence" | "vent" | "fix";

const NEED_LABELS: Record<NeedType, string> = {
  space:    "Heo cần một chút không gian",
  presence: "Heo cần Masuri ở đây",
  vent:     "Heo cần được lắng nghe",
  fix:      "Heo cần Masuri giúp sửa một chuyện",
};

const GUIDANCE: Record<NeedType, string> = {
  space:    "Lùi lại, đừng nhắn dồn. Cho Heo thời gian.",
  presence: "Gọi điện hoặc tới ngay nếu được.",
  vent:     "Heo cần được lắng nghe. Đừng sửa, đừng khuyên — chỉ cần ở đó.",
  fix:      "Hỏi cụ thể vấn đề là gì.",
};

const REPLY_OPTIONS = [
  { key: "heard_you",  label: "Anh nghe em rồi 💕" },
  { key: "sorry",      label: "Xin lỗi em 🙏" },
  { key: "on_my_way",  label: "Anh đang đến 🏃" },
  { key: "talk_in_10", label: "10 phút nữa mình nói chuyện nhé 💬" },
] as const;

interface MasuriAngryViewProps {
  id: string;
  needType: NeedType;
  contextNote: string | null;
  initialReply: string | null;
}

export function MasuriAngryView({ id, needType, contextNote, initialReply }: MasuriAngryViewProps) {
  const router = useRouter();
  const [reply, setReply]       = useState<string | null>(initialReply);
  const [sending, setSending]   = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  const handleReply = useCallback(async (replyKey: string) => {
    if (reply || sending) return;
    setSending(replyKey);
    try {
      const res = await fetch("/api/signal/angry/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reply: replyKey }),
      });
      if (res.ok) setReply(replyKey);
    } finally {
      setSending(null);
    }
  }, [id, reply, sending]);

  const handleRealtime = useCallback((e: RealtimeEvent) => {
    if (e.event === "angry:resolved" && e.payload.id === id) {
      setResolved(true);
      setTimeout(() => router.push("/masuri"), 2000);
    }
  }, [id, router]);

  useRealtime(handleRealtime);

  const replyLabel = REPLY_OPTIONS.find(o => o.key === reply)?.label ?? reply;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-96px)] px-5 pt-8 pb-10">
      <AnimatePresence mode="wait">

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
              Heo ổn rồi 🌸
            </p>
          </motion.div>

        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 w-full flex-1"
          >
            {/* ── Need label ── */}
            <div
              className="rounded-3xl px-5 py-5"
              style={{
                background: "linear-gradient(145deg, #FFE4EA 0%, #FFF5F7 100%)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <p className="font-accent text-sm text-ink-soft/60 mb-1">Heo cần:</p>
              <p className="font-accent text-lg font-semibold text-ink">
                {NEED_LABELS[needType]}
              </p>
              {contextNote && (
                <p className="font-accent text-base text-ink-soft mt-3 pt-3 border-t border-rose-200/60">
                  &ldquo;{contextNote}&rdquo;
                </p>
              )}
            </div>

            {/* ── Guidance ── */}
            <div className="rounded-2xl px-5 py-4 bg-white/50 border-2 border-rose-200/40">
              <p className="font-accent text-sm text-ink-soft/60 mb-1">Gợi ý:</p>
              <p className="font-accent text-base text-ink leading-snug">
                {GUIDANCE[needType]}
              </p>
            </div>

            {/* ── Reply area ── */}
            <div className="flex-1 flex flex-col justify-end gap-3">
              {reply ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl px-5 py-4 bg-white/70 border-2 border-rose-200/50 text-center"
                >
                  <p className="font-accent text-sm text-ink-soft/60 mb-1">Đã gửi cho Heo:</p>
                  <p className="font-accent text-base font-semibold text-ink">{replyLabel}</p>
                </motion.div>
              ) : (
                <>
                  <p className="font-accent text-sm text-ink-soft/60 text-center">Trả lời cho Heo:</p>
                  <div className="flex flex-col gap-2.5">
                    {REPLY_OPTIONS.map(({ key, label }) => (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.97 }}
                        disabled={!!sending}
                        onClick={() => handleReply(key)}
                        className="w-full py-4 rounded-2xl font-accent text-base text-white
                                   disabled:opacity-50 transition-opacity duration-150"
                        style={{
                          backgroundColor: sending === key ? "#c4768a" : "#d1547a",
                          boxShadow: "0 6px 20px -8px rgba(168,50,79,0.40)",
                        }}
                      >
                        {sending === key ? "Đang gửi..." : label}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

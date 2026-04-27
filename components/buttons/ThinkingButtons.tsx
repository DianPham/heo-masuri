"use client";

import { useState } from "react";
import { motion } from "motion/react";

type Kind = "thinking" | "hug" | "kiss";
type Who  = "heo" | "masuri";

const BUTTONS: { kind: Kind; emoji: string; labelVI: (r: string) => string; labelEN: (r: string) => string }[] = [
  { kind: "thinking", emoji: "❤️", labelVI: r => `Nhớ ${r}`, labelEN: r => `Miss ${r}` },
  { kind: "hug",      emoji: "🤗", labelVI: _r => "Ôm",       labelEN: _r => "Hug" },
  { kind: "kiss",     emoji: "💋", labelVI: _r => "Hôn",      labelEN: _r => "Kiss" },
];

export function ThinkingButtons({ who, locale }: { who: Who; locale: string }) {
  const recipient = who === "heo" ? "Masuri" : "Heo";
  const [sending,  setSending]  = useState<Kind | null>(null);
  const [sentKind, setSentKind] = useState<Kind | null>(null);

  async function send(kind: Kind) {
    if (sending) return;
    setSending(kind);
    try {
      await fetch("/api/signal/thinking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      setSentKind(kind);
      setTimeout(() => setSentKind(prev => (prev === kind ? null : prev)), 2000);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="flex gap-3 w-full">
      {BUTTONS.map(({ kind, emoji, labelVI, labelEN }) => {
        const label  = locale === "vi" ? labelVI(recipient) : labelEN(recipient);
        const isSent = sentKind === kind;
        return (
          <motion.button
            key={kind}
            whileTap={{ scale: 0.88 }}
            whileHover={{ y: -3 }}
            onClick={() => send(kind)}
            disabled={!!sending}
            /* flex-1 → all three buttons share width equally, text never dictates size */
            className={[
              "flex-1 flex flex-col items-center gap-2.5 py-5 rounded-2xl border-2 disabled:opacity-60 transition-all duration-200",
              isSent
                ? "bg-rose-200/70 border-rose-300"
                : "bg-white/60 border-rose-200/60 hover:bg-rose-50 hover:border-rose-300",
            ].join(" ")}
            style={{
              boxShadow: isSent
                ? "0 6px 20px -6px rgba(168,50,79,0.3)"
                : "0 2px 12px -4px rgba(168,50,79,0.08)",
            }}
          >
            <motion.span
              className="text-3xl leading-none"
              animate={isSent ? { scale: [1, 1.6, 1], rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {isSent ? "💕" : emoji}
            </motion.span>
            {/* font-accent (Caveat) gives a warm handwritten feel; truncate prevents wrapping */}
            <span className="font-accent text-sm text-ink-soft leading-none text-center w-full px-1 truncate">
              {isSent ? (locale === "vi" ? "Đã gửi ✓" : "Sent ✓") : label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

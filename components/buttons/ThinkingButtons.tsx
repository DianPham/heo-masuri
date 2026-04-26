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
    <div className="flex gap-3 justify-center">
      {BUTTONS.map(({ kind, emoji, labelVI, labelEN }) => {
        const label  = locale === "vi" ? labelVI(recipient) : labelEN(recipient);
        const isSent = sentKind === kind;
        return (
          <motion.button
            key={kind}
            whileTap={{ scale: 0.88 }}
            onClick={() => send(kind)}
            disabled={!!sending}
            className="flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl
                       bg-rose-100 border border-rose-200/60 disabled:opacity-60
                       hover:bg-rose-200/50 active:bg-rose-200 transition-colors duration-150"
          >
            <motion.span
              className="text-xl"
              animate={isSent ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {isSent ? "💕" : emoji}
            </motion.span>
            <span className="font-body text-xs font-medium text-ink-soft whitespace-nowrap">
              {isSent ? (locale === "vi" ? "Đã gửi" : "Sent") : label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

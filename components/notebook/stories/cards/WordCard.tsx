"use client";

import { motion } from "motion/react";
import { useTTS } from "@/hooks/useTTS";
import type { WordCard as WordCardType } from "@/types/notebook";

const POS_VI: Record<string, string> = {
  noun: "danh từ",
  verb: "động từ",
  adj: "tính từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  phrase: "cụm từ",
  interjection: "thán từ",
};

export function WordCard({ card, viMap }: { card: WordCardType; viMap: Record<string, string> }) {
  const { speak } = useTTS();

  return (
    <div className="flex flex-col justify-between h-full px-7 py-10">
      {/* Emoji header */}
      {card.image_emoji && (
        <motion.div
          className="text-center"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 20 }}
        >
          <span style={{ fontSize: 64 }} aria-hidden>
            {card.image_emoji}
          </span>
        </motion.div>
      )}

      {/* Word + pronunciation */}
      <motion.div
        className="text-center space-y-2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* POS tag */}
        {card.pos && (
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
            {POS_VI[card.pos] ?? card.pos}
          </p>
        )}

        {/* The word itself — tap to hear */}
        <button
          type="button"
          data-no-nav="true"
          onClick={() => speak(card.word_en)}
          className="group flex items-center gap-2 mx-auto rounded-2xl px-4 py-2 active:bg-rose-50 transition-colors"
          aria-label={`Nghe phát âm: ${card.word_en}`}
        >
          <span
            className="text-5xl font-bold text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {card.word_en}
          </span>
          <span className="text-rose-400 text-xl group-active:scale-110 transition-transform">
            🔊
          </span>
        </button>

        <p className="text-xl text-ink-soft font-medium">{card.word_vi}</p>
      </motion.div>

      {/* Example sentences */}
      <motion.div
        className="rounded-2xl p-5 space-y-2"
        style={{ backgroundColor: "rgba(255,201,213,0.18)", border: "1px solid rgba(255,201,213,0.5)" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          type="button"
          data-no-nav="true"
          onClick={() => speak(card.example_en)}
          className="text-left w-full"
          aria-label={`Nghe ví dụ: ${card.example_en}`}
        >
          <p
            className="text-base text-ink leading-relaxed italic flex items-start gap-2"
            style={{ fontFamily: "var(--font-body)" }}
          >
            <span className="text-rose-400 not-italic shrink-0">🔊</span>
            &ldquo;{card.example_en}&rdquo;
          </p>
        </button>
        <p className="text-sm text-ink-soft leading-relaxed pl-6">
          &ldquo;{card.example_vi}&rdquo;
        </p>
      </motion.div>
    </div>
  );
}

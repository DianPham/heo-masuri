"use client";

import { motion } from "motion/react";
import { useTTS } from "@/hooks/useTTS";
import type { LessonWordCard } from "@/lib/notebook/lesson";
import type { LessonLang } from "@/types/notebook";

const POS_VI: Record<string, string> = {
  noun: "danh từ",
  verb: "động từ",
  adj: "tính từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  phrase: "cụm từ",
  interjection: "thán từ",
  pronoun: "đại từ",
  particle: "trợ từ",
  measure_word: "lượng từ",
  number: "số từ",
};

export function WordCard({ card, lang }: { card: LessonWordCard; lang: LessonLang }) {
  const { speak } = useTTS(lang);

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
          onClick={() => speak(card.word)}
          className="group flex items-center gap-2 mx-auto rounded-2xl px-4 py-2 active:bg-rose-50 transition-colors"
          aria-label={`Nghe phát âm: ${card.word}`}
        >
          <span
            className="text-5xl font-bold text-ink"
            style={{ fontFamily: lang === "zh" ? "var(--font-body)" : "var(--font-display)" }}
          >
            {card.word}
          </span>
          <span className="text-rose-400 text-xl group-active:scale-110 transition-transform">
            🔊
          </span>
        </button>

        {card.pinyin && (
          <p className="text-2xl text-rose-500 font-semibold tracking-wide">{card.pinyin}</p>
        )}

        <p className="text-xl text-ink-soft font-medium">{card.word_vi}</p>
        {card.han_viet && (
          <p className="text-xs text-amber-700 font-semibold">
            Hán Việt: <span className="uppercase tracking-wide">{card.han_viet}</span>
          </p>
        )}
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
          onClick={() => speak(card.example)}
          className="text-left w-full"
          aria-label={`Nghe ví dụ: ${card.example}`}
        >
          <p
            className={`text-base text-ink leading-relaxed flex items-start gap-2 ${lang === "zh" ? "" : "italic"}`}
            style={{ fontFamily: "var(--font-body)" }}
          >
            <span className="text-rose-400 not-italic shrink-0">🔊</span>
            &ldquo;{card.example}&rdquo;
          </p>
          {card.example_pinyin && (
            <p className="text-sm text-rose-500 leading-relaxed pl-6">{card.example_pinyin}</p>
          )}
        </button>
        <p className="text-sm text-ink-soft leading-relaxed pl-6">
          &ldquo;{card.example_vi}&rdquo;
        </p>
      </motion.div>
    </div>
  );
}

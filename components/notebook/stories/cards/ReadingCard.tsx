"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { TappableText } from "@/components/notebook/TappableText";
import type { GlossaryEntry, LessonReadingCard } from "@/lib/notebook/lesson";
import type { LessonLang } from "@/types/notebook";

interface ReadingCardProps {
  card: LessonReadingCard;
  lang: LessonLang;
  glossary: Record<string, GlossaryEntry>;
  sourcePageId?: string;
  sourcePageTopic?: string;
  sourcePageTitleVi?: string;
}

export function ReadingCard({ card, lang, glossary, sourcePageId, sourcePageTopic, sourcePageTitleVi }: ReadingCardProps) {
  // Track which sentence's VI translation is shown
  const [revealedSentence, setRevealedSentence] = useState<number | null>(null);
  // Pinyin is on by default — Heo is a beginner in Chinese
  const [showPinyin, setShowPinyin] = useState(true);
  const hasPinyin = card.sentences.some((s) => s.pinyin);

  return (
    <div className="flex flex-col h-full px-7 py-8 gap-6">
      {/* Header */}
      {(card.title_vi || hasPinyin) && (
        <div className="flex items-start justify-between gap-3">
          {card.title_vi ? (
            <motion.h2
              className="text-xl font-bold text-ink"
              style={{ fontFamily: "var(--font-handwritten)", fontSize: 24 }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {card.title_vi}
            </motion.h2>
          ) : <span />}
          {hasPinyin && (
            <button
              type="button"
              data-no-nav="true"
              onClick={() => setShowPinyin((v) => !v)}
              className="shrink-0 mt-1 px-3 py-1 rounded-full text-xs font-semibold text-rose-500 border border-rose-200 bg-white"
            >
              {showPinyin ? "Ẩn pinyin" : "Hiện pinyin"}
            </button>
          )}
        </div>
      )}

      {/* Sentences */}
      <div className="flex-1 flex flex-col justify-center gap-5">
        {card.sentences.map((sentence, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            {/* Target language — tappable */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "rgba(255,249,245,0.9)",
                border: "1px solid rgba(255,201,213,0.4)",
              }}
            >
              {/* div, not p: TappableText renders its bubble (a div) inline */}
              <div className={`${lang === "zh" ? "text-xl" : "text-base"} text-ink leading-relaxed`}>
                <TappableText
                  text={sentence.text}
                  lang={lang}
                  glossary={glossary}
                  highlights={card.vocab_highlights}
                  wordClassName={lang === "zh" ? "text-xl" : "text-base"}
                  sourcePageId={sourcePageId}
                  sourcePageTopic={sourcePageTopic}
                  sourcePageTitleVi={sourcePageTitleVi}
                />
              </div>

              {showPinyin && sentence.pinyin && (
                <p className="mt-1 text-sm text-rose-500 leading-relaxed">{sentence.pinyin}</p>
              )}

              {/* Show VI toggle */}
              <button
                type="button"
                data-no-nav="true"
                onClick={() =>
                  setRevealedSentence((prev) => (prev === i ? null : i))
                }
                className="mt-2 text-xs text-rose-400 font-medium hover:text-rose-500 transition-colors"
              >
                {revealedSentence === i ? "Ẩn bản dịch" : "Xem tiếng Việt"}
              </button>

              {/* VI translation */}
              {revealedSentence === i && (
                <motion.p
                  className="mt-2 text-sm text-ink-soft italic"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  {sentence.vi}
                </motion.p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hint */}
      <motion.p
        className="text-xs text-rose-300 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Chạm từ để nghe • nhấn 📚 để lưu vào sổ
      </motion.p>
    </div>
  );
}

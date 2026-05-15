"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { TappableText } from "@/components/notebook/TappableText";
import type { ReadingCard as ReadingCardType } from "@/types/notebook";

interface ReadingCardProps {
  card: ReadingCardType;
  viMap: Record<string, string>;
}

export function ReadingCard({ card, viMap }: ReadingCardProps) {
  // Track which sentence's VI translation is shown
  const [revealedSentence, setRevealedSentence] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full px-7 py-8 gap-6">
      {/* Header */}
      {card.title_vi && (
        <motion.h2
          className="text-xl font-bold text-ink"
          style={{ fontFamily: "var(--font-handwritten)", fontSize: 24 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {card.title_vi}
        </motion.h2>
      )}

      {/* Sentences */}
      <div className="flex-1 flex flex-col justify-center gap-5">
        {card.sentences_en.map((sentEN, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            {/* English — tappable */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: "rgba(255,249,245,0.9)",
                border: "1px solid rgba(255,201,213,0.4)",
              }}
            >
              <p className="text-base text-ink leading-relaxed">
                <TappableText
                  text={sentEN}
                  viMap={viMap}
                  highlights={card.vocab_highlights}
                  wordClassName="text-base"
                />
              </p>

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
                  {card.sentences_vi[i]}
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
        Chạm vào từ để nghe phát âm 🔊
      </motion.p>
    </div>
  );
}

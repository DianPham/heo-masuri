"use client";

/**
 * SpotImposter — tap the one word that doesn't belong in the sentence.
 */
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { SpotImposterData } from "@/types/notebook";

interface Props {
  data: SpotImposterData;
  onContinue: () => void;
}

export function SpotImposter({ data, onContinue }: Props) {
  const { sentence_en, imposter_word, correct_word, hint_vi } = data;
  const words = sentence_en.split(/\s+/);

  const [picked, setPicked] = useState<number | null>(null);

  const isCorrect =
    picked !== null &&
    words[picked].replace(/[^a-zA-Z]/g, "").toLowerCase() ===
      imposter_word.replace(/[^a-zA-Z]/g, "").toLowerCase();

  function tap(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Hint */}
      <div
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: "rgba(255,201,213,0.18)", border: "1px solid rgba(255,201,213,0.35)" }}
      >
        <p className="text-xs text-rose-400 font-semibold mb-0.5">Gợi ý</p>
        <p className="text-sm text-ink">{hint_vi}</p>
      </div>

      {/* Instruction */}
      <p className="text-sm font-semibold text-ink-soft text-center">
        Chạm vào từ <span className="text-rose-500">sai</span> trong câu này 👇
      </p>

      {/* Sentence chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {words.map((word, i) => {
          const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
          const isImposter = clean === imposter_word.replace(/[^a-zA-Z]/g, "").toLowerCase();
          const isPicked = picked === i;

          let bg = "white";
          let border = "1px solid rgba(255,201,213,0.5)";
          let textColor = "text-ink";

          if (isPicked && isImposter) {
            bg = "rgba(156,175,136,0.25)";
            border = "2px solid #9CAF88";
            textColor = "text-green-700";
          } else if (isPicked && !isImposter) {
            bg = "rgba(233,122,149,0.2)";
            border = "2px solid #E97A95";
            textColor = "text-rose-700";
          } else if (picked !== null && isImposter) {
            // Reveal the real imposter if wrong pick
            bg = "rgba(156,175,136,0.18)";
            border = "2px dashed #9CAF88";
            textColor = "text-green-700";
          }

          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => tap(i)}
              whileTap={{ scale: picked === null ? 0.92 : 1 }}
              className={`px-4 py-2 rounded-full text-base font-semibold transition-colors ${textColor}`}
              style={{ backgroundColor: bg, border, boxShadow: "0 2px 6px rgba(58,33,41,0.08)" }}
            >
              {word}
            </motion.button>
          );
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {picked !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: isCorrect ? "rgba(156,175,136,0.15)" : "rgba(233,122,149,0.1)",
              border: `1px solid ${isCorrect ? "rgba(156,175,136,0.4)" : "rgba(233,122,149,0.3)"}`,
            }}
          >
            {isCorrect ? (
              <p className="text-sm font-bold text-green-700 text-center">
                Chính xác! &ldquo;{imposter_word}&rdquo; nên là &ldquo;{correct_word}&rdquo; 🌸
              </p>
            ) : (
              <p className="text-sm text-rose-700 text-center">
                Từ sai là <span className="font-bold">&ldquo;{imposter_word}&rdquo;</span>
                {" "}→ đúng là <span className="font-bold">&ldquo;{correct_word}&rdquo;</span>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue */}
      <div className="mt-auto">
        <AnimatePresence>
          {picked !== null && (
            <motion.button
              type="button"
              onClick={onContinue}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
            >
              Tiếp tục {isCorrect ? "🌸" : "💪"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

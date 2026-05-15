"use client";

/**
 * WordTrain — tap shuffled chips to rebuild the correct sentence.
 * No scoring. Shows correct answer on wrong; encourages retry or continue.
 */
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { WordTrainData } from "@/types/notebook";

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

interface Props {
  data: WordTrainData;
  onContinue: () => void;
}

export function WordTrain({ data, onContinue }: Props) {
  const { target_sentence_en, shuffled_words, hint_vi } = data;

  // Track by index so duplicate words work correctly
  const [answer, setAnswer] = useState<number[]>([]);
  const [phase, setPhase] = useState<"input" | "correct" | "wrong">("input");

  const bankIndices = shuffled_words
    .map((_, i) => i)
    .filter((i) => !answer.includes(i));

  function tapBank(idx: number) {
    if (phase !== "input") return;
    setAnswer((prev) => [...prev, idx]);
  }

  function tapAnswer(pos: number) {
    if (phase !== "input") return;
    setAnswer((prev) => prev.filter((_, i) => i !== pos));
  }

  function check() {
    const built = answer.map((i) => shuffled_words[i]).join(" ");
    if (normalize(built) === normalize(target_sentence_en)) {
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  function retry() {
    setAnswer([]);
    setPhase("input");
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

      {/* Answer zone */}
      <div>
        <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
          Câu của Heo
        </p>
        <div
          className="min-h-[56px] rounded-2xl p-3 flex flex-wrap gap-2"
          style={{
            border: `2px dashed ${phase === "correct" ? "#9CAF88" : phase === "wrong" ? "#E97A95" : "rgba(255,201,213,0.6)"}`,
            backgroundColor: phase === "correct"
              ? "rgba(156,175,136,0.12)"
              : phase === "wrong"
              ? "rgba(233,122,149,0.08)"
              : "white",
          }}
        >
          {answer.map((wordIdx, pos) => (
            <motion.button
              key={`a-${pos}`}
              type="button"
              layout
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => tapAnswer(pos)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-ink active:scale-95 transition-transform"
              style={{ backgroundColor: "rgba(255,201,213,0.35)" }}
            >
              {shuffled_words[wordIdx]}
            </motion.button>
          ))}
          {answer.length === 0 && (
            <p className="text-xs text-rose-300 self-center px-1">
              Chọn từ bên dưới...
            </p>
          )}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {phase === "correct" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3 text-center"
            style={{ backgroundColor: "rgba(156,175,136,0.2)", border: "1px solid rgba(156,175,136,0.4)" }}
          >
            <p className="text-sm font-bold text-green-700">Đúng rồi! Heo giỏi ghê 🌸</p>
          </motion.div>
        )}
        {phase === "wrong" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3"
            style={{ backgroundColor: "rgba(233,122,149,0.12)", border: "1px solid rgba(233,122,149,0.3)" }}
          >
            <p className="text-xs text-rose-400 font-semibold mb-1">Câu đúng là:</p>
            <p className="text-sm font-semibold text-ink italic">&ldquo;{target_sentence_en}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word bank */}
      {phase === "input" && (
        <div>
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
            Kho từ
          </p>
          <div className="flex flex-wrap gap-2">
            {bankIndices.map((idx) => (
              <motion.button
                key={`b-${idx}`}
                type="button"
                layout
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => tapBank(idx)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-ink bg-white active:scale-95 transition-transform"
                style={{ boxShadow: "0 2px 8px rgba(58,33,41,0.1)", border: "1px solid rgba(255,201,213,0.5)" }}
              >
                {shuffled_words[idx]}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto flex gap-3">
        {phase === "input" && (
          <button
            type="button"
            onClick={check}
            disabled={answer.length === 0}
            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Kiểm tra ✓
          </button>
        )}
        {phase === "wrong" && (
          <>
            <button
              type="button"
              onClick={retry}
              className="flex-1 py-3 rounded-2xl border border-rose-300 text-rose-500 text-sm font-semibold active:scale-95 transition-transform"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
            >
              Tiếp tục
            </button>
          </>
        )}
        {phase === "correct" && (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Tiếp tục 🌸
          </button>
        )}
      </div>
    </div>
  );
}

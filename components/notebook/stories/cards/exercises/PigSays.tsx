"use client";

/**
 * PigSays — Pig says something in Vietnamese; Heo types the English.
 * Lenient check: ignores punctuation and capitalisation.
 */
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { PigSaysData } from "@/types/notebook";

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

interface Props {
  data: PigSaysData;
  onContinue: () => void;
}

export function PigSays({ data, onContinue }: Props) {
  const { prompt_vi, target_en, hints } = data;
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"input" | "correct" | "wrong">("input");
  const [showHints, setShowHints] = useState(false);

  function check() {
    if (normalize(answer) === normalize(target_en)) {
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  const hintList = [hints.verb, hints.noun].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Speech bubble */}
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 36, lineHeight: 1 }}>🐷</span>
        <div
          className="flex-1 rounded-2xl rounded-tl-sm px-4 py-3 relative"
          style={{ backgroundColor: "rgba(255,201,213,0.25)", border: "1px solid rgba(255,201,213,0.5)" }}
        >
          <p className="text-sm font-semibold text-rose-500 mb-0.5">Pig nói:</p>
          <p className="text-base text-ink font-medium">&ldquo;{prompt_vi}&rdquo;</p>
        </div>
      </div>

      <p className="text-sm text-ink-soft text-center">
        Heo dịch sang tiếng Anh nha 💬
      </p>

      {/* Hints toggle */}
      {hintList.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHints((v) => !v)}
            className="text-xs text-rose-400 font-medium underline underline-offset-2"
          >
            {showHints ? "Ẩn gợi ý" : "Xem gợi ý 💡"}
          </button>
          <AnimatePresence>
            {showHints && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-2">
                  {hintList.map((h) => (
                    <span
                      key={h}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-rose-600"
                      style={{ backgroundColor: "rgba(255,201,213,0.3)" }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Input */}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={phase !== "input"}
        placeholder="Gõ câu tiếng Anh ở đây..."
        rows={3}
        className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 resize-none"
        style={{ fontFamily: "var(--font-body)" }}
      />

      {/* Feedback */}
      <AnimatePresence>
        {phase !== "input" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: phase === "correct" ? "rgba(156,175,136,0.15)" : "rgba(233,122,149,0.1)",
              border: `1px solid ${phase === "correct" ? "rgba(156,175,136,0.4)" : "rgba(233,122,149,0.3)"}`,
            }}
          >
            {phase === "correct" ? (
              <p className="text-sm font-bold text-green-700 text-center">
                Chính xác! Heo dịch giỏi lắm 🌸
              </p>
            ) : (
              <>
                <p className="text-xs text-rose-400 font-semibold mb-1">Một cách dịch đúng:</p>
                <p className="text-sm text-ink italic">&ldquo;{target_en}&rdquo;</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="mt-auto flex gap-3">
        {phase === "input" && (
          <button
            type="button"
            onClick={check}
            disabled={!answer.trim()}
            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Kiểm tra ✓
          </button>
        )}
        {phase !== "input" && (
          <button
            type="button"
            onClick={onContinue}
            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Tiếp tục {phase === "correct" ? "🌸" : "💪"}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * SentenceRemix — given a base sentence and an instruction, write a new version.
 * Hint word chips help. Lenient answer checking (Chinese: hanzi or pinyin).
 */
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { answerMatches, appendChip, type LessonSentenceRemix } from "@/lib/notebook/lesson";
import type { LessonLang } from "@/types/notebook";

interface Props {
  data: LessonSentenceRemix;
  lang: LessonLang;
  onContinue: () => void;
}

export function SentenceRemix({ data, lang, onContinue }: Props) {
  const { base, base_pinyin, base_vi, instruction_vi, target, target_pinyin, hint_words } = data;
  const [answer, setAnswer] = useState("");
  const [phase, setPhase] = useState<"input" | "correct" | "wrong">("input");

  function insertWord(w: string) {
    setAnswer((prev) => appendChip(prev, w, lang));
  }

  function check() {
    if (answerMatches(answer, target, lang, target_pinyin)) {
      setPhase("correct");
    } else {
      setPhase("wrong");
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Base sentence */}
      <div
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: "rgba(255,201,213,0.15)", border: "1px solid rgba(255,201,213,0.35)" }}
      >
        <p className="text-xs text-rose-400 font-semibold mb-1">Câu gốc</p>
        <p className="text-base font-semibold text-ink">&ldquo;{base}&rdquo;</p>
        {base_pinyin && <p className="text-xs text-rose-500 mt-0.5">{base_pinyin}</p>}
        <p className="text-xs text-ink-soft mt-0.5 italic">{base_vi}</p>
      </div>

      {/* Instruction */}
      <div
        className="rounded-2xl px-4 py-3 flex items-start gap-2"
        style={{ backgroundColor: "rgba(255,234,178,0.3)", border: "1px solid rgba(255,234,178,0.6)" }}
      >
        <span style={{ fontSize: 18 }}>✏️</span>
        <p className="text-sm font-semibold text-amber-800">{instruction_vi}</p>
      </div>

      {/* Hint chips */}
      {hint_words.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
            Từ gợi ý
          </p>
          <div className="flex flex-wrap gap-2">
            {hint_words.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => insertWord(w)}
                disabled={phase !== "input"}
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-ink bg-white active:scale-95 transition-transform disabled:opacity-50"
                style={{ boxShadow: "0 2px 6px rgba(58,33,41,0.1)", border: "1px solid rgba(255,201,213,0.5)" }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={phase !== "input"}
        placeholder={lang === "zh" ? "Viết câu mới (chữ Hán hay pinyin)..." : "Viết câu mới ở đây..."}
        rows={2}
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
                Chính xác! Heo remix giỏi lắm 🌸
              </p>
            ) : (
              <>
                <p className="text-xs text-rose-400 font-semibold mb-1">Câu đúng là:</p>
                <p className="text-sm text-ink italic">&ldquo;{target}&rdquo;</p>
                {target_pinyin && <p className="text-xs text-rose-500 mt-0.5">{target_pinyin}</p>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="mt-auto flex gap-3">
        {phase === "input" ? (
          <button
            type="button"
            onClick={check}
            disabled={!answer.trim()}
            className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Kiểm tra ✓
          </button>
        ) : (
          <>
            {phase === "wrong" && (
              <button
                type="button"
                onClick={() => { setAnswer(""); setPhase("input"); }}
                className="flex-1 py-3 rounded-2xl border border-rose-300 text-rose-500 text-sm font-semibold active:scale-95 transition-transform"
              >
                Thử lại
              </button>
            )}
            <button
              type="button"
              onClick={onContinue}
              className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
            >
              Tiếp tục {phase === "correct" ? "🌸" : "💪"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

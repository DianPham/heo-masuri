"use client";

/**
 * TwoTruths — write two true things and one lie about yourself.
 * Creative exercise, no right/wrong. Starter word chips help.
 * Submitting shows the 3 items shuffled for Masuri to guess.
 */
import { motion } from "motion/react";
import { useState, useMemo } from "react";
import type { TwoTruthsData } from "@/types/notebook";

interface Props {
  data: TwoTruthsData;
  onContinue: () => void;
}

export function TwoTruths({ data, onContinue }: Props) {
  const { prompt_vi, starter_words } = data;

  const [truth1, setTruth1] = useState("");
  const [truth2, setTruth2] = useState("");
  const [lie, setLie] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [activeField, setActiveField] = useState<"t1" | "t2" | "lie" | null>(null);

  // Shuffle once on submit
  const shuffled = useMemo(() => {
    if (!submitted) return [];
    const items = [
      { text: truth1, isLie: false },
      { text: truth2, isLie: false },
      { text: lie, isLie: true },
    ];
    return [...items].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  function insertWord(w: string) {
    const setter =
      activeField === "t1" ? setTruth1 :
      activeField === "t2" ? setTruth2 :
      activeField === "lie" ? setLie : null;
    if (!setter) return;
    setter((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${w}` : w;
    });
  }

  const canSubmit = truth1.trim() && truth2.trim() && lie.trim();

  if (submitted) {
    return (
      <div className="flex flex-col gap-5 h-full">
        <p className="text-sm font-semibold text-ink-soft text-center">
          {revealed ? "Đây là đáp án 🎉" : "Masuri phải đoán câu nào là bịa 🕵️"}
        </p>

        <div className="flex flex-col gap-3">
          {shuffled.map((item, i) => {
            const isLieAndRevealed = revealed && item.isLie;
            const isTruthAndRevealed = revealed && !item.isLie;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: isLieAndRevealed
                    ? "rgba(251,191,36,0.22)"
                    : isTruthAndRevealed
                    ? "rgba(110,231,183,0.22)"
                    : "rgba(255,201,213,0.18)",
                  border: `1px solid ${isLieAndRevealed ? "rgba(251,191,36,0.5)" : isTruthAndRevealed ? "rgba(110,231,183,0.5)" : "rgba(255,201,213,0.4)"}`,
                }}
              >
                <p className="text-sm font-medium text-ink flex items-center gap-2">
                  <span className="text-rose-400 font-bold">{i + 1}.</span>
                  <span className="flex-1">{item.text}</span>
                  {isLieAndRevealed && <span>🤥</span>}
                  {isTruthAndRevealed && <span>✅</span>}
                </p>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-ink-soft text-center italic">
          {revealed ? "Câu vàng là câu bịa nha! 🤥" : "Đã gửi cho Masuri đoán 💕"}
        </p>

        <div className="mt-auto flex flex-col gap-2">
          {!revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full py-3 rounded-2xl text-rose-500 border-2 border-rose-300 text-sm font-semibold active:scale-95 transition-transform"
            >
              Tiết lộ đáp án 🤫
            </button>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
          >
            Tiếp tục 🌸
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Prompt */}
      <div
        className="rounded-2xl px-4 py-3"
        style={{ backgroundColor: "rgba(255,201,213,0.18)", border: "1px solid rgba(255,201,213,0.35)" }}
      >
        <p className="text-sm text-ink">{prompt_vi}</p>
      </div>

      {/* Starter chips */}
      {starter_words.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {starter_words.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => insertWord(w)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold text-ink bg-white active:scale-95 transition-transform"
              style={{ boxShadow: "0 2px 6px rgba(58,33,41,0.1)", border: "1px solid rgba(255,201,213,0.5)" }}
            >
              {w}
            </button>
          ))}
        </div>
      )}

      {/* Inputs */}
      {([
        { id: "t1" as const, label: "✅ Sự thật 1", value: truth1, set: setTruth1 },
        { id: "t2" as const, label: "✅ Sự thật 2", value: truth2, set: setTruth2 },
        { id: "lie" as const, label: "❌ Điều bịa",  value: lie,    set: setLie },
      ]).map(({ id, label, value, set }) => (
        <div key={id}>
          <p className="text-xs font-semibold text-rose-400 mb-1">{label}</p>
          <input
            type="text"
            value={value}
            onChange={(e) => set(e.target.value)}
            onFocus={() => setActiveField(id)}
            onBlur={() => setActiveField(null)}
            placeholder="Viết tiếng Anh..."
            className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      ))}

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={!canSubmit}
          className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
        >
          Gửi cho Masuri đoán 💕
        </button>
      </div>
    </div>
  );
}

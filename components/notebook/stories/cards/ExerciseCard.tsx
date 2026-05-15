"use client";

/**
 * ExerciseCard — placeholder shell for CP3.
 * Full exercise implementations (word_train, spot_imposter, etc.) built in CP5.
 * This render makes the renderer complete for CP3 review without crashing on exercise cards.
 */
import { motion } from "motion/react";
import { Pig } from "@/components/theme/Pig";
import type { ExerciseCard as ExerciseCardType } from "@/types/notebook";

const EXERCISE_LABELS: Record<string, string> = {
  word_train: "Xếp câu đúng thứ tự",
  spot_imposter: "Tìm từ sai",
  pig_says: "Pig nói gì?",
  caption_polaroid: "Viết chú thích ảnh",
  sentence_remix: "Chỉnh lại câu",
  two_truths: "Hai sự thật",
};

interface ExerciseCardProps {
  card: ExerciseCardType;
  onSkip: () => void;
  onTooHard: () => void;
}

export function ExerciseCard({ card, onSkip, onTooHard }: ExerciseCardProps) {
  const label = EXERCISE_LABELS[card.exercise_type] ?? card.exercise_type;

  // ── Word train preview (shows the data for CP3 review) ─────
  const data = card.data as Record<string, unknown>;

  return (
    <div className="flex flex-col h-full px-7 py-8">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-1">
          Luyện tập
        </p>
        <h2
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {label}
        </h2>
      </motion.div>

      {/* Exercise preview content */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Pig pose="thinking" size={96} animate />

        {/* Show hint/prompt from data */}
        {"hint_vi" in data && (
          <div
            className="rounded-2xl px-6 py-4 text-center"
            style={{ backgroundColor: "rgba(255,201,213,0.2)", border: "1px solid rgba(255,201,213,0.4)" }}
          >
            <p className="text-sm text-ink-soft mb-2">Gợi ý:</p>
            <p className="text-base font-semibold text-ink">
              {data.hint_vi as string}
            </p>
          </div>
        )}
        {"prompt_vi" in data && (
          <div
            className="rounded-2xl px-6 py-4 text-center"
            style={{ backgroundColor: "rgba(255,201,213,0.2)", border: "1px solid rgba(255,201,213,0.4)" }}
          >
            <p className="text-base font-semibold text-ink">
              {data.prompt_vi as string}
            </p>
          </div>
        )}

        {/* CP5 coming soon chip */}
        <div
          className="px-4 py-2 rounded-full text-xs font-semibold text-rose-400"
          style={{ backgroundColor: "rgba(255,201,213,0.25)", border: "1px dashed rgba(209,77,111,0.3)" }}
        >
          Bài tập đầy đủ sẽ có trong bản cập nhật tiếp theo 🌸
        </div>
      </motion.div>

      {/* Skip + Too hard buttons */}
      <motion.div
        className="flex items-center justify-between pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button
          type="button"
          data-no-nav="true"
          onClick={onTooHard}
          className="text-xs text-rose-300 font-medium py-2 px-3 rounded-xl active:bg-rose-50"
        >
          Khó quá 😣
        </button>
        {card.can_skip && (
          <button
            type="button"
            data-no-nav="true"
            onClick={onSkip}
            className="text-xs text-rose-300 font-medium py-2 px-3 rounded-xl active:bg-rose-50"
          >
            Bỏ qua câu này
          </button>
        )}
      </motion.div>
    </div>
  );
}

"use client";

/**
 * CaptionPolaroid — write a creative English caption for an emoji scene.
 * No right/wrong answer — purely creative. Starter word chips help.
 */
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { CaptionPolaroidData } from "@/types/notebook";

interface Props {
  data: CaptionPolaroidData;
  onContinue: () => void;
}

export function CaptionPolaroid({ data, onContinue }: Props) {
  const { image_emoji, starter_words, example_en } = data;
  const [caption, setCaption] = useState("");
  const [shared, setShared] = useState(false);

  function insertWord(w: string) {
    setCaption((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${w}` : w;
    });
  }

  function handleShare() {
    if (!caption.trim()) return;
    setShared(true);
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Polaroid */}
      <div className="flex justify-center">
        <div
          className="relative bg-white rounded-lg px-4 pt-4 pb-8 shadow-md"
          style={{ width: 160, transform: "rotate(-1.5deg)", boxShadow: "0 6px 20px rgba(58,33,41,0.18)" }}
        >
          <div
            className="w-full aspect-square rounded flex items-center justify-center text-6xl"
            style={{ backgroundColor: "rgba(255,249,245,0.8)" }}
          >
            {image_emoji}
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 h-7 rounded-b-lg"
            style={{ backgroundColor: "rgba(255,201,213,0.15)" }}
          />
        </div>
      </div>

      {!shared ? (
        <>
          {/* Starter chips */}
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
              Từ gợi ý
            </p>
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
          </div>

          {/* Caption input */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Viết chú thích tiếng Anh..."
            rows={3}
            className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 resize-none"
            style={{ fontFamily: "var(--font-body)" }}
          />

          {/* Example */}
          <p className="text-xs text-ink-soft text-center italic">
            Ví dụ: &ldquo;{example_en}&rdquo;
          </p>

          <div className="mt-auto">
            <button
              type="button"
              onClick={handleShare}
              disabled={!caption.trim()}
              className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
            >
              Chia sẻ chú thích 🌸
            </button>
          </div>
        </>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Shown caption */}
            <div
              className="w-full rounded-2xl px-5 py-4 text-center"
              style={{
                backgroundColor: "rgba(255,201,213,0.2)",
                border: "1px solid rgba(255,201,213,0.5)",
                fontFamily: "var(--font-handwritten)",
              }}
            >
              <p className="text-lg text-ink">&ldquo;{caption.trim()}&rdquo;</p>
            </div>

            <p className="text-sm text-ink-soft text-center">
              Hay quá! Heo viết tiếng Anh giỏi ghê 💕
            </p>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
            >
              Tiếp tục 🌸
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

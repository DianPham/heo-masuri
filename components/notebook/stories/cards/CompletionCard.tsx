"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import type { CompletionCard as CompletionCardType } from "@/types/notebook";

interface CompletionCardProps {
  card: CompletionCardType;
  pageTitle: string;
}

interface StreakResult {
  current_streak: number;
  longest_streak: number;
  already_counted: boolean;
}

export function CompletionCard({ card, pageTitle }: CompletionCardProps) {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakResult | null>(null);

  // Bump streak once when this card mounts
  useEffect(() => {
    fetch("/api/notebook/streak/bump", { method: "POST" })
      .then((r) => r.json())
      .then((data: StreakResult) => setStreak(data))
      .catch(() => {});
  }, []);

  const streakDay = streak?.current_streak ?? 0;
  const isNewRecord =
    streak && !streak.already_counted && streak.current_streak === streak.longest_streak && streak.current_streak > 1;

  return (
    <div className="flex flex-col items-center justify-between h-full px-7 py-10">
      {/* Sparkle pig */}
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
      >
        <Pig pose="cheering" size={110} animate />
        <motion.h1
          className="text-3xl font-bold text-ink text-center"
          style={{ fontFamily: "var(--font-handwritten)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Heo giỏi quá! 🌸
        </motion.h1>
        <motion.p
          className="text-sm text-ink-soft text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          {pageTitle} — xong rồi nè
        </motion.p>
      </motion.div>

      {/* Middle section: streak + sticker + vocab */}
      <motion.div
        className="flex flex-col items-center gap-4 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        {/* Streak badge */}
        {streakDay > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 300, damping: 18 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
              boxShadow: "0 4px 12px rgba(209,77,111,0.25)",
            }}
          >
            <span style={{ fontSize: 20 }}>🔥</span>
            <p className="text-base font-bold text-ink">
              {streakDay} ngày liên tiếp!
            </p>
            {isNewRecord && (
              <span className="text-xs font-semibold text-rose-600 bg-white/60 px-2 py-0.5 rounded-full">
                Kỷ lục mới ✨
              </span>
            )}
          </motion.div>
        )}

        {/* Sticker earned */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ rotate: -15, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 18 }}
          >
            <Sticker type={card.sticker_kind} size={52} />
          </motion.div>
          <p className="text-xs text-rose-400 font-semibold">Sticker mới 🎉</p>
        </div>

        {/* Vocab saved */}
        {card.vocab_to_save.length > 0 && (
          <div
            className="w-full rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(255,201,213,0.2)",
              border: "1px solid rgba(255,201,213,0.4)",
            }}
          >
            <p className="text-xs font-semibold text-rose-500 mb-2 text-center">
              Đã lưu {card.vocab_to_save.length} từ mới vào sổ
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {card.vocab_to_save.map((word) => (
                <span
                  key={word}
                  className="px-3 py-1 rounded-full text-sm font-semibold text-ink"
                  style={{ backgroundColor: "rgba(255,201,213,0.4)" }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <button
          type="button"
          data-no-nav="true"
          onClick={() => router.push("/heo/notebook/vocab")}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-rose-500"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
        >
          Mở sổ từ vựng 📖
        </button>
        <button
          type="button"
          data-no-nav="true"
          onClick={() => router.push("/heo/notebook")}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-rose-500 border border-rose-200"
        >
          Quay lại trang chủ sổ
        </button>
      </motion.div>
    </div>
  );
}

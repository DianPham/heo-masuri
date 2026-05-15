"use client";

import { motion } from "motion/react";
import { Pig } from "@/components/theme/Pig";
import type { IntroCard as IntroCardType } from "@/types/notebook";

export function IntroCard({ card }: { card: IntroCardType }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-8">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 22 }}
      >
        <Pig pose={card.pig_pose} size={120} animate />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="space-y-3"
      >
        <h1
          className="text-3xl font-bold text-ink leading-snug"
          style={{ fontFamily: "var(--font-handwritten)", fontSize: 32 }}
        >
          {card.title_vi}
        </h1>
        {card.subtitle_vi && (
          <p className="text-base text-ink-soft">{card.subtitle_vi}</p>
        )}
      </motion.div>

      {/* Tap hint */}
      <motion.p
        className="text-xs text-rose-300 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        Chạm bên phải để tiếp tục →
      </motion.p>
    </div>
  );
}

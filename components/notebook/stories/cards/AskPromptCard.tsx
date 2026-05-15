"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Pig } from "@/components/theme/Pig";
import { AskMasuriSheet } from "@/components/notebook/AskMasuriSheet";
import type { AskPromptCard as AskPromptCardType } from "@/types/notebook";

export function AskPromptCard({ card }: { card: AskPromptCardType }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-7">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
        >
          <Pig pose="thinking" size={100} animate />
        </motion.div>

        <motion.p
          className="text-xl font-bold text-ink leading-snug"
          style={{ fontFamily: "var(--font-handwritten)", fontSize: 22 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {card.suggestion_vi}
        </motion.p>

        <motion.div
          className="flex flex-col gap-3 w-full max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            type="button"
            data-no-nav="true"
            onClick={() => setSheetOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-rose-500 text-white text-sm font-semibold"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
          >
            Hỏi Masuri 💕
          </button>
          <p className="text-xs text-rose-300">
            Chạm bên phải để tiếp tục mà không cần hỏi
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <AskMasuriSheet word="" onClose={() => setSheetOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

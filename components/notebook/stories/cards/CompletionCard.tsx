"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { InfoTip } from "@/components/notebook/InfoTip";
import type { CompletionCard as CompletionCardType, WordCard } from "@/types/notebook";

interface CompletionCardProps {
  card: CompletionCardType;
  pageTitle: string;
  pageId: string;
  wordCards: WordCard[];          // word cards from the same page — used to look up translations
  onReview: () => void;           // navigate back to card 0 (re-read mode)
  isReview?: boolean;             // true when in scrapbook re-read — skip streak bump + vocab save
}

interface StreakResult {
  current_streak: number;
  longest_streak: number;
  already_counted: boolean;
}

export function CompletionCard({ card, pageTitle, pageId, wordCards, onReview, isReview = false }: CompletionCardProps) {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const vocabSaved = useRef(false);

  // On mount: mark page complete + bump streak + auto-save vocab_to_save words to DB
  // Skip all three when in review (scrapbook re-read) mode.
  useEffect(() => {
    if (isReview) return;

    // Mark page as completed (sets completed_at — drives scrapbook + Masuri progress).
    // Uses keepalive so the request survives if Heo immediately taps a button to
    // navigate away (previously the fire-and-forget fetch was being cancelled
    // mid-flight and the lesson stayed unmarked). One retry on failure for the
    // case where the cookie hasn't propagated to the edge yet.
    async function markComplete() {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("/api/notebook/page/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ page_id: pageId }),
            keepalive: true,
          });
          if (res.ok) return;
          // 403 = cookie not set yet; brief wait + retry once.
          if (res.status === 403 && attempt === 0) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          const text = await res.text().catch(() => "");
          console.error("[CompletionCard] page/complete failed", res.status, text);
          return;
        } catch (err) {
          console.error("[CompletionCard] page/complete threw", err);
          if (attempt === 1) return;
        }
      }
    }
    markComplete();

    // Bump streak
    fetch("/api/notebook/streak/bump", { method: "POST" })
      .then((r) => r.json())
      .then((data: StreakResult) => setStreak(data))
      .catch(() => {});

    // Auto-save vocab — dedupe so double-mount doesn't duplicate
    if (vocabSaved.current || card.vocab_to_save.length === 0) return;
    vocabSaved.current = true;

    // Build word lookup map from page's word cards
    const wordMap = new Map<string, WordCard>();
    for (const wc of wordCards) {
      wordMap.set(wc.word_en.toLowerCase(), wc);
    }

    // Fire one POST per word (upsert — safe to replay)
    for (const wordEn of card.vocab_to_save) {
      const wc = wordMap.get(wordEn.toLowerCase());
      fetch("/api/notebook/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_en: wordEn,
          word_vi: wc?.word_vi ?? "",
          example_en: wc?.example_en ?? undefined,
          example_vi: wc?.example_vi ?? undefined,
          pos: wc?.pos ?? undefined,
          source_page_id: pageId,
          source_kind: "page",
        }),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {isReview ? "Xem lại xong rồi 🌸" : "Heo giỏi quá! 🌸"}
        </motion.h1>
        <motion.p
          className="text-sm text-ink-soft text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          {pageTitle} — {isReview ? "trang này Heo đã hoàn thành rồi" : "xong rồi nè"}
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

        {/* Vocab saved (now actually saved to DB) */}
        {card.vocab_to_save.length > 0 && (
          <div
            className="w-full rounded-2xl p-4"
            style={{
              backgroundColor: "rgba(255,201,213,0.2)",
              border: "1px solid rgba(255,201,213,0.4)",
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <p className="text-xs font-semibold text-rose-500">
                Đã lưu {card.vocab_to_save.length} từ mới vào sổ 📖
              </p>
              <InfoTip
                text="Những từ này đã tự động lưu vào sổ từ vựng của Heo. Heo có thể ôn tập chúng bất kỳ lúc nào trong mục 📖 Từ vựng."
                position="top"
              />
            </div>
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

      {/* Action buttons — blueprint §7: three buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {/* Blueprint §7: first button — review this page */}
        <button
          type="button"
          data-no-nav="true"
          onClick={onReview}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-rose-500 border-2 border-rose-300"
        >
          Xem lại trang này 📖
        </button>
        <button
          type="button"
          data-no-nav="true"
          onClick={() => { router.refresh(); router.push("/heo/notebook/vocab"); }}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-white bg-rose-500"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
        >
          Mở sổ từ vựng 📖
        </button>
        <button
          type="button"
          data-no-nav="true"
          onClick={() => { router.refresh(); router.push("/heo/notebook"); }}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-rose-200"
        >
          Quay lại trang chủ sổ
        </button>
      </motion.div>
    </div>
  );
}

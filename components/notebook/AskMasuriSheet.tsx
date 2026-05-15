"use client";

/**
 * AskMasuriSheet — bottom sheet opened when Heo long-presses a word.
 * CP3: shows UI only (no API call yet — wired fully in CP6).
 * The sheet is pre-filled with the long-pressed word.
 */
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

interface AskMasuriSheetProps {
  word: string;
  onClose: () => void;
  sourcePageId?: string;
}

export function AskMasuriSheet({ word, onClose, sourcePageId }: AskMasuriSheetProps) {
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/notebook/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_en: word,
          question_text: note.trim(),
          source_page_id: sourcePageId,
        }),
      });
      setSent(true);
      setTimeout(onClose, 1400);
    } catch {
      // Silent — still show sent UI for now
      setSent(true);
      setTimeout(onClose, 1400);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[60] bg-ink/30"
        data-no-nav="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-3xl px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        data-no-nav="true"
        style={{ boxShadow: "0 -8px 32px rgba(58,33,41,0.18)" }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Handle bar */}
        <div className="mx-auto w-10 h-1 bg-rose-200 rounded-full mb-5" />

        {/* Title */}
        <p className="text-sm font-semibold text-rose-500 mb-1">Hỏi Masuri</p>

        {/* The tapped word */}
        <p
          className="text-3xl font-bold text-ink mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {word}
        </p>

        {!sent ? (
          <>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Heo muốn hỏi gì? (không bắt buộc)"
              rows={3}
              className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 resize-none mb-4"
              style={{ fontFamily: "var(--font-body)" }}
            />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl border border-rose-200 text-sm font-semibold text-rose-400"
              >
                Hủy
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-60"
                style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
              >
                {sending ? "Đang gửi..." : "Gửi cho Masuri 💕"}
              </button>
            </div>
          </>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-2 py-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span style={{ fontSize: 32 }}>💕</span>
            <p className="text-sm font-semibold text-rose-500">Đã gửi cho Masuri</p>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

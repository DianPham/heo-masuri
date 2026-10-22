"use client";

/**
 * VocabWordSheet — action sheet for a long-pressed vocabulary word.
 * Actions: Ôn lại từ này (go to review) / Hỏi Masuri / Xóa từ sổ
 * Blueprint §10: "Long-press a card → bottom sheet"
 */
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VocabWord } from "@/types/notebook";
import { AskMasuriSheet } from "@/components/notebook/AskMasuriSheet";

interface VocabWordSheetProps {
  word: VocabWord;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function VocabWordSheet({ word, onClose, onDeleted }: VocabWordSheetProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/notebook/vocab/${word.id}/delete`, { method: "POST" });
      if (res.ok) {
        onDeleted(word.id);
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[70] bg-ink/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[71] bg-white rounded-t-3xl overflow-hidden"
        style={{ boxShadow: "0 -8px 32px rgba(58,33,41,0.18)" }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 bg-rose-200 rounded-full" />
        </div>

        {/* Word header */}
        <div className="px-6 pb-5 border-b border-rose-100">
          <p
            className="text-2xl font-bold text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {word.word_en}
          </p>
          <p className="text-sm text-ink-soft mt-0.5">{word.word_vi}</p>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <SheetAction
            icon="🃏"
            label="Ôn lại từ này"
            onClick={() => {
              onClose();
              router.push("/heo/notebook/vocab/review");
            }}
          />
          <SheetAction
            icon="💬"
            label="Hỏi Masuri"
            onClick={() => setShowAsk(true)}
          />
          <SheetAction
            icon={confirmDelete ? "⚠️" : "🗑️"}
            label={confirmDelete ? "Xác nhận xóa từ này?" : "Xóa từ sổ"}
            onClick={handleDelete}
            destructive
            loading={deleting}
          />
        </div>
      </motion.div>

      {/* Ask Masuri sheet (stacked above this one) */}
      <AnimatePresence>
        {showAsk && (
          <AskMasuriSheet
            word={word.word_en}
            sourcePageId={word.source_page_id}
            onClose={() => {
              setShowAsk(false);
              onClose();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
  destructive = false,
  loading = false,
  dimNote,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  loading?: boolean;
  dimNote?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`
        w-full flex items-center gap-4 px-4 py-4 rounded-2xl
        active:bg-rose-50 transition-colors text-left
        ${destructive ? "text-rose-600" : "text-ink"}
        ${loading ? "opacity-50" : ""}
      `}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {dimNote && (
        <span className="text-xs text-rose-300 font-medium">{dimNote}</span>
      )}
    </button>
  );
}

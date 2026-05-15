"use client";

/**
 * ApprovalUI — Masuri's 15-second page review UI.
 * Three actions: Duyệt / Sửa / Tạo lại.
 * Opened from a Discord link or push notification.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import type { Card } from "@/types/notebook";

interface DraftPage {
  id: string;
  title_vi: string;
  title_en: string;
  topic: string;
  difficulty: number;
  cards: Card[];
  scheduled_for: string;
  status: string;
  generated_by: string;
  generation_meta: Record<string, unknown> | null;
  created_at: string;
}

export function ApprovalUI({ page }: { page: DraftPage }) {
  const router = useRouter();
  const [mode, setMode] = useState<"review" | "edit" | "regenerate" | "done">("review");
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [titleVi, setTitleVi] = useState(page.title_vi);
  const [titleEn, setTitleEn] = useState(page.title_en);
  const [hint, setHint] = useState("");

  const alreadyApproved = page.status === "approved" || page.status === "published";
  const meta = page.generation_meta ?? {};
  const newVocab = Array.isArray(meta.new_vocab) ? (meta.new_vocab as string[]) : [];

  async function handleApprove(edits?: { title_vi?: string; title_en?: string }) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notebook/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: page.id, edits }),
      });
      if (res.ok) {
        setMode("done");
        setTimeout(() => router.push("/masuri/notebook"), 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegenerate() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notebook/admin/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: page.id, hint: hint.trim() || undefined }),
      });
      if (res.ok) {
        setMode("done");
        setTimeout(() => router.push("/masuri/notebook"), 2500);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const PAPER_BG: React.CSSProperties = {
    backgroundImage: "radial-gradient(circle, rgba(168,50,79,0.06) 1.2px, transparent 1.2px)",
    backgroundSize: "20px 20px",
    backgroundColor: "#FFF9F5",
  };

  if (mode === "done") {
    return (
      <div style={PAPER_BG} className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl"
        >
          {submitting ? "⏳" : "✅"}
        </motion.div>
        <p className="text-lg font-bold text-ink">
          {mode === "done" && !submitting ? "Xong rồi 💕" : "Đang xử lý..."}
        </p>
        <p className="text-sm text-ink-soft">Đang quay về trang sổ...</p>
      </div>
    );
  }

  return (
    <div style={PAPER_BG} className="min-h-dvh pb-32">
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-5 pt-10 pb-4"
        style={{ backgroundColor: "rgba(255,249,245,0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-0.5">
              {page.scheduled_for} · {page.topic} · Độ khó {page.difficulty}/3
            </p>
            <h1
              className="text-2xl font-bold text-ink leading-tight"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              {page.title_vi}
            </h1>
            <p className="text-sm text-ink-soft">{page.title_en}</p>
          </div>
          {alreadyApproved && (
            <span className="shrink-0 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              ✓ Đã duyệt
            </span>
          )}
        </div>

        {newVocab.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {newVocab.map((w) => (
              <span
                key={w}
                className="text-xs px-2 py-0.5 rounded-full font-medium text-rose-600"
                style={{ backgroundColor: "rgba(255,201,213,0.3)" }}
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Mode: Edit / Regenerate panels (above cards) ─────── */}
      <AnimatePresence>
        {mode === "edit" && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 mt-3 mb-1 rounded-2xl bg-white border border-rose-200 p-4 space-y-3"
            style={{ boxShadow: "0 2px 12px rgba(209,77,111,0.12)" }}
          >
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Sửa tiêu đề</p>
            <div>
              <label className="text-xs text-ink-soft mb-1 block">Tiêu đề VI</label>
              <input
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-ink outline-none focus:border-rose-400 bg-rose-50"
              />
            </div>
            <div>
              <label className="text-xs text-ink-soft mb-1 block">Tiêu đề EN</label>
              <input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-ink outline-none focus:border-rose-400 bg-rose-50"
              />
            </div>
          </motion.div>
        )}

        {mode === "regenerate" && (
          <motion.div
            key="regen"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 mt-3 mb-1 rounded-2xl bg-white border border-rose-200 p-4"
            style={{ boxShadow: "0 2px 12px rgba(209,77,111,0.12)" }}
          >
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">
              Gợi ý cho Routine (không bắt buộc)
            </p>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="VD: Heo hỏi về đồ ăn hôm qua — tập trung vào food nha"
              rows={3}
              className="w-full rounded-xl border border-rose-200 px-3 py-2.5 text-sm text-ink placeholder:text-rose-200 outline-none focus:border-rose-400 resize-none bg-rose-50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Card preview ────────────────────────────────────── */}
      <div className="px-5 space-y-3 mt-2">
        {page.cards.map((card, i) => (
          <CardPreview key={i} card={card} index={i} />
        ))}
      </div>

      {/* ── Action bar ──────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ backgroundColor: "rgba(255,249,245,0.95)", backdropFilter: "blur(8px)" }}
      >
        {mode === "review" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("regenerate")}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-rose-200 active:scale-95 transition-transform"
            >
              🔄 Tạo lại
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-rose-500 border-2 border-rose-300 active:scale-95 transition-transform"
            >
              ✏️ Sửa
            </button>
            <button
              type="button"
              onClick={() => handleApprove()}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 disabled:opacity-50 active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
            >
              {submitting ? "..." : "✓ Duyệt"}
            </button>
          </div>
        )}

        {mode === "edit" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("review")}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-rose-200 active:scale-95 transition-transform"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => handleApprove({ title_vi: titleVi, title_en: titleEn })}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 disabled:opacity-50 active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
            >
              {submitting ? "..." : "✓ Lưu & Duyệt"}
            </button>
          </div>
        )}

        {mode === "regenerate" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("review")}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-rose-400 border border-rose-200 active:scale-95 transition-transform"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 disabled:opacity-50 active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
            >
              {submitting ? "..." : "🔄 Tạo lại"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card preview component ────────────────────────────────────
function CardPreview({ card, index }: { card: Card; index: number }) {
  const bg: Record<string, string> = {
    intro: "#FFE4EA",
    word: "#FFF9F5",
    reading: "#F0F7F1",
    exercise: "#FAF1EA",
    ask_prompt: "#EDE8F5",
    completion: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
  };

  const label: Record<string, string> = {
    intro: "Giới thiệu",
    word: "Từ vựng",
    reading: "Đọc hiểu",
    exercise: "Bài tập",
    ask_prompt: "Gợi ý hỏi",
    completion: "Hoàn thành",
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: bg[card.type] ?? "#FFF9F5",
        boxShadow: "0 2px 8px rgba(58,33,41,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
          {index + 1}. {label[card.type] ?? card.type}
        </span>
        {card.type === "exercise" && (
          <span className="text-xs text-ink-soft">· {card.exercise_type}</span>
        )}
      </div>

      {card.type === "intro" && (
        <div>
          <p className="text-base font-bold text-ink">{card.title_vi}</p>
          {card.subtitle_vi && <p className="text-sm text-ink-soft mt-0.5">{card.subtitle_vi}</p>}
        </div>
      )}

      {card.type === "word" && (
        <div>
          <p className="text-lg font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {card.image_emoji && <span className="mr-2">{card.image_emoji}</span>}
            {card.word_en}
          </p>
          <p className="text-sm text-ink-soft">{card.word_vi}</p>
          <p className="text-xs text-ink italic mt-1">{card.example_en}</p>
          <p className="text-xs text-ink-soft">{card.example_vi}</p>
        </div>
      )}

      {card.type === "reading" && (
        <div className="space-y-1">
          {card.title_vi && <p className="text-sm font-semibold text-ink">{card.title_vi}</p>}
          {card.sentences_en.map((s, i) => (
            <p key={i} className="text-sm text-ink">
              {s}
            </p>
          ))}
        </div>
      )}

      {card.type === "exercise" && (
        <ExercisePreview card={card} />
      )}

      {card.type === "ask_prompt" && (
        <p className="text-sm text-ink-soft">{card.suggestion_vi}</p>
      )}

      {card.type === "completion" && (
        <div>
          <p className="text-sm font-semibold text-rose-700 mb-1">
            Lưu {card.vocab_to_save.length} từ · Sticker: {card.sticker_kind}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {card.vocab_to_save.map((w) => (
              <span
                key={w}
                className="text-xs px-2 py-0.5 rounded-full font-medium text-rose-600"
                style={{ backgroundColor: "rgba(255,201,213,0.3)" }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExercisePreview({ card }: { card: Extract<Card, { type: "exercise" }> }) {
  const data = card.data as Record<string, unknown>;

  return (
    <div className="text-sm text-ink space-y-1">
      {card.exercise_type === "word_train" && (
        <>
          <p className="text-xs text-ink-soft">Mục tiêu:</p>
          <p className="font-medium">{data.target_sentence_en as string}</p>
          <p className="text-xs text-ink-soft">{data.hint_vi as string}</p>
        </>
      )}
      {card.exercise_type === "spot_imposter" && (
        <>
          <p>{data.sentence_en as string}</p>
          <p className="text-xs text-ink-soft">
            Từ sai: <span className="line-through text-rose-400">{data.imposter_word as string}</span>{" "}
            → <span className="text-green-600">{data.correct_word as string}</span>
          </p>
        </>
      )}
      {card.exercise_type === "pig_says" && (
        <>
          <p className="text-ink-soft">{data.prompt_vi as string}</p>
          <p className="font-medium">→ {data.target_en as string}</p>
        </>
      )}
      {card.exercise_type === "caption_polaroid" && (
        <>
          <p className="text-2xl">{data.image_emoji as string}</p>
          <p className="text-xs text-ink-soft">
            Từ gợi ý: {(data.starter_words as string[])?.join(", ")}
          </p>
          <p className="text-xs italic">Ví dụ: {data.example_en as string}</p>
        </>
      )}
      {card.exercise_type === "sentence_remix" && (
        <>
          <p>{data.base_en as string}</p>
          <p className="text-xs text-ink-soft">{data.instruction_vi as string}</p>
          <p className="text-xs font-medium text-green-700">→ {data.target_en as string}</p>
        </>
      )}
      {card.exercise_type === "pig_says" && null}
      {card.exercise_type === "two_truths" && (
        <p className="text-xs text-ink-soft">{data.prompt_vi as string}</p>
      )}
    </div>
  );
}

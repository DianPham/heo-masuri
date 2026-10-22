"use client";

/**
 * ApprovalUI — Masuri's page review UI.
 * Three actions: Duyệt / Sửa (inline card editing) / Tạo lại.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import type {
  Card, IntroCard, WordCard, ReadingCard, ExerciseCard, AskPromptCard, CompletionCard,
} from "@/types/notebook";

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
  const [approved, setApproved] = useState(
    page.status === "approved" || page.status === "published"
  );

  // Top-level title edits
  const [titleVi, setTitleVi] = useState(page.title_vi);
  const [titleEn, setTitleEn] = useState(page.title_en);

  // Per-card edits (deep copy so mutations don't affect original)
  const [editCards, setEditCards] = useState<Card[]>(() =>
    JSON.parse(JSON.stringify(page.cards))
  );

  // Regenerate hint
  const [hint, setHint] = useState("");

  const alreadyApproved = approved;
  const meta = page.generation_meta ?? {};
  const newVocab = Array.isArray(meta.new_vocab) ? (meta.new_vocab as string[]) : [];

  function updateCard(index: number, patch: Record<string, unknown>) {
    setEditCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } as Card : c)));
  }

  function updateCardData(index: number, dataPatch: Record<string, unknown>) {
    setEditCards((prev) =>
      prev.map((c, i) => {
        if (i !== index || c.type !== "exercise") return c;
        return { ...c, data: { ...(c.data as Record<string, unknown>), ...dataPatch } } as unknown as Card;
      })
    );
  }

  async function handleApprove(edits?: { title_vi?: string; title_en?: string; cards?: Card[] }) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notebook/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: page.id, edits }),
      });
      if (res.ok) {
        setApproved(true);
        setMode("review");
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
    // Regenerate submitted — brief confirmation then back
    return (
      <div style={PAPER_BG} className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl"
        >
          🔄
        </motion.div>
        <p className="text-lg font-bold text-ink">Đã gửi yêu cầu tạo lại 💕</p>
        <p className="text-sm text-ink-soft">Routine sẽ tạo trang mới vào 9pm tối nay</p>
        <button
          type="button"
          onClick={() => router.push("/masuri/notebook")}
          className="mt-2 px-6 py-3 rounded-2xl text-sm font-semibold text-rose-500 border-2 border-rose-200"
        >
          ← Về trang sổ
        </button>
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

      {/* ── Edit / Regenerate panels (above cards) ───────────── */}
      <AnimatePresence>
        {mode === "edit" && (
          <motion.div
            key="edit-titles"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 mt-3 mb-1 rounded-2xl bg-white border border-rose-200 p-4 space-y-3"
            style={{ boxShadow: "0 2px 12px rgba(209,77,111,0.12)" }}
          >
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Sửa tiêu đề</p>
            <Field label="Tiêu đề VI">
              <input
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Tiêu đề EN">
              <input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="field-input"
              />
            </Field>
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

      {/* ── Card list ────────────────────────────────────────── */}
      <div className="px-5 space-y-3 mt-2">
        {(mode === "edit" ? editCards : page.cards).map((card, i) =>
          mode === "edit" ? (
            <EditableCard
              key={i}
              card={card}
              index={i}
              onChange={(patch) => updateCard(i, patch as Partial<Card>)}
              onDataChange={(patch) => updateCardData(i, patch)}
            />
          ) : (
            <CardPreview key={i} card={card} index={i} />
          )
        )}
      </div>

      {/* ── Action bar ──────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4"
        style={{ backgroundColor: "rgba(255,249,245,0.95)", backdropFilter: "blur(8px)" }}
      >
        {mode === "review" && !approved && (
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

        {mode === "review" && approved && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold text-green-700">
              ✅ Đã duyệt — Heo sẽ thấy lúc 6am nha 🌸
            </p>
            <button
              type="button"
              onClick={() => router.push("/masuri/notebook")}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-rose-500 border-2 border-rose-200 active:scale-95 transition-transform"
            >
              ← Về trang sổ
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
              onClick={() =>
                handleApprove({ title_vi: titleVi, title_en: titleEn, cards: editCards })
              }
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

// ── Shared field wrapper ──────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-ink-soft mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-ink outline-none focus:border-rose-400 bg-rose-50";
const textareaCls =
  "w-full rounded-xl border border-rose-200 px-3 py-2 text-sm text-ink outline-none focus:border-rose-400 bg-rose-50 resize-none";

// ── Editable card ─────────────────────────────────────────────
function EditableCard({
  card,
  index,
  onChange,
  onDataChange,
}: {
  card: Card;
  index: number;
  onChange: (patch: Record<string, unknown>) => void;
  onDataChange: (patch: Record<string, unknown>) => void;
}) {
  const label: Record<string, string> = {
    intro: "Giới thiệu",
    word: "Từ vựng",
    reading: "Đọc hiểu",
    exercise: "Bài tập",
    ask_prompt: "Gợi ý hỏi",
    completion: "Hoàn thành",
  };

  const cardBg: Record<string, string> = {
    intro: "#FFE4EA",
    word: "#FFF9F5",
    reading: "#F0F7F1",
    exercise: "#FAF1EA",
    ask_prompt: "#EDE8F5",
    completion: "#FFF0F3",
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: cardBg[card.type] ?? "#FFF9F5", boxShadow: "0 2px 8px rgba(58,33,41,0.08)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
          {index + 1}. {label[card.type] ?? card.type}
        </span>
        {card.type === "exercise" && (
          <span className="text-xs text-ink-soft">· {card.exercise_type}</span>
        )}
      </div>

      {card.type === "intro" && (
        <IntroEdit card={card} onChange={onChange} />
      )}
      {card.type === "word" && (
        <WordEdit card={card} onChange={onChange} />
      )}
      {card.type === "reading" && (
        <ReadingEdit card={card} onChange={onChange} />
      )}
      {card.type === "exercise" && (
        <ExerciseEdit card={card} onDataChange={onDataChange} />
      )}
      {card.type === "ask_prompt" && (
        <AskPromptEdit card={card} onChange={onChange} />
      )}
      {card.type === "completion" && (
        <CompletionEdit card={card} onChange={onChange} />
      )}
    </div>
  );
}

function IntroEdit({ card, onChange }: { card: IntroCard; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Tiêu đề VI">
        <input className={inputCls} value={card.title_vi}
          onChange={(e) => onChange({ title_vi: e.target.value })} />
      </Field>
      <Field label="Phụ đề VI">
        <input className={inputCls} value={card.subtitle_vi ?? ""}
          onChange={(e) => onChange({ subtitle_vi: e.target.value })} />
      </Field>
    </>
  );
}

function WordEdit({ card, onChange }: { card: WordCard; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Emoji">
          <input className={inputCls} value={card.image_emoji ?? ""}
            onChange={(e) => onChange({ image_emoji: e.target.value })}
            style={{ width: 64 }} />
        </Field>
        <div className="flex-1">
          <Field label="Từ EN">
            <input className={inputCls} value={card.word_en}
              onChange={(e) => onChange({ word_en: e.target.value })} />
          </Field>
        </div>
      </div>
      <Field label="Nghĩa VI">
        <input className={inputCls} value={card.word_vi}
          onChange={(e) => onChange({ word_vi: e.target.value })} />
      </Field>
      <Field label="Ví dụ EN">
        <textarea className={textareaCls} rows={2} value={card.example_en}
          onChange={(e) => onChange({ example_en: e.target.value })} />
      </Field>
      <Field label="Ví dụ VI">
        <textarea className={textareaCls} rows={2} value={card.example_vi}
          onChange={(e) => onChange({ example_vi: e.target.value })} />
      </Field>
    </>
  );
}

function ReadingEdit({ card, onChange }: { card: ReadingCard; onChange: (p: Record<string, unknown>) => void }) {
  function updateSentenceEn(i: number, val: string) {
    const next = [...card.sentences_en];
    next[i] = val;
    onChange({ sentences_en: next });
  }
  function updateSentenceVi(i: number, val: string) {
    const next = [...card.sentences_vi];
    next[i] = val;
    onChange({ sentences_vi: next });
  }
  return (
    <>
      {card.sentences_en.map((_, i) => (
        <div key={i} className="space-y-2">
          <Field label={`Câu ${i + 1} EN`}>
            <textarea className={textareaCls} rows={2} value={card.sentences_en[i]}
              onChange={(e) => updateSentenceEn(i, e.target.value)} />
          </Field>
          <Field label={`Câu ${i + 1} VI`}>
            <textarea className={textareaCls} rows={2} value={card.sentences_vi[i] ?? ""}
              onChange={(e) => updateSentenceVi(i, e.target.value)} />
          </Field>
        </div>
      ))}
    </>
  );
}

function ExerciseEdit({
  card,
  onDataChange,
}: {
  card: ExerciseCard;
  onDataChange: (p: Record<string, unknown>) => void;
}) {
  const d = card.data as Record<string, unknown>;

  if (card.exercise_type === "word_train") {
    return (
      <>
        <Field label="Câu mục tiêu EN">
          <textarea className={textareaCls} rows={2} value={d.target_sentence_en as string ?? ""}
            onChange={(e) => onDataChange({ target_sentence_en: e.target.value })} />
        </Field>
        <Field label="Từ xáo trộn (cách nhau bởi dấu phẩy)">
          <input className={inputCls}
            value={(d.shuffled_words as string[] ?? []).join(", ")}
            onChange={(e) =>
              onDataChange({ shuffled_words: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })
            } />
        </Field>
        <Field label="Gợi ý VI">
          <input className={inputCls} value={d.hint_vi as string ?? ""}
            onChange={(e) => onDataChange({ hint_vi: e.target.value })} />
        </Field>
      </>
    );
  }

  if (card.exercise_type === "spot_imposter") {
    return (
      <>
        <Field label="Câu EN (có từ sai)">
          <textarea className={textareaCls} rows={2} value={d.sentence_en as string ?? ""}
            onChange={(e) => onDataChange({ sentence_en: e.target.value })} />
        </Field>
        <div className="flex gap-2">
          <div className="flex-1">
            <Field label="Từ sai">
              <input className={inputCls} value={d.imposter_word as string ?? ""}
                onChange={(e) => onDataChange({ imposter_word: e.target.value })} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Từ đúng">
              <input className={inputCls} value={d.correct_word as string ?? ""}
                onChange={(e) => onDataChange({ correct_word: e.target.value })} />
            </Field>
          </div>
        </div>
        <Field label="Gợi ý VI">
          <input className={inputCls} value={d.hint_vi as string ?? ""}
            onChange={(e) => onDataChange({ hint_vi: e.target.value })} />
        </Field>
      </>
    );
  }

  if (card.exercise_type === "pig_says") {
    return (
      <>
        <Field label="Gợi ý VI">
          <input className={inputCls} value={d.prompt_vi as string ?? ""}
            onChange={(e) => onDataChange({ prompt_vi: e.target.value })} />
        </Field>
        <Field label="Câu đúng EN">
          <textarea className={textareaCls} rows={2} value={d.target_en as string ?? ""}
            onChange={(e) => onDataChange({ target_en: e.target.value })} />
        </Field>
      </>
    );
  }

  if (card.exercise_type === "caption_polaroid") {
    return (
      <>
        <Field label="Emoji ảnh">
          <input className={inputCls} value={d.image_emoji as string ?? ""}
            onChange={(e) => onDataChange({ image_emoji: e.target.value })} style={{ width: 80 }} />
        </Field>
        <Field label="Từ gợi ý (cách nhau bởi dấu phẩy)">
          <input className={inputCls}
            value={(d.starter_words as string[] ?? []).join(", ")}
            onChange={(e) =>
              onDataChange({ starter_words: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })
            } />
        </Field>
        <Field label="Ví dụ EN">
          <textarea className={textareaCls} rows={2} value={d.example_en as string ?? ""}
            onChange={(e) => onDataChange({ example_en: e.target.value })} />
        </Field>
      </>
    );
  }

  if (card.exercise_type === "sentence_remix") {
    return (
      <>
        <Field label="Câu gốc EN">
          <textarea className={textareaCls} rows={2} value={d.base_en as string ?? ""}
            onChange={(e) => onDataChange({ base_en: e.target.value })} />
        </Field>
        <Field label="Câu gốc VI">
          <input className={inputCls} value={d.base_vi as string ?? ""}
            onChange={(e) => onDataChange({ base_vi: e.target.value })} />
        </Field>
        <Field label="Hướng dẫn VI">
          <input className={inputCls} value={d.instruction_vi as string ?? ""}
            onChange={(e) => onDataChange({ instruction_vi: e.target.value })} />
        </Field>
        <Field label="Câu đích EN">
          <textarea className={textareaCls} rows={2} value={d.target_en as string ?? ""}
            onChange={(e) => onDataChange({ target_en: e.target.value })} />
        </Field>
        <Field label="Từ gợi ý (cách nhau bởi dấu phẩy)">
          <input className={inputCls}
            value={(d.hint_words as string[] ?? []).join(", ")}
            onChange={(e) =>
              onDataChange({ hint_words: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })
            } />
        </Field>
      </>
    );
  }

  // Fallback for unknown exercise types
  return <p className="text-xs text-ink-soft">Loại bài tập: {card.exercise_type}</p>;
}

function AskPromptEdit({ card, onChange }: { card: AskPromptCard; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <Field label="Gợi ý VI">
      <input className={inputCls} value={card.suggestion_vi}
        onChange={(e) => onChange({ suggestion_vi: e.target.value })} />
    </Field>
  );
}

function CompletionEdit({ card, onChange }: { card: CompletionCard; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <Field label="Từ lưu vào kho (cách nhau bởi dấu phẩy)">
        <input className={inputCls}
          value={card.vocab_to_save.join(", ")}
          onChange={(e) =>
            onChange({ vocab_to_save: e.target.value.split(",").map((w) => w.trim()).filter(Boolean) })
          } />
      </Field>
      <Field label="Sticker">
        <select
          className={inputCls}
          value={card.sticker_kind}
          onChange={(e) => onChange({ sticker_kind: e.target.value })}
        >
          {[
            "heart_filled","heart_outline","star_filled","star_outline","sparkle",
            "bow_pink","bow_butter","flower_rose","flower_daisy","cloud","sun","moon",
            "coffee_cup","book","pencil","letter","pig_mini",
          ].map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </Field>
    </>
  );
}

// ── Read-only card preview (review mode) ─────────────────────
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
    intro: "Giới thiệu", word: "Từ vựng", reading: "Đọc hiểu",
    exercise: "Bài tập", ask_prompt: "Gợi ý hỏi", completion: "Hoàn thành",
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: bg[card.type] ?? "#FFF9F5", boxShadow: "0 2px 8px rgba(58,33,41,0.08)" }}
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
          {card.sentences_en.map((s, i) => <p key={i} className="text-sm text-ink">{s}</p>)}
        </div>
      )}
      {card.type === "exercise" && <ExercisePreview card={card} />}
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
              <span key={w} className="text-xs px-2 py-0.5 rounded-full font-medium text-rose-600"
                style={{ backgroundColor: "rgba(255,201,213,0.3)" }}>
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
            Từ sai: <span className="line-through text-rose-400">{data.imposter_word as string}</span>
            {" → "}
            <span className="text-green-600">{data.correct_word as string}</span>
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
          <p className="text-xs text-ink-soft">Từ gợi ý: {(data.starter_words as string[])?.join(", ")}</p>
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
      {card.exercise_type === "two_truths" && (
        <p className="text-xs text-ink-soft">{data.prompt_vi as string}</p>
      )}
    </div>
  );
}

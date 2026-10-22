"use client";

/**
 * /heo/notebook/vocab/review — Flashcard self-rating mode (CP4)
 * Shows up to 10 words per session, prioritising:
 *   1. self_confidence === -1 (show me again)
 *   2. not reviewed in 7+ days
 *   3. random recent words
 * No correctness check, no score, no timer. Self-rated only.
 * Blueprint §10.
 */
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTTS } from "@/hooks/useTTS";
import { Pig } from "@/components/theme/Pig";
import type { VocabWord, SelfConfidence } from "@/types/notebook";

const SESSION_SIZE = 10;
const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

/** Pick up to SESSION_SIZE words prioritised as per blueprint §10 */
function pickSession(all: VocabWord[]): VocabWord[] {
  const now = Date.now();
  const tier1 = all.filter((w) => w.self_confidence === -1);
  const tier2 = all.filter(
    (w) =>
      w.self_confidence !== -1 &&
      (!w.last_reviewed_at || now - new Date(w.last_reviewed_at).getTime() > SEVEN_DAYS_MS)
  );
  const tier3 = all.filter(
    (w) =>
      w.self_confidence !== -1 &&
      w.last_reviewed_at &&
      now - new Date(w.last_reviewed_at).getTime() <= SEVEN_DAYS_MS
  );

  // Shuffle each tier
  [tier1, tier2, tier3].forEach((t) => t.sort(() => Math.random() - 0.5));

  const result: VocabWord[] = [];
  for (const tier of [tier1, tier2, tier3]) {
    for (const w of tier) {
      if (result.length >= SESSION_SIZE) break;
      result.push(w);
    }
    if (result.length >= SESSION_SIZE) break;
  }
  return result;
}

export default function VocabReviewPage() {
  const router = useRouter();
  const { speak } = useTTS();
  const [session, setSession] = useState<VocabWord[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [ratingWord, setRatingWord] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notebook/vocab?limit=200")
      .then((r) => r.json())
      .then(({ words }) => {
        const s = pickSession(words ?? []);
        setSession(s);
        if (s.length === 0) setDone(true);
      })
      .catch(() => setDone(true))
      .finally(() => setLoading(false));
  }, []);

  const current = session[index];

  async function rate(confidence: SelfConfidence) {
    if (!current) return;
    setRatingWord(current.id);

    // Optimistic local update
    setSession((prev) =>
      prev.map((w) =>
        w.id === current.id ? { ...w, self_confidence: confidence } : w
      )
    );

    fetch(`/api/notebook/vocab/${current.id}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ self_confidence: confidence }),
    }).catch(() => {/* silent — not critical */});

    // Advance
    setTimeout(() => {
      setRatingWord(null);
      setRevealed(false);
      if (index + 1 >= session.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 350);
  }

  if (loading) {
    return (
      <div style={PAPER_BG} className="min-h-dvh flex items-center justify-center">
        <Pig pose="studying" size={80} animate />
      </div>
    );
  }

  if (done || !current) {
    return <DoneScreen total={session.length} onBack={() => router.push("/heo/notebook/vocab")} />;
  }

  return (
    <div style={PAPER_BG} className="fixed inset-0 z-50 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={() => router.push("/heo/notebook/vocab")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4 L12 12 M12 4 L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <p className="text-sm font-semibold text-rose-400 tabular-nums">
          {index + 1} / {session.length}
        </p>

        {/* Progress bar */}
        <div className="w-20 h-1.5 bg-rose-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-rose-400 rounded-full"
            animate={{ width: `${((index + 1) / session.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-5 pb-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="flex-1 flex flex-col"
          >
            {/* Front: word + example */}
            <div
              className="flex-1 flex flex-col justify-center rounded-3xl p-7 mb-4"
              style={{ backgroundColor: "white", boxShadow: "var(--shadow-card)" }}
            >
              {/* POS */}
              {current.pos && (
                <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
                  {current.pos}
                </p>
              )}

              {/* Word + 🔊 */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-4xl font-bold text-ink leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {current.word_en}
                </span>
                <button
                  type="button"
                  onClick={() => speak(current.word_en)}
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-50"
                >
                  <span style={{ fontSize: 20 }}>🔊</span>
                </button>
              </div>

              {/* Example EN */}
              {current.example_en && (
                <div
                  className="rounded-2xl px-4 py-3 mb-4"
                  style={{ backgroundColor: "rgba(255,201,213,0.18)", border: "1px solid rgba(255,201,213,0.4)" }}
                >
                  <button
                    type="button"
                    onClick={() => speak(current.example_en!)}
                    className="text-left w-full"
                  >
                    <p className="text-sm italic text-ink flex items-start gap-2">
                      <span className="text-rose-400 not-italic shrink-0">🔊</span>
                      &ldquo;{current.example_en}&rdquo;
                    </p>
                  </button>
                </div>
              )}

              {/* Reveal section */}
              <AnimatePresence>
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="h-px bg-rose-100" />
                    <p className="text-xl font-semibold text-ink-soft">
                      {current.word_vi}
                    </p>
                    {current.example_vi && (
                      <p className="text-sm text-ink-soft italic">
                        &ldquo;{current.example_vi}&rdquo;
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setRevealed(true);
                      speak(current.word_en);
                    }}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-rose-300 text-sm font-semibold text-rose-500 active:bg-rose-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Xem nghĩa 🌸
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Rating buttons — only shown after reveal */}
            <AnimatePresence>
              {revealed && (
                <motion.div
                  className="grid grid-cols-3 gap-3"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <RatingButton
                    label="Cho Heo coi lại 🌱"
                    sublabel="Còn khó"
                    color="#FFC9D5"
                    textColor="#A8324F"
                    onClick={() => rate(-1)}
                    loading={ratingWord === current.id}
                  />
                  <RatingButton
                    label="Bình thường 🌸"
                    sublabel="Okay"
                    color="#FAE8B8"
                    textColor="#8B6914"
                    onClick={() => rate(0)}
                    loading={ratingWord === current.id}
                  />
                  <RatingButton
                    label="Heo nhớ rồi ✨"
                    sublabel="Giỏi ghê"
                    color="#C5E0CB"
                    textColor="#2D6A4F"
                    onClick={() => rate(1)}
                    loading={ratingWord === current.id}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Rating button ─────────────────────────────────────────────
function RatingButton({
  label,
  sublabel,
  color,
  textColor,
  onClick,
  loading,
}: {
  label: string;
  sublabel: string;
  color: string;
  textColor: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl active:scale-95 transition-transform disabled:opacity-60"
      style={{ backgroundColor: color }}
    >
      <span className="text-xs font-semibold text-center leading-snug" style={{ color: textColor }}>
        {label}
      </span>
      <span className="text-xs opacity-60" style={{ color: textColor }}>
        {sublabel}
      </span>
    </button>
  );
}

// ── Done screen ───────────────────────────────────────────────
function DoneScreen({ total, onBack }: { total: number; onBack: () => void }) {
  return (
    <div
      style={PAPER_BG}
      className="min-h-dvh flex flex-col items-center justify-center px-8 text-center gap-6"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <Pig pose="cheering" size={100} animate />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <p
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {total === 0 ? "Chưa có từ nào để ôn" : `Ôn xong ${total} từ rồi! 🌸`}
        </p>
        <p className="text-sm text-ink-soft">
          {total === 0
            ? "Học thêm từ mới rồi quay lại nha 💕"
            : "Heo giỏi quá — không có điểm, chỉ có tiến bộ thôi 💕"}
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-rose-500 text-white text-sm font-semibold px-8 py-3.5 rounded-2xl"
        style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
      >
        Quay lại sổ từ vựng
      </motion.button>
    </div>
  );
}

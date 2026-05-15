"use client";

/**
 * /heo/notebook/vocab — Vocabulary book (CP4)
 * Two views: chronological (default) and by topic.
 * Search filters both word_en and word_vi.
 * Long-press a card → VocabWordSheet (review / ask / delete).
 * Blueprint §10.
 */
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTTS } from "@/hooks/useTTS";
import { VocabWordSheet } from "@/components/notebook/VocabWordSheet";
import { Pig } from "@/components/theme/Pig";
import { Tape } from "@/components/notebook/Tape";
import type { VocabWord } from "@/types/notebook";

// ── Paper grid bg ─────────────────────────────────────────────
const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

type View = "date" | "topic";

const TOPIC_LABEL: Record<string, string> = {
  greeting: "Chào hỏi",
  feelings: "Cảm xúc",
  food: "Ẩm thực",
  travel: "Du lịch",
  daily: "Hàng ngày",
  weather: "Thời tiết",
  work: "Công việc",
  review: "Ôn tập",
};

export default function VocabPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("date");
  const [search, setSearch] = useState("");
  const [activeSheet, setActiveSheet] = useState<VocabWord | null>(null);

  // ── Fetch ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/notebook/vocab")
      .then((r) => r.json())
      .then(({ words }) => setWords(words ?? []))
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleted = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // ── Filter ──────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const filtered = q
    ? words.filter(
        (w) =>
          w.word_en.toLowerCase().includes(q) ||
          w.word_vi.toLowerCase().includes(q)
      )
    : words;

  // ── Group by topic (for topic view) ─────────────────────────
  const byTopic = filtered.reduce<Record<string, VocabWord[]>>((acc, w) => {
    const key = w.source_page_topic ?? "other";
    (acc[key] ??= []).push(w);
    return acc;
  }, {});

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-4">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="butter" width={100} length={22} rotate={1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          Sổ từ vựng
        </h1>
        <p className="text-center text-sm text-ink-soft mt-0.5">
          {loading ? "Đang tải..." : `${words.length} từ đã lưu`}
        </p>
      </div>

      {/* ── Search + view toggle ────────────────────────────── */}
      <div className="px-5 mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-300">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm từ..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-rose-200 bg-white text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400"
          />
        </div>

        {/* View toggle */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ backgroundColor: "rgba(255,201,213,0.3)" }}
        >
          {(["date", "topic"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                view === v
                  ? "bg-white text-rose-500 shadow-sm"
                  : "text-rose-400"
              }`}
            >
              {v === "date" ? "Theo ngày" : "Theo chủ đề"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={q.length > 0} />
      ) : view === "date" ? (
        <DateView
          words={filtered}
          onLongPress={setActiveSheet}
        />
      ) : (
        <TopicView
          groups={byTopic}
          onLongPress={setActiveSheet}
        />
      )}

      {/* ── Flashcard CTA (only if words exist) ─────────────── */}
      {!loading && words.length > 0 && (
        <div className="px-5 pb-8 mt-2">
          <Link
            href="/heo/notebook/vocab/review"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-rose-300 text-sm font-semibold text-rose-500 active:bg-rose-50 transition-colors"
          >
            🃏 Ôn từ vựng
          </Link>
        </div>
      )}

      {/* ── Word action sheet ────────────────────────────────── */}
      <AnimatePresence>
        {activeSheet && (
          <VocabWordSheet
            word={activeSheet}
            onClose={() => setActiveSheet(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chronological view ────────────────────────────────────────
function DateView({
  words,
  onLongPress,
}: {
  words: VocabWord[];
  onLongPress: (w: VocabWord) => void;
}) {
  return (
    <div className="px-5 space-y-3 mb-4">
      {words.map((w) => (
        <WordCard key={w.id} word={w} onLongPress={onLongPress} />
      ))}
    </div>
  );
}

// ── Topic grouped view ────────────────────────────────────────
function TopicView({
  groups,
  onLongPress,
}: {
  groups: Record<string, VocabWord[]>;
  onLongPress: (w: VocabWord) => void;
}) {
  return (
    <div className="px-5 space-y-6 mb-4">
      {Object.entries(groups).map(([topic, words]) => (
        <div key={topic}>
          <div className="flex items-center gap-2 mb-3">
            <Tape color="mint" width={40} length={12} rotate={-1} />
            <h2 className="text-sm font-bold text-ink-soft uppercase tracking-wide">
              {TOPIC_LABEL[topic] ?? topic}
            </h2>
            <span className="text-xs text-rose-400 font-medium ml-1">
              {words.length} từ
            </span>
          </div>
          <div className="space-y-3">
            {words.map((w) => (
              <WordCard key={w.id} word={w} onLongPress={onLongPress} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Individual word card ──────────────────────────────────────
function WordCard({
  word,
  onLongPress,
}: {
  word: VocabWord;
  onLongPress: (w: VocabWord) => void;
}) {
  const { speak } = useTTS();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressed, setPressed] = useState(false);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    onLongPress(word);
  }

  function handlePointerDown() {
    setPressed(true);
    // Fallback timer for browsers where contextmenu fires late / not at all
    pressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(40);
      onLongPress(word);
    }, 600);
  }

  function handlePointerUp() {
    clearTimeout(pressTimer.current!);
    setPressed(false);
  }

  // Confidence badge
  const confidenceBadge =
    word.self_confidence === 1
      ? { label: "Nhớ rồi ✨", color: "#9CAF88" }
      : word.self_confidence === -1
      ? { label: "Coi lại 🌱", color: "#E97A95" }
      : null;

  const savedDate = new Date(word.saved_at).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <motion.div
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      animate={{ scale: pressed ? 0.97 : 1 }}
      transition={{ duration: 0.1 }}
      className="rounded-2xl overflow-hidden bg-white cursor-pointer select-none"
      style={{ boxShadow: "var(--shadow)" }}
    >
      {/* Word + audio */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="text-2xl font-bold text-ink leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {word.word_en}
              </span>
              {word.pos && (
                <span className="text-xs text-rose-400 font-semibold uppercase tracking-wide">
                  {word.pos}
                </span>
              )}
              {confidenceBadge && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: confidenceBadge.color }}
                >
                  {confidenceBadge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft mt-0.5">{word.word_vi}</p>
          </div>

          {/* Speak button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              speak(word.word_en);
            }}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-50"
            aria-label={`Nghe phát âm ${word.word_en}`}
          >
            <span style={{ fontSize: 18 }}>🔊</span>
          </button>
        </div>

        {/* Example sentences */}
        {(word.example_en || word.example_vi) && (
          <div className="mt-3 pt-3 border-t border-rose-100 space-y-1">
            {word.example_en && (
              <p
                className="text-sm italic text-ink leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                &ldquo;{word.example_en}&rdquo;
              </p>
            )}
            {word.example_vi && (
              <p className="text-xs text-ink-soft leading-relaxed">
                &ldquo;{word.example_vi}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Meta footer */}
      <div
        className="px-5 py-2.5 text-xs text-ink-soft flex items-center gap-1"
        style={{ backgroundColor: "rgba(255,249,245,0.8)" }}
      >
        <span>Lưu {savedDate}</span>
        {word.source_page_title_vi && (
          <>
            <span className="text-rose-200">·</span>
            <span>từ &ldquo;{word.source_page_title_vi}&rdquo;</span>
          </>
        )}
        {word.source_kind === "masuri_card" && (
          <>
            <span className="text-rose-200">·</span>
            <span className="text-rose-400 font-medium">Từ Masuri 🐷</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 pt-8 pb-16 text-center">
      <Pig pose={hasSearch ? "thinking" : "sleepy"} size={80} animate />
      <p
        className="text-xl font-bold text-ink mt-6 mb-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        {hasSearch ? "Không tìm thấy từ nào" : "Chưa có từ nào trong sổ"}
      </p>
      <p className="text-sm text-ink-soft mb-6">
        {hasSearch
          ? "Thử tìm lại với từ khác nha"
          : "Heo lưu từ khi học mỗi ngày nha 📖"}
      </p>
      {!hasSearch && (
        <Link
          href="/heo/notebook/today"
          className="bg-rose-500 text-white text-sm font-semibold px-7 py-3 rounded-2xl"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
        >
          Học từ mới hôm nay
        </Link>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="px-5 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white h-32 animate-pulse"
          style={{ opacity: 1 - i * 0.15, boxShadow: "var(--shadow)" }}
        />
      ))}
    </div>
  );
}

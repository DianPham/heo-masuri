"use client";

/**
 * /heo/notebook/ask — list of Heo's questions to Masuri with replies.
 * Newest first. Tapping a thread marks Masuri's reply as seen.
 * Blueprint CP6.
 */
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Pig } from "@/components/theme/Pig";

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

interface Thread {
  id: string;
  word_en: string | null;
  question_text: string;
  source_page_id: string | null;
  reply_text: string | null;
  replied_at: string | null;
  seen_at: string | null;
  created_at: string;
}

export default function AskHistoryPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/notebook/ask")
      .then((r) => r.json())
      .then(({ threads }) => setThreads(threads ?? []))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markSeen(id: string) {
    await fetch(`/api/notebook/ask/${id}/seen`, { method: "POST" }).catch(() => {});
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, seen_at: new Date().toISOString() } : t))
    );
  }

  const unseenReplies = threads.filter(
    (t) => t.reply_text && !t.seen_at
  ).length;

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-10">
      {/* Header */}
      <div className="pt-10 pb-5 flex items-center gap-3">
        <Link
          href="/heo/notebook"
          className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14 L5 9 L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-ink leading-tight"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Hỏi Masuri
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            {unseenReplies > 0
              ? `${unseenReplies} câu trả lời mới 💕`
              : "Câu hỏi & câu trả lời"}
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : threads.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {threads.map((t, i) => (
            <ThreadCard
              key={t.id}
              thread={t}
              index={i}
              onMarkSeen={() => markSeen(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Thread card ──────────────────────────────────────────────
function ThreadCard({
  thread,
  index,
  onMarkSeen,
}: {
  thread: Thread;
  index: number;
  onMarkSeen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasReply = !!thread.reply_text;
  const unseen = hasReply && !thread.seen_at;

  function handleClick() {
    if (unseen) onMarkSeen();
    setExpanded((v) => !v);
  }

  const date = new Date(thread.created_at).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="w-full text-left rounded-2xl bg-white p-4 active:scale-[0.99] transition-transform"
      style={{
        boxShadow: "var(--shadow)",
        border: unseen ? "2px solid #E97A95" : "1px solid rgba(255,201,213,0.4)",
      }}
    >
      {/* Question */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-rose-400 font-bold text-xs mt-0.5">Heo:</span>
        <div className="flex-1 min-w-0">
          {thread.word_en && (
            <p
              className="text-base font-bold text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {thread.word_en}
            </p>
          )}
          <p className="text-sm text-ink-soft leading-snug">
            {thread.question_text}
          </p>
        </div>
        {unseen && (
          <span
            className="shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: "#E97A95" }}
            aria-label="Chưa đọc"
          />
        )}
      </div>

      {/* Reply */}
      {hasReply ? (
        <div
          className="rounded-xl px-3 py-2 mt-2"
          style={{ backgroundColor: "rgba(156,175,136,0.12)", border: "1px solid rgba(156,175,136,0.3)" }}
        >
          <div className="flex items-start gap-2">
            <span className="text-green-700 font-bold text-xs mt-0.5">Masuri:</span>
            <p
              className={`flex-1 text-sm text-ink leading-snug ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {thread.reply_text}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-2 text-xs text-rose-300">
          <Pig pose="thinking" size={16} />
          <span>Masuri đang nghĩ câu trả lời...</span>
        </div>
      )}

      {/* Meta */}
      <p className="text-[10px] text-ink-soft mt-2 text-right">{date}</p>
    </motion.button>
  );
}

// ── Empty ────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center pt-12 pb-8 text-center">
      <Pig pose="sleepy" size={80} animate />
      <p
        className="text-xl font-bold text-ink mt-6 mb-2"
        style={{ fontFamily: "var(--font-handwritten)" }}
      >
        Chưa có câu hỏi nào
      </p>
      <p className="text-sm text-ink-soft mb-6 px-6">
        Khi học, Heo nhấn giữ từ tiếng Anh để hỏi Masuri nha 💕
      </p>
      <Link
        href="/heo/notebook/today"
        className="bg-rose-500 text-white text-sm font-semibold px-7 py-3 rounded-2xl"
        style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
      >
        Học hôm nay
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white h-24 animate-pulse"
          style={{ opacity: 1 - i * 0.2, boxShadow: "var(--shadow)" }}
        />
      ))}
    </div>
  );
}

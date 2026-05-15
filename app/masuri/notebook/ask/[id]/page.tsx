"use client";

/**
 * /masuri/notebook/ask/[id] — Masuri replies to a single question from Heo.
 * Blueprint CP6.
 */
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pig } from "@/components/theme/Pig";

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

interface Thread {
  id: string;
  context_word: string | null;
  question_note: string;
  reply_text: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function MasuriAskReplyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/notebook/ask")
      .then((r) => r.json())
      .then(({ threads }) => {
        const t = (threads ?? []).find((t: Thread) => t.id === id);
        if (t) {
          setThread(t);
          if (t.reply_text) setReply(t.reply_text);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSend() {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/notebook/ask/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_text: reply.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => router.push("/masuri/notebook"), 1500);
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div style={PAPER_BG} className="min-h-dvh flex items-center justify-center">
        <Pig pose="thinking" size={80} animate />
      </div>
    );
  }

  if (!thread) {
    return (
      <div style={PAPER_BG} className="min-h-dvh flex flex-col items-center justify-center px-8 text-center gap-4">
        <Pig pose="thinking" size={80} animate />
        <p className="text-lg font-semibold text-ink">Không tìm thấy câu hỏi này</p>
        <Link
          href="/masuri/notebook"
          className="bg-rose-500 text-white text-sm font-semibold px-6 py-3 rounded-2xl"
        >
          Quay lại sổ tay
        </Link>
      </div>
    );
  }

  const askedDate = new Date(thread.created_at).toLocaleString("vi-VN", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-10">
      {/* Header */}
      <div className="pt-10 pb-5 flex items-center gap-3">
        <Link
          href="/masuri/notebook"
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
            Heo hỏi nè
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">{askedDate}</p>
        </div>
      </div>

      {/* Question card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 mb-5"
        style={{
          background: "linear-gradient(135deg, #FFE3E9 0%, #FFC9D5 100%)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-start gap-3 mb-2">
          <span className="text-2xl">🐷</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1">
              Heo hỏi
            </p>
            {thread.context_word && (
              <p
                className="text-2xl font-bold text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {thread.context_word}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-ink leading-relaxed">
          {thread.question_note}
        </p>
      </motion.div>

      {/* Reply form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
          Trả lời của Masuri
        </p>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Viết câu trả lời cho Heo..."
          rows={6}
          disabled={sent}
          className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 resize-none bg-white"
          style={{ fontFamily: "var(--font-body)", boxShadow: "var(--shadow)" }}
        />

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 mt-4 py-3 rounded-2xl"
            style={{ backgroundColor: "rgba(156,175,136,0.15)", border: "1px solid rgba(156,175,136,0.4)" }}
          >
            <span style={{ fontSize: 18 }}>💕</span>
            <p className="text-sm font-bold text-green-700">Đã gửi cho Heo</p>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!reply.trim() || sending}
            className="mt-4 w-full py-3.5 rounded-2xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
          >
            {sending
              ? "Đang gửi..."
              : thread.reply_text
              ? "Cập nhật câu trả lời 💕"
              : "Gửi cho Heo 💕"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

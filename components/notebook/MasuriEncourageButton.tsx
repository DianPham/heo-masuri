"use client";

/**
 * MasuriEncourageButton — lets Masuri send an encouragement push to Heo.
 * Drops into the Masuri notebook quick-actions section.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const PRESETS = [
  "Heo học giỏi lắm! Masuri tự hào lắm nè 💕",
  "Cố lên Heo ơi! Masuri luôn ở đây ủng hộ 🌸",
  "Heo giỏi quá đi! Tiếp tục nha em yêu 🐷✨",
  "Hôm nay Heo học chưa? Masuri đang chờ nè 💌",
  "Mỗi ngày một tí, Heo sẽ giỏi tiếng Anh thôi 🌟",
];

export function MasuriEncourageButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function pickPreset() {
    const remaining = PRESETS.filter((p) => p !== message);
    const pool = remaining.length > 0 ? remaining : PRESETS;
    setMessage(pool[Math.floor(Math.random() * pool.length)]);
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      await fetch("/api/notebook/encourage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        setMessage("");
      }, 2000);
    } catch {
      // silent fail
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ backgroundColor: "rgba(156,175,136,0.15)", border: "1px solid rgba(156,175,136,0.4)" }}
      >
        <span style={{ fontSize: 20 }}>💕</span>
        <span className="text-sm font-semibold text-green-700">Đã gửi cho Heo rồi!</span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 active:scale-[0.98] transition-transform text-left w-full"
      >
        <span style={{ fontSize: 20 }}>💕</span>
        <span className="flex-1 text-sm font-medium text-ink">Gửi động lực cho Heo</span>
        <span className="text-rose-400 text-sm">{open ? "↑" : "→"}</span>
      </button>

      {/* Expandable compose area */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="compose"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Viết lời động lực cho Heo... (hoặc để trống để gửi ngẫu nhiên)"
                rows={3}
                className="w-full rounded-xl border border-rose-200 px-3 py-2.5 text-sm text-ink placeholder:text-rose-200 outline-none focus:border-rose-400 resize-none bg-white"
                style={{ fontFamily: "var(--font-body)" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={pickPreset}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-rose-400 border border-rose-200 active:scale-95 transition-transform"
                >
                  🎲 Ngẫu nhiên
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 disabled:opacity-50 active:scale-95 transition-transform"
                  style={{ boxShadow: "0 3px 8px rgba(209,77,111,0.3)" }}
                >
                  {sending ? "Đang gửi..." : "Gửi 💕"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

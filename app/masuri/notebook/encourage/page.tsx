"use client";

/**
 * /masuri/notebook/encourage — Full-screen encouragement composer.
 * Blueprint §5, CP7: dedicated page for Masuri to craft & send Heo a boost.
 * More presets and more space than the inline MasuriEncourageButton.
 */
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Pig } from "@/components/theme/Pig";

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

const PRESETS = [
  { label: "Tự hào", text: "Heo học giỏi lắm! Masuri tự hào lắm nè 💕" },
  { label: "Cổ vũ", text: "Cố lên Heo ơi! Masuri luôn ở đây ủng hộ 🌸" },
  { label: "Khen ngợi", text: "Heo giỏi quá đi! Tiếp tục nha em yêu 🐷✨" },
  { label: "Nhắc nhở", text: "Hôm nay Heo học chưa? Masuri đang chờ nè 💌" },
  { label: "Động lực", text: "Mỗi ngày một tí, Heo sẽ giỏi tiếng Anh thôi 🌟" },
  { label: "Yêu thương", text: "Masuri thấy Heo đang cố gắng, và Masuri yêu điều đó 🥰" },
  { label: "Tin tưởng", text: "Heo làm được mà! Masuri tin Heo lắm 💪🌸" },
  { label: "Ngẫu nhiên", text: "" },
];

const RANDOM_POOL = [
  "Heo học giỏi lắm! Masuri tự hào lắm nè 💕",
  "Cố lên Heo ơi! Masuri luôn ở đây ủng hộ 🌸",
  "Heo giỏi quá đi! Tiếp tục nha em yêu 🐷✨",
  "Hôm nay Heo học chưa? Masuri đang chờ nè 💌",
  "Mỗi ngày một tí, Heo sẽ giỏi tiếng Anh thôi 🌟",
  "Masuri thấy Heo đang cố gắng, và Masuri yêu điều đó 🥰",
  "Heo làm được mà! Masuri tin Heo lắm 💪🌸",
  "Heo xinh gái + học giỏi = hoàn hảo rồi 🌸✨",
  "Mỗi từ Heo học là thêm một điểm chung để mình nói chuyện nha 💌",
  "Streak của Heo đang rất đẹp — Masuri nhìn mà cũng hào hứng theo! 🔥",
];

export default function MasuriEncouragePage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lastSent, setLastSent] = useState("");

  function pickPreset(text: string) {
    if (text === "") {
      // Random
      const remaining = RANDOM_POOL.filter((p) => p !== message);
      const pool = remaining.length > 0 ? remaining : RANDOM_POOL;
      setMessage(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      setMessage(text);
    }
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
      setLastSent(message.trim() || "(ngẫu nhiên)");
      setSent(true);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  function handleSendAnother() {
    setSent(false);
    setMessage("");
  }

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-10">
      {/* Header */}
      <div className="pt-10 pb-5 flex items-center gap-3">
        <Link
          href="/masuri/notebook"
          className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 active:bg-rose-100"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 14 L5 9 L11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1
            className="text-2xl font-bold text-ink leading-tight"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Gửi động lực cho Heo
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Một câu nhỏ thôi, Heo sẽ thấy ấm lòng lắm 💕
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {sent ? (
          /* ── Sent confirmation ── */
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="flex flex-col items-center pt-12 pb-8 text-center"
          >
            <Pig pose="cheering" size={96} animate />
            <p
              className="text-2xl font-bold text-ink mt-6 mb-2"
              style={{ fontFamily: "var(--font-handwritten)" }}
            >
              Đã gửi cho Heo rồi!
            </p>
            <p className="text-sm text-ink-soft mb-2 px-6">Heo nhận được tin nhắn này:</p>
            {lastSent && lastSent !== "(ngẫu nhiên)" && (
              <div
                className="mx-6 mb-6 rounded-2xl px-4 py-3 text-center"
                style={{
                  backgroundColor: "rgba(255,201,213,0.18)",
                  border: "1px solid rgba(255,201,213,0.4)",
                }}
              >
                <p className="text-sm text-ink italic">&ldquo;{lastSent}&rdquo;</p>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                type="button"
                onClick={handleSendAnother}
                className="w-full py-3 rounded-2xl bg-rose-500 text-white text-sm font-semibold active:scale-95 transition-transform"
                style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.3)" }}
              >
                Gửi thêm lần nữa 🌸
              </button>
              <Link
                href="/masuri/notebook"
                className="block w-full py-3 rounded-2xl text-center border border-rose-300 text-rose-500 text-sm font-semibold active:scale-95 transition-transform"
              >
                Quay lại sổ tay
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ── Compose form ── */
          <motion.div
            key="compose"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            {/* Pig illustration */}
            <div className="flex justify-center py-2">
              <Pig pose="studying" size={72} animate={false} />
            </div>

            {/* Presets */}
            <div>
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2.5">
                Gợi ý nhanh
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => pickPreset(p.text)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
                    style={{
                      backgroundColor:
                        message === p.text && p.text !== ""
                          ? "rgba(233,122,149,0.25)"
                          : "rgba(255,201,213,0.18)",
                      border:
                        message === p.text && p.text !== ""
                          ? "1.5px solid rgba(233,122,149,0.5)"
                          : "1px solid rgba(255,201,213,0.4)",
                      color: message === p.text && p.text !== "" ? "#C4667A" : "#888",
                    }}
                  >
                    {p.label === "Ngẫu nhiên" ? "🎲 Ngẫu nhiên" : p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compose area */}
            <div>
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
                Lời nhắn
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Viết lời động lực cho Heo... (để trống để gửi ngẫu nhiên)"
                rows={5}
                className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed resize-none outline-none text-ink placeholder:text-rose-200"
                style={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                  border: "1.5px solid rgba(255,201,213,0.4)",
                  fontFamily: "var(--font-handwritten)",
                  fontSize: 16,
                  boxShadow: "var(--shadow)",
                }}
              />
              <p className="text-xs text-right text-ink-soft mt-1 pr-1">
                {message.length > 0 ? `${message.length} ký tự` : "Để trống → ngẫu nhiên"}
              </p>
            </div>

            {/* Preview of what Heo sees */}
            {message.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: "rgba(156,175,136,0.1)",
                  border: "1px solid rgba(156,175,136,0.3)",
                }}
              >
                <p className="text-xs text-green-700 font-semibold mb-1">
                  Heo sẽ nhận được:
                </p>
                <p className="text-xs font-bold text-ink">💕 Masuri gửi động lực</p>
                <p className="text-sm text-ink mt-1 leading-snug">{message.trim()}</p>
              </motion.div>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 rounded-2xl bg-rose-500 text-white text-base font-bold disabled:opacity-50 active:scale-95 transition-transform"
              style={{ boxShadow: "0 4px 14px rgba(209,77,111,0.35)" }}
            >
              {sending ? "Đang gửi..." : "Gửi cho Heo 💕"}
            </button>

            <p className="text-center text-xs text-ink-soft pb-2">
              Heo sẽ nhận được thông báo ngay lập tức 🌸
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

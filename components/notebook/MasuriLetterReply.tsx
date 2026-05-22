"use client";

/**
 * MasuriLetterReply — Masuri's reply form for Heo's letter.
 * Supports weekly_letter (with optional corrections) and two_truths (guess picker).
 * lieIndex is intentionally NOT passed here — Masuri must guess blind.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

type Correction = {
  original_en: string;
  suggested_en: string;
  vi_explanation: string;
};

export function MasuriLetterReply({
  letterId,
  isTwoTruths,
}: {
  letterId: string;
  isTwoTruths: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [guess, setGuess] = useState<1 | 2 | 3 | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function addCorrection() {
    if (corrections.length >= 2) return; // Blueprint: "chỉ 1-2 câu để Heo không sợ"
    setCorrections([...corrections, { original_en: "", suggested_en: "", vi_explanation: "" }]);
  }

  function removeCorrection(i: number) {
    setCorrections(corrections.filter((_, idx) => idx !== i));
  }

  function updateCorrection(i: number, field: keyof Correction, value: string) {
    const next = [...corrections];
    next[i] = { ...next[i], [field]: value };
    setCorrections(next);
  }

  async function send() {
    if (sending) return;
    if (!body.trim()) return;
    if (isTwoTruths && guess === null) return;

    setSending(true);
    try {
      const validCorrections = corrections.filter(
        (c) => c.original_en.trim() && c.suggested_en.trim()
      );

      const res = await fetch(`/api/notebook/letter/${letterId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          corrections: validCorrections.length > 0 ? validCorrections : undefined,
          two_truths_guess: isTwoTruths && guess !== null ? guess : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Có lỗi xảy ra");
        return;
      }

      setSent(true);
    } catch {
      alert("Mạng đang lỗi, thử lại nha");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-10 space-y-3">
        <span className="text-4xl block">💕</span>
        <p
          className="font-semibold text-ink"
          style={{ fontFamily: "var(--font-handwritten)", fontSize: 20 }}
        >
          Đã gửi cho Heo rồi!
        </p>
        <button
          onClick={() => router.push("/masuri/notebook")}
          className="mt-4 text-sm text-rose-400 underline underline-offset-2"
        >
          Quay lại sổ
        </button>
      </div>
    );
  }

  const canSend = body.trim().length > 0 && (!isTwoTruths || guess !== null);

  return (
    <div className="space-y-5">
      {/* Two truths guess — Masuri picks blind, no hints */}
      {isTwoTruths && (
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            backgroundColor: "rgba(237,232,245,0.5)",
            border: "1px solid rgba(196,168,220,0.4)",
          }}
        >
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
            Masuri đoán câu nào là bịa?
          </p>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                onClick={() => setGuess(n)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor:
                    guess === n ? "rgba(196,168,220,0.6)" : "rgba(255,249,245,0.9)",
                  border: `1px solid ${guess === n ? "rgba(196,168,220,0.8)" : "rgba(255,201,213,0.3)"}`,
                  color: guess === n ? "#6B21A8" : "#888",
                }}
              >
                Câu {n}
              </button>
            ))}
          </div>
          {guess !== null && (
            <p className="text-xs text-center mt-2 text-ink-soft">
              Masuri đoán câu {guess} là bịa — Heo sẽ biết kết quả sau khi Masuri gửi 🎭
            </p>
          )}
        </div>
      )}

      {/* Reply body */}
      <div>
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
          Masuri trả lời
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Viết gì đó cho Heo nha Masuri 🌸"
          rows={6}
          className="w-full rounded-2xl px-4 py-3 text-sm leading-relaxed resize-none outline-none"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(196,168,220,0.4)",
            fontFamily: "var(--font-handwritten)",
            fontSize: 16,
            color: "#4B3A5A",
          }}
        />
      </div>

      {/* Grammar corrections — only for regular letters */}
      {!isTwoTruths && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
              Gợi ý tiếng Anh (không bắt buộc)
            </p>
            {corrections.length < 2 && (
              <button onClick={addCorrection} className="text-xs text-purple-500 font-medium">
                + Thêm
              </button>
            )}
          </div>

          {corrections.length === 0 && (
            <p className="text-xs text-ink-soft italic">
              Nếu Heo viết sai tiếng Anh, Masuri có thể gợi ý nhẹ nhàng ở đây 💕
            </p>
          )}

          <div className="space-y-3">
            {corrections.map((c, i) => (
              <div
                key={i}
                className="rounded-xl px-3 py-3 space-y-2"
                style={{
                  backgroundColor: "rgba(255,249,245,0.9)",
                  border: "1px solid rgba(255,201,213,0.3)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-rose-400">Gợi ý {i + 1}</p>
                  <button onClick={() => removeCorrection(i)} className="text-xs text-ink-soft">
                    ✕
                  </button>
                </div>
                <input
                  value={c.original_en}
                  onChange={(e) => updateCorrection(i, "original_en", e.target.value)}
                  placeholder="Câu gốc của Heo..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,201,213,0.3)",
                    color: "#888",
                  }}
                />
                <input
                  value={c.suggested_en}
                  onChange={(e) => updateCorrection(i, "suggested_en", e.target.value)}
                  placeholder="Gợi ý sửa..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(196,168,220,0.3)",
                    color: "#4B3A5A",
                  }}
                />
                <input
                  value={c.vi_explanation}
                  onChange={(e) => updateCorrection(i, "vi_explanation", e.target.value)}
                  placeholder="Giải thích bằng tiếng Việt (tuỳ chọn)..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,201,213,0.2)",
                    color: "#888",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send */}
      <button
        onClick={send}
        disabled={sending || !canSend}
        className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
        style={{
          backgroundColor: "#C4667A",
          opacity: sending || !canSend ? 0.5 : 1,
          boxShadow: "0 4px 12px rgba(196,102,122,0.3)",
        }}
      >
        {sending ? "Đang gửi..." : "Gửi cho Heo 💕"}
      </button>
    </div>
  );
}

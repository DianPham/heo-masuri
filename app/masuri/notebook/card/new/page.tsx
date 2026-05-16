"use client";

/**
 * /masuri/notebook/card/new — Masuri hand-writes a vocabulary card for Heo.
 * Posts to POST /api/notebook/card.
 */
import { useState } from "react";
import { Tape } from "@/components/notebook/Tape";
import Link from "next/link";

const PAPER_BG: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
};

export default function NewCardPage() {
  const [wordEn, setWordEn] = useState("");
  const [wordVi, setWordVi] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    if (!wordEn.trim() || !wordVi.trim()) {
      setErrorMsg("Hãy điền từ tiếng Anh và nghĩa tiếng Việt nha Masuri 🌸");
      return;
    }

    setState("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/notebook/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_en: wordEn.trim(),
          word_vi: wordVi.trim(),
          example_en: exampleEn.trim(),
          personal_note: personalNote.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Lỗi không xác định");
      }

      setState("done");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra, thử lại nha");
    }
  }

  if (state === "done") {
    return (
      <div style={PAPER_BG} className="min-h-dvh flex flex-col items-center justify-center px-8 text-center gap-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{ background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)", boxShadow: "0 8px 24px rgba(209,77,111,0.3)" }}
        >
          📖
        </div>
        <div>
          <p
            className="text-2xl font-bold text-ink mb-2"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Thiệp từ vựng đã gửi! 💕
          </p>
          <p className="text-sm text-ink-soft">
            Heo sẽ tìm thấy từ &ldquo;<span className="font-semibold text-rose-500">{wordEn}</span>&rdquo; trong sổ từ vựng của mình
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => {
              setWordEn(""); setWordVi(""); setExampleEn(""); setPersonalNote("");
              setState("idle");
            }}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #F8A8BC 0%, #e879a4 100%)", boxShadow: "0 4px 14px rgba(209,77,111,0.3)" }}
          >
            Viết thiệp khác
          </button>
          <Link
            href="/masuri/notebook"
            className="block w-full py-3.5 rounded-2xl text-sm font-semibold text-rose-400 text-center border-2 border-rose-200"
          >
            Quay lại sổ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* Header */}
      <div className="relative px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/masuri/notebook" className="text-ink-soft text-sm">← Sổ</Link>
          <h1 className="text-base font-bold text-ink flex-1">
            Viết thiệp từ vựng cho Heo
          </h1>
        </div>
      </div>

      {/* Card preview / form */}
      <div className="px-5">
        <div
          className="relative rounded-3xl p-6 mb-6 overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(255,201,213,0.4)",
            boxShadow: "var(--polaroid-shadow)",
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Tape color="pink" width={18} length={72} rotate={-1} />
          </div>

          <p
            className="text-center text-2xl mb-5 mt-1"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            📖 Thiệp từ vựng
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* word_en */}
            <div>
              <label className="block text-xs font-semibold text-rose-500 mb-1.5 uppercase tracking-wide">
                Từ tiếng Anh *
              </label>
              <input
                type="text"
                value={wordEn}
                onChange={(e) => setWordEn(e.target.value)}
                placeholder="vd: serendipity"
                maxLength={80}
                className="w-full px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50/40 text-base font-bold text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 focus:bg-white transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
                autoFocus
                autoComplete="off"
              />
            </div>

            {/* word_vi */}
            <div>
              <label className="block text-xs font-semibold text-rose-500 mb-1.5 uppercase tracking-wide">
                Nghĩa tiếng Việt *
              </label>
              <input
                type="text"
                value={wordVi}
                onChange={(e) => setWordVi(e.target.value)}
                placeholder="vd: cơ duyên tình cờ"
                maxLength={120}
                className="w-full px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50/40 text-sm text-ink placeholder:text-rose-300 outline-none focus:border-rose-400 focus:bg-white transition-colors"
              />
            </div>

            {/* example_en */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">
                Câu ví dụ (tiếng Anh)
              </label>
              <textarea
                value={exampleEn}
                onChange={(e) => setExampleEn(e.target.value)}
                placeholder='vd: "It was serendipity that brought us together."'
                maxLength={200}
                rows={2}
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white text-sm italic text-ink placeholder:text-rose-200 outline-none focus:border-rose-300 transition-colors resize-none"
              />
            </div>

            {/* personal_note */}
            <div>
              <label className="block text-xs font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">
                Ghi chú của Masuri
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Một câu nhỏ từ Masuri dành cho Heo... 🌸"
                maxLength={300}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-rose-100 bg-white text-sm text-ink placeholder:text-rose-200 outline-none focus:border-rose-300 transition-colors resize-none"
                style={{ fontFamily: "var(--font-handwritten)", fontSize: 15 }}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-rose-500 font-medium text-center">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={state === "sending" || !wordEn.trim() || !wordVi.trim()}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #F8A8BC 0%, #e879a4 100%)",
                boxShadow: "0 4px 14px rgba(209,77,111,0.3)",
              }}
            >
              {state === "sending" ? "Đang gửi..." : "Gửi thiệp cho Heo 💕"}
            </button>
          </form>
        </div>

        <p className="text-xs text-ink-soft text-center pb-8">
          Từ này sẽ được thêm vào sổ từ vựng của Heo và Heo sẽ nhận thông báo 🌸
        </p>
      </div>
    </div>
  );
}

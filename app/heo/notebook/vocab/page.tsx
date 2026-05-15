/**
 * /heo/notebook/vocab — Vocabulary book (CP2 empty state)
 * Full implementation (chronological list, search, flashcard mode) in CP4.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";

export const dynamic = "force-dynamic";

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default async function VocabPage() {
  const t = await getTranslations("notebook.vocab");

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-6">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="butter" width={100} length={22} rotate={1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("title")}
        </h1>
        <p className="text-center text-sm text-ink-soft mt-1">
          Những từ Heo đã học
        </p>
      </div>

      {/* ── Empty state ─────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-8 pt-8 pb-16">
        {/* Sample vocab card (decorative) */}
        <div
          className="relative w-full max-w-xs mb-10"
          style={{
            transform: "rotate(1.5deg)",
            boxShadow: "var(--polaroid-shadow)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {/* Tape */}
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
            <Tape color="butter" width={64} length={18} rotate={-2} />
          </div>

          <div
            className="p-5 pt-7"
            style={{ backgroundColor: "#FAF1EA" }}
          >
            <p
              className="text-2xl font-bold text-ink mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              excited
            </p>
            <p className="text-sm text-ink-soft mb-3">hào hứng / phấn khích</p>
            <div className="h-px bg-rose-200 mb-3" />
            <p
              className="text-sm italic text-ink-soft"
              style={{ fontFamily: "var(--font-body)" }}
            >
              &ldquo;I felt excited on the first day.&rdquo;
            </p>
            <p className="text-xs text-rose-400 mt-1">
              &ldquo;Heo cảm thấy hào hứng vào ngày đầu tiên.&rdquo;
            </p>
          </div>

          {/* Corner sticker */}
          <div className="absolute bottom-3 right-3 -rotate-12 opacity-50">
            <Sticker type="sparkle" size={20} />
          </div>
        </div>

        <Pig pose="thinking" size={80} animate />

        <p
          className="text-2xl font-bold text-ink text-center mt-6 mb-2"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("empty")}
        </p>
        <p className="text-sm text-ink-soft text-center mb-8">
          {t("emptyHint")}
        </p>

        <Link
          href="/heo/notebook/today"
          className="bg-rose-500 text-white text-sm font-semibold px-8 py-3.5 rounded-2xl"
          style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
        >
          Học từ mới hôm nay
        </Link>
      </div>

      {/* ── Decorative ──────────────────────────────────────── */}
      <div className="flex justify-center gap-5 pb-8 opacity-35">
        <Sticker type="pencil" size={22} />
        <Sticker type="book" size={22} />
        <Sticker type="star_filled" size={22} />
      </div>
    </div>
  );
}

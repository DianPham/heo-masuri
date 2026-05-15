/**
 * /heo/notebook/letter — Letters inbox (CP2 empty state)
 * Full letter threading (encouragements, vocab cards, replies) in CP9.
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

export default async function LetterPage() {
  const t = await getTranslations("notebook.letter");

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-6">
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="lilac" width={100} length={22} rotate={-1} />
        </div>
        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("title")}
        </h1>
        <p className="text-center text-sm text-ink-soft mt-1">
          Thư từ Masuri cho Heo
        </p>
      </div>

      {/* ── Empty state ─────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-8 pt-8 pb-16">
        {/* Decorative envelope */}
        <div
          className="relative w-44 h-36 mb-10 flex items-center justify-center rounded-2xl"
          style={{
            backgroundColor: "#EDE8F5",
            boxShadow: "var(--polaroid-shadow)",
            transform: "rotate(-2deg)",
          }}
        >
          {/* Tape */}
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
            <Tape color="lilac" width={56} length={16} rotate={1} />
          </div>

          {/* Envelope icon */}
          <div className="text-center">
            <span style={{ fontSize: 48 }}>💌</span>
          </div>

          {/* Corner stickers */}
          <div className="absolute -bottom-3 -left-3 -rotate-12 opacity-60">
            <Sticker type="heart_filled" size={20} />
          </div>
          <div className="absolute -top-2 -right-2 rotate-6 opacity-50">
            <Sticker type="sparkle" size={18} />
          </div>
        </div>

        <Pig pose="heart-eyes" size={72} animate />

        <p
          className="text-2xl font-bold text-ink text-center mt-6 mb-2"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("empty")}
        </p>
        <p className="text-sm text-ink-soft text-center mb-8 max-w-xs">
          {t("emptyHint")}
        </p>

        {/* Link back to home */}
        <Link
          href="/heo/notebook"
          className="text-rose-500 text-sm font-semibold underline underline-offset-2"
        >
          Quay lại sổ
        </Link>
      </div>

      {/* ── Decorative ──────────────────────────────────────── */}
      <div className="flex justify-center gap-5 pb-8 opacity-35">
        <Sticker type="letter" size={22} />
        <Sticker type="heart_outline" size={22} />
        <Sticker type="bow_pink" size={22} />
      </div>
    </div>
  );
}

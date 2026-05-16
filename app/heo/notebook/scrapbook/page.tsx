/**
 * /heo/notebook/scrapbook — Scrapbook history (CP2 empty state)
 * Shows empty state with sleepy pig when no completed pages exist.
 * Full polaroid grid is built in CP3 after the Stories renderer is in.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";

export const revalidate = 120;

const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default async function ScrapbookPage() {
  const t = await getTranslations("notebook.scrapbook");

  return (
    <div style={PAPER_BG} className="min-h-dvh">
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="relative px-5 pt-10 pb-6">
        {/* Tape header decoration */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <Tape color="pink" width={100} length={22} rotate={-1} />
        </div>

        <h1
          className="text-3xl font-bold text-ink text-center mt-4"
          style={{ fontFamily: "var(--font-handwritten)" }}
        >
          {t("title")}
        </h1>
        <p className="text-center text-sm text-ink-soft mt-1">
          Những trang Heo đã hoàn thành
        </p>
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center px-8 pt-12 pb-16">
        {/* Polaroid placeholder frame */}
        <div
          className="relative mb-10"
          style={{
            transform: "rotate(-3deg)",
            filter: "drop-shadow(var(--polaroid-shadow))",
          }}
        >
          <div
            className="w-52 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--polaroid-bg)", padding: "12px 12px 36px" }}
          >
            {/* Tape across top */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
              <Tape color="mint" width={64} length={18} rotate={2} />
            </div>
            {/* Image area */}
            <div
              className="w-full aspect-square rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "#FFE4EA" }}
            >
              <Pig pose="sleepy" size={88} animate={false} />
            </div>
            {/* Caption */}
            <p
              className="text-center text-xs text-ink-soft"
              style={{ fontFamily: "var(--font-handwritten)", fontSize: 14 }}
            >
              Chưa có trang nào...
            </p>
          </div>

          {/* Corner stickers */}
          <div className="absolute -bottom-3 -right-3 rotate-12">
            <Sticker type="flower_rose" size={24} />
          </div>
          <div className="absolute -top-2 -left-2 -rotate-6">
            <Sticker type="star_filled" size={20} />
          </div>
        </div>

        {/* Message */}
        <p
          className="text-2xl font-bold text-ink text-center mb-2"
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
          {t("openToday")}
        </Link>
      </div>

      {/* ── Decorative bottom stickers ────────────────────────── */}
      <div className="flex justify-center gap-5 pb-8 opacity-35">
        <Sticker type="sparkle" size={22} />
        <Sticker type="moon" size={22} />
        <Sticker type="flower_daisy" size={22} />
      </div>
    </div>
  );
}

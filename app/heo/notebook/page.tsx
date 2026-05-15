/**
 * /heo/notebook — Notebook home (CP2 shell)
 * Shows today's tile, streak, scrapbook/vocab/letter tiles.
 * No live DB calls yet — section is a visual shell until CP3.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Paper-dot grid background (CSS radial-gradient dots)
const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

export default async function HeoNotebookPage() {
  const t = await getTranslations("notebook.home");
  const tScrapbook = await getTranslations("notebook.scrapbook");
  const tVocab = await getTranslations("notebook.vocab");
  const tLetter = await getTranslations("notebook.letter");

  // Determine today's date in UTC+7
  const nowVN = new Date(Date.now() + 7 * 3_600_000);
  const todayLabel = nowVN.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-8 pt-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <Pig pose="studying" size={72} animate />
        <div>
          <h1
            className="text-2xl font-bold text-ink leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">{todayLabel}</p>
        </div>
      </div>

      {/* ── Streak bar (placeholder for CP3) ───────────────── */}
      <StreakBar />

      {/* ── Today's page tile ──────────────────────────────── */}
      <TodayTile openLabel={t("openToday")} todayLabel={t("todayLabel")} />

      {/* ── Section tiles ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <SectionTile
          href="/heo/notebook/scrapbook"
          emoji="📸"
          label={tScrapbook("title")}
          color="#FFE4EA"
          tapeColor="pink"
          rotate={-2}
        />
        <SectionTile
          href="/heo/notebook/vocab"
          emoji="📖"
          label={tVocab("title")}
          color="#FAF1EA"
          tapeColor="butter"
          rotate={1.5}
        />
        <SectionTile
          href="/heo/notebook/letter"
          emoji="💌"
          label={tLetter("title")}
          color="#EDE8F5"
          tapeColor="lilac"
          rotate={-1}
        />
        <SectionTile
          href="/heo/notebook/ask"
          emoji="❓"
          label="Hỏi Masuri"
          color="#E8F2E9"
          tapeColor="mint"
          rotate={2}
        />
      </div>

      {/* ── Decorative stickers ─────────────────────────────── */}
      <div className="flex justify-center gap-6 mt-10 opacity-40">
        <Sticker type="flower_rose" size={28} />
        <Sticker type="star_filled" size={24} />
        <Sticker type="sparkle" size={26} />
        <Sticker type="flower_daisy" size={28} />
      </div>
    </div>
  );
}

// ── Streak bar (no data yet — shows empty state) ─────────────
function StreakBar() {
  return (
    <div
      className="rounded-2xl px-5 py-4 mb-4 flex items-center gap-3"
      style={{ background: "rgba(255, 201, 213, 0.25)", border: "1px solid rgba(255, 201, 213, 0.5)" }}
    >
      <span style={{ fontSize: 22 }}>🔥</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">Streak: 0 ngày</p>
        <p className="text-xs text-ink-soft">Hôm nay mình bắt đầu nha 🌸</p>
      </div>
      {/* Hearts row */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <span key={i} style={{ fontSize: 14, opacity: 0.25 }}>🤍</span>
        ))}
      </div>
    </div>
  );
}

// ── Today's page tile ─────────────────────────────────────────
function TodayTile({ openLabel, todayLabel }: { openLabel: string; todayLabel: string }) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden mb-4"
      style={{
        background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Tape decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Tape color="butter" width={64} length={18} rotate={-3} />
      </div>

      <div className="px-6 pt-8 pb-6 flex items-center gap-5">
        {/* Pig */}
        <div className="shrink-0">
          <Pig pose="studying" size={80} animate />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">
            {todayLabel}
          </p>
          <p
            className="text-xl font-bold text-ink mb-4 leading-snug"
            style={{ fontFamily: "var(--font-handwritten)" }}
          >
            Trang hôm nay đang chờ Heo 📓
          </p>
          <Link
            href="/heo/notebook/today"
            className="inline-flex items-center gap-2 bg-rose-500 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl"
            style={{ boxShadow: "0 4px 12px rgba(209,77,111,0.35)" }}
          >
            {openLabel}
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Section tile ──────────────────────────────────────────────
function SectionTile({
  href,
  emoji,
  label,
  color,
  tapeColor,
  rotate,
  dimmed = false,
}: {
  href: string;
  emoji: string;
  label: string;
  color: string;
  tapeColor: "pink" | "mint" | "butter" | "lilac";
  rotate: number;
  dimmed?: boolean;
}) {
  const content = (
    <div
      className="relative rounded-2xl p-5 h-32 flex flex-col justify-between overflow-hidden"
      style={{
        backgroundColor: color,
        boxShadow: "var(--polaroid-shadow)",
        opacity: dimmed ? 0.55 : 1,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center center",
      }}
    >
      {/* Tape across top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[40%]">
        <Tape color={tapeColor} width={52} length={14} rotate={0} />
      </div>

      <span style={{ fontSize: 28 }} className="mt-2">{emoji}</span>
      <p
        className="text-sm font-bold text-ink leading-snug"
        style={{ fontFamily: "var(--font-handwritten)", fontSize: 15 }}
      >
        {label}
      </p>
    </div>
  );

  if (dimmed || href === "#") {
    return <div className="cursor-default">{content}</div>;
  }

  return (
    <Link href={href} className="block active:scale-[0.97] transition-transform duration-100">
      {content}
    </Link>
  );
}

/**
 * /masuri/notebook — Masuri's notebook dashboard (CP2 shell)
 * Shows Heo's learning status, actions for Masuri, draft review entry.
 * Live data (streak, activity, unread asks) wired in CP3+.
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

export default async function MasuriNotebookPage() {
  const t = await getTranslations("notebook.home");

  return (
    <div style={PAPER_BG} className="min-h-dvh px-5 pb-8 pt-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <Pig pose="cheering" size={72} animate />
        <div>
          <h1
            className="text-2xl font-bold text-ink leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("masuriTitle")}
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">{t("masuriSubtitle")}</p>
        </div>
      </div>

      {/* ── Today's status card ─────────────────────────────── */}
      <StatusCard />

      {/* ── Draft review ────────────────────────────────────── */}
      <SectionCard
        tape="pink"
        title="Cần duyệt"
        icon="📝"
        rotate={-0.5}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink font-medium">Trang ngày mai</p>
            <p className="text-xs text-ink-soft mt-0.5">Chưa có trang nào cần duyệt</p>
          </div>
          {/* Will link to /masuri/notebook/review once CP7 builds it */}
          <span className="text-xs text-rose-400 font-medium opacity-50">CP7</span>
        </div>
      </SectionCard>

      {/* ── Quick actions ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 mb-4"
        style={{
          backgroundColor: "#FAF1EA",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Tape color="butter" width={48} length={14} rotate={-2} />
          <h2 className="text-base font-bold text-ink ml-2">Hành động nhanh</h2>
        </div>

        <div className="flex flex-col gap-3">
          <QuickAction
            href="#"
            emoji="🃏"
            label={t("writeCard")}
            dimmed
            note="CP7"
          />
          <QuickAction
            href="#"
            emoji="💕"
            label={t("sendEncouragement")}
            dimmed
            note="CP7"
          />
          <QuickAction
            href="#"
            emoji="📊"
            label={t("viewProgress")}
            dimmed
            note="CP7"
          />
        </div>
      </div>

      {/* ── Ask Masuri inbox ───────────────────────────────── */}
      <SectionCard
        tape="mint"
        title="Câu hỏi của Heo"
        icon="❓"
        rotate={0.5}
      >
        <p className="text-sm text-ink-soft">Chưa có câu hỏi nào — Heo đang học tốt 🌸</p>
      </SectionCard>

      {/* ── Decorative stickers ─────────────────────────────── */}
      <div className="flex justify-center gap-6 mt-8 opacity-35">
        <Sticker type="star_filled" size={24} />
        <Sticker type="sparkle" size={22} />
        <Sticker type="flower_rose" size={26} />
      </div>
    </div>
  );
}

// ── Today status card ─────────────────────────────────────────
function StatusCard() {
  return (
    <div
      className="rounded-2xl p-5 mb-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FFC9D5 0%, #F8A8BC 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="absolute top-[-8px] right-6">
        <Tape color="pink" width={56} length={16} rotate={-3} />
      </div>

      <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-3">
        HÔM NAY
      </p>

      <div className="space-y-2">
        <StatusRow icon="📓" text="Chưa mở trang hôm nay" dim />
        <StatusRow icon="🔥" text="Streak: 0 ngày" />
      </div>
    </div>
  );
}

function StatusRow({ icon, text, dim = false }: { icon: string; text: string; dim?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${dim ? "opacity-55" : ""}`}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <p className="text-sm font-medium text-ink">{text}</p>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────
function SectionCard({
  tape,
  title,
  icon,
  rotate,
  children,
}: {
  tape: "pink" | "mint" | "butter" | "lilac";
  title: string;
  icon: string;
  rotate: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "var(--shadow)",
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center center",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <Tape color={tape} width={48} length={14} rotate={rotate * -1} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Quick action row ──────────────────────────────────────────
function QuickAction({
  href,
  emoji,
  label,
  dimmed = false,
  note,
}: {
  href: string;
  emoji: string;
  label: string;
  dimmed?: boolean;
  note?: string;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl ${dimmed ? "opacity-45" : "bg-rose-50"}`}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      {note && <span className="text-xs text-rose-300 font-medium">{note}</span>}
      {!dimmed && <span className="text-rose-400 text-sm">→</span>}
    </div>
  );

  if (dimmed || href === "#") {
    return <div className="cursor-default">{inner}</div>;
  }

  return (
    <Link href={href} className="block active:scale-[0.98] transition-transform duration-100">
      {inner}
    </Link>
  );
}

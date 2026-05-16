/**
 * /heo/notebook — Notebook home (CP8: streak rest days + settings tile)
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Pig } from "@/components/theme/Pig";
import { Sticker } from "@/components/notebook/Sticker";
import { Tape } from "@/components/notebook/Tape";
import { createServerClient } from "@/lib/supabase/server";
import { UseRestButton } from "@/components/notebook/UseRestButton";

export const revalidate = 60;

async function fetchLetterNudge(): Promise<{ hasLetterThisWeek: boolean; isSunday: boolean }> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { hasLetterThisWeek: false, isSunday: false };

    const nowVN = new Date(Date.now() + 7 * 3_600_000);
    const isSunday = nowVN.getUTCDay() === 0;

    // Monday of the current ISO week (Mon=1 … Sun=0 treated as 7)
    const dayOfWeek = nowVN.getUTCDay() || 7; // 1=Mon … 7=Sun
    const mondayUTC = new Date(nowVN);
    mondayUTC.setUTCDate(nowVN.getUTCDate() - (dayOfWeek - 1));
    mondayUTC.setUTCHours(0, 0, 0, 0);

    const { data: letters } = await supabase
      .from("letters")
      .select("id")
      .eq("from_user", heo.id)
      .in("kind", ["weekly_letter", "two_truths"])
      .gte("created_at", mondayUTC.toISOString())
      .limit(1);

    return { hasLetterThisWeek: (letters?.length ?? 0) > 0, isSunday };
  } catch {
    return { hasLetterThisWeek: false, isSunday: false };
  }
}

// Paper-dot grid background
const PAPER_BG = {
  backgroundImage:
    "radial-gradient(circle, var(--paper-grid) 1.2px, transparent 1.2px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#FFF9F5",
} as React.CSSProperties;

type StreakData = {
  current: number;
  longest: number;
  activeToday: boolean;
  restDays: number;
};

async function fetchStreak(): Promise<StreakData> {
  try {
    const supabase = createServerClient();
    const { data: heo } = await supabase.from("users").select("id").eq("slug", "heo").single();
    if (!heo) return { current: 0, longest: 0, activeToday: false, restDays: 1 };

    const { data } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining")
      .eq("user_id", heo.id)
      .maybeSingle();

    const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    return {
      current: data?.current_streak ?? 0,
      longest: data?.longest_streak ?? 0,
      activeToday: data?.last_active_date === todayVN,
      restDays: data?.rest_days_remaining ?? 1,
    };
  } catch {
    return { current: 0, longest: 0, activeToday: false, restDays: 1 };
  }
}

export default async function HeoNotebookPage() {
  const t = await getTranslations("notebook.home");
  const tScrapbook = await getTranslations("notebook.scrapbook");
  const tVocab = await getTranslations("notebook.vocab");
  const tLetter = await getTranslations("notebook.letter");

  const streak = await fetchStreak();
  const letterNudge = await fetchLetterNudge();

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

      {/* ── Streak bar ─────────────────────────────────────── */}
      <StreakBar {...streak} />

      {/* ── Today's page tile ──────────────────────────────── */}
      <TodayTile openLabel={t("openToday")} todayLabel={t("todayLabel")} />

      {/* ── Letter nudge (Sunday or unsent this week) ──────── */}
      {(letterNudge.isSunday || !letterNudge.hasLetterThisWeek) && (
        <LetterNudgeCard hasLetterThisWeek={letterNudge.hasLetterThisWeek} isSunday={letterNudge.isSunday} />
      )}

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

      {/* ── Settings link ───────────────────────────────────── */}
      <Link
        href="/heo/notebook/settings"
        className="flex items-center gap-2 mt-5 px-4 py-3 rounded-2xl text-sm text-ink-soft"
        style={{
          backgroundColor: "rgba(255,249,245,0.9)",
          border: "1px solid rgba(255,201,213,0.3)",
        }}
      >
        <span>⚙️</span>
        <span className="flex-1">Cài đặt thông báo & chủ đề</span>
        <span className="text-xs opacity-50">→</span>
      </Link>

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

// ── Streak bar ────────────────────────────────────────────────
function StreakBar({
  current,
  longest,
  activeToday,
  restDays,
}: StreakData) {
  // Clamp hearts to 7 max display
  const filledHearts = Math.min(current, 7);
  const totalHearts = 7;

  const subtext = activeToday
    ? "Hôm nay đã học rồi 🌸"
    : current === 0
    ? "Hôm nay mình bắt đầu nha 🌸"
    : "Học hôm nay để giữ streak nha!";

  return (
    <div
      className="rounded-2xl px-5 py-4 mb-4"
      style={{
        background: "rgba(255, 201, 213, 0.25)",
        border: "1px solid rgba(255, 201, 213, 0.5)",
      }}
    >
      {/* Top row — flame + streak count + hearts */}
      <div className="flex items-center gap-3 mb-2">
        <span style={{ fontSize: 22 }}>🔥</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">
            Streak: {current} ngày
            {longest > 1 && current === longest && (
              <span className="ml-1.5 text-xs text-rose-400 font-medium">(kỷ lục!)</span>
            )}
          </p>
          <p className="text-xs text-ink-soft">{subtext}</p>
        </div>
        {/* Heart dots — current streak vs max 7 */}
        <div className="flex gap-0.5">
          {[...Array(totalHearts)].map((_, i) => (
            <span key={i} style={{ fontSize: 12, opacity: i < filledHearts ? 1 : 0.18 }}>
              {i < filledHearts ? "🩷" : "🤍"}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom row — best streak + rest day flowers */}
      <div className="flex items-center justify-between">
        {longest > 0 && (
          <p className="text-xs text-ink-soft">
            Kỷ lục: <span className="font-semibold text-ink">{longest} ngày</span>
          </p>
        )}

        {/* Rest day flowers + use-rest button */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Only show "Heo nghỉ" button if not already active today and has rest days */}
          {!activeToday && restDays > 0 ? (
            <UseRestButton restDays={restDays} />
          ) : restDays > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-ink-soft">Phép nghỉ:</span>
              {[...Array(restDays)].map((_, i) => (
                <span key={i} style={{ fontSize: 14 }}>🌸</span>
              ))}
            </div>
          ) : null}
        </div>
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Tape color="butter" width={64} length={18} rotate={-3} />
      </div>

      <div className="px-6 pt-8 pb-6 flex items-center gap-5">
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

// ── Letter nudge card ─────────────────────────────────────────
function LetterNudgeCard({
  hasLetterThisWeek,
  isSunday,
}: {
  hasLetterThisWeek: boolean;
  isSunday: boolean;
}) {
  if (hasLetterThisWeek) return null;

  const message = isSunday
    ? "Chủ nhật rồi — viết thư cho Masuri nha Heo 💌"
    : "Tuần này Heo chưa gửi thư cho Masuri 🌸";

  return (
    <Link
      href="/heo/notebook/letter/write"
      className="flex items-center gap-4 rounded-2xl px-4 py-4 mb-4 active:scale-[0.98] transition-transform"
      style={{
        backgroundColor: "rgba(237,232,245,0.7)",
        border: "1px solid rgba(196,168,220,0.5)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span style={{ fontSize: 32 }}>💌</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-snug">{message}</p>
        <p className="text-xs text-purple-500 mt-0.5 font-medium">Viết thư ngay →</p>
      </div>
    </Link>
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

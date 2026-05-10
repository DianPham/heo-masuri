export const dynamic = "force-dynamic";

import { getLocale } from "next-intl/server";
import { createServerClient } from "@/lib/supabase/server";
import { daysUntil, progressPercent } from "@/lib/tz";
import Link from "next/link";
import { Pig } from "@/components/theme/Pig";
import { ThinkingButtons } from "@/components/buttons/ThinkingButtons";
import { Countdown } from "@/components/countdown/Countdown";

export default async function MasuriHome() {
  const locale = await getLocale();
  let reunion: { label: string; label_en: string | null; target_date: string; created_at: string } | null = null;

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("reunion_dates")
      .select("label, label_en, target_date, created_at")
      .eq("is_current", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    reunion = data;
  } catch {
    // env vars not set
  }

  const targetMs = reunion ? new Date(reunion.target_date + "T00:00:00+07:00").getTime() : null;
  const now = Date.now();
  // Same 4-phase flow as Heo: countdown → celebrate → wait → default (create countdown)
  const showCountdown = reunion !== null && targetMs !== null && now < targetMs;
  const isCelebrating = targetMs !== null && now >= targetMs && now < targetMs + 86_400_000;
  const isWaiting     = targetMs !== null && now >= targetMs + 86_400_000 && now < targetMs + 172_800_000;
  const showDefault   = !showCountdown && !isCelebrating && !isWaiting;

  return (
    <div className="flex flex-col items-center px-5 min-h-[calc(100dvh-96px)]">

      {/* ── Countdown ── */}
      {showCountdown && (
        <div className="pt-8 pb-2 w-full flex flex-col items-center gap-2">
          <Countdown
            daysLeft={daysUntil(reunion!.target_date)}
            label={reunion!.label}
            labelEn={reunion!.label_en}
            progressPercent={progressPercent(reunion!.created_at, reunion!.target_date)}
            who="masuri"
          />
          <Link
            href="/masuri/reunion"
            className="font-accent text-base text-ink-soft/40 hover:text-rose-400 transition-colors"
          >
            {locale === "vi" ? "chỉnh sửa ✎" : "edit ✎"}
          </Link>
        </div>
      )}

      {/* ── Celebration: day of reunion ── */}
      {isCelebrating && (
        <div className="pt-8 pb-2 w-full flex flex-col items-center gap-3">
          <Pig pose="sparkle" size={96} animate={false} />
          <p className="font-accent text-base text-rose-400 font-semibold text-center">
            Hôm nay mình gặp nhau rồi 🎉
          </p>
          <Link
            href="/masuri/reunion"
            className="font-accent text-base text-ink-soft/40 hover:text-rose-400 transition-colors"
          >
            {locale === "vi" ? "chỉnh sửa ✎" : "edit ✎"}
          </Link>
        </div>
      )}

      {/* ── Wait: day after reunion ── */}
      {isWaiting && (
        <div className="pt-8 pb-2 w-full flex flex-col items-center gap-3">
          <p className="font-accent text-base text-rose-300 text-center">
            Hôm qua mình đã ở bên nhau 💕
          </p>
          <Pig pose="sleepy" size={72} animate={false} />
          <p className="font-accent text-sm text-ink-soft/60 text-center">
            Đang đợi ngày kế tiếp nha 🌸
          </p>
          <Link
            href="/masuri/reunion"
            className="font-accent text-base font-semibold text-rose-400 hover:text-rose-500 transition-colors mt-1"
          >
            + {locale === "vi" ? "Tạo countdown mới" : "Create new countdown"}
          </Link>
        </div>
      )}

      {/* ── Default: no active countdown (or expired >48h) ── */}
      {showDefault && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <Pig pose="sparkle" size={120} />
          <div className="space-y-2">
            <h1
              className="font-display text-4xl text-ink italic"
              style={{ fontVariationSettings: "'opsz' 72" }}
            >
              Chào Masuri 💕
            </h1>
            <p className="font-accent text-base text-ink-soft">
              {locale === "vi" ? "Gửi yêu thương đến Heo nào" : "Send your love to Heo"}
            </p>
            <Link
              href="/masuri/reunion"
              className="inline-block font-accent text-base font-semibold text-rose-400 hover:text-rose-500 transition-colors mt-1"
            >
              + {locale === "vi" ? "Tạo countdown" : "Create countdown"}
            </Link>
          </div>
        </div>
      )}

      {/* ── ThinkingButtons: below header states ── */}
      {(showCountdown || isCelebrating || isWaiting) && (
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-4">
          <span className="font-accent text-base text-rose-300/80">
            {locale === "vi" ? "gửi yêu thương ♡" : "send your love ♡"}
          </span>
          <ThinkingButtons who="masuri" locale={locale} />
        </div>
      )}

      {/* ── Love bar (default state only) ── */}
      {showDefault && (
        <div className="w-full pb-8 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <div className="flex-1 h-px bg-rose-200/70" />
            <span className="font-accent text-base text-rose-300/90">
              {locale === "vi" ? "gửi thêm ♡" : "send more ♡"}
            </span>
            <div className="flex-1 h-px bg-rose-200/70" />
          </div>
          <ThinkingButtons who="masuri" locale={locale} />
        </div>
      )}

    </div>
  );
}

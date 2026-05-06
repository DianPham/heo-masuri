export const dynamic = "force-dynamic";

import { createServerClient } from "@/lib/supabase/server";
import { startOfDayVN, endOfDayVN, daysUntil, progressPercent } from "@/lib/tz";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { MissingButton } from "@/components/buttons/MissingButton";
import { ThinkingButtons } from "@/components/buttons/ThinkingButtons";
import { Countdown } from "@/components/countdown/Countdown";
import { Pig } from "@/components/theme/Pig";

export default async function HeoHome() {
  const locale = await getLocale();
  let countToday = 0;
  let reunion: { label: string; label_en: string | null; target_date: string; created_at: string } | null = null;

  try {
    const supabase = createServerClient();
    const [{ data: user }, { data: reunionData }] = await Promise.all([
      supabase.from("users").select("id").eq("slug", "heo").single(),
      supabase
        .from("reunion_dates")
        .select("label, label_en, target_date, created_at")
        .eq("is_current", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

    if (user) {
      const { count } = await supabase
        .from("missing_signals")
        .select("id", { count: "exact", head: true })
        .eq("from_user", user.id)
        .gte("created_at", startOfDayVN().toISOString())
        .lte("created_at", endOfDayVN().toISOString());
      countToday = count ?? 0;
    }

    reunion = reunionData;
  } catch {
    // env vars not set
  }

  const daysLeft = reunion ? daysUntil(reunion.target_date) : null;
  const targetMs = reunion ? new Date(reunion.target_date + "T00:00:00+07:00").getTime() : null;
  const isYesterday = targetMs !== null && Date.now() > targetMs && Date.now() <= targetMs + 24 * 60 * 60 * 1000;
  const showCountdown = reunion && !isYesterday;

  return (
    <div className="flex flex-col items-center px-5 min-h-[calc(100dvh-96px)]">

      {/* ── Countdown ── */}
      {showCountdown && (
        <div className="pt-8 pb-2 w-full flex justify-center">
          <Countdown
            daysLeft={daysLeft!}
            label={reunion!.label}
            labelEn={reunion!.label_en}
            progressPercent={progressPercent(reunion!.created_at, reunion!.target_date)}
            who="heo"
          />
        </div>
      )}

      {/* ── Yesterday grace banner ── */}
      {isYesterday && (
        <div className="pt-8 pb-2 w-full flex justify-center">
          <p className="font-accent text-base text-rose-400 text-center">
            Hôm qua mình đã ở bên nhau 💕
          </p>
        </div>
      )}

      {/* ── No upcoming reunion ── */}
      {!reunion && (
        <div className="pt-8 pb-2 w-full flex flex-col items-center gap-2">
          <Pig pose="sleepy" size={56} animate={false} />
          <p className="font-accent text-sm text-ink-soft/60 text-center">
            Đang đợi ngày kế tiếp nha 🌸
          </p>
        </div>
      )}

      {/* ── Hero: Missing button ── */}
      <div className="flex-1 flex items-center justify-center w-full">
        <MissingButton initialCountToday={countToday} />
      </div>

      {/* ── Love bar ── */}
      <div className="w-full pb-8 flex flex-col gap-3">

        {/* Divider with handwritten label */}
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 h-px bg-rose-200/70" />
          <span className="font-accent text-base text-rose-300/90">
            {locale === "vi" ? "gửi thêm ♡" : "send more ♡"}
          </span>
          <div className="flex-1 h-px bg-rose-200/70" />
        </div>

        {/* Equal-width quick-send buttons */}
        <ThinkingButtons who="heo" locale={locale} />

        {/* "Not okay" — now a proper soft button, not a ghost link */}
        <Link
          href="/heo/angry"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                     bg-rose-100/60 border-2 border-rose-200/60 transition-all duration-200
                     hover:bg-rose-200/50 hover:border-rose-300 active:scale-[0.98]"
          style={{ boxShadow: "0 2px 10px -4px rgba(168,50,79,0.10)" }}
        >
          <span className="text-base">🌧</span>
          <span className="font-accent text-base text-rose-400/90">
            {locale === "vi" ? "Heo đang không ổn..." : "Heo's not okay..."}
          </span>
        </Link>

      </div>
    </div>
  );
}

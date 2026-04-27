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

  return (
    <div className="flex flex-col items-center px-5 min-h-[calc(100dvh-96px)]">

      {reunion ? (
        <>
          {/* ── Countdown at top ── */}
          <div className="pt-8 pb-2 w-full flex flex-col items-center gap-2">
            <Countdown
              daysLeft={daysUntil(reunion.target_date)}
              label={reunion.label}
              labelEn={reunion.label_en}
              progressPercent={progressPercent(reunion.created_at, reunion.target_date)}
              who="masuri"
            />
            <Link
              href="/masuri/reunion"
              className="font-accent text-sm text-ink-soft/40 hover:text-rose-400 transition-colors"
            >
              {locale === "vi" ? "chỉnh sửa ✎" : "edit ✎"}
            </Link>
          </div>

          {/* ── ThinkingButtons vertically centred in remaining space ── */}
          <div className="flex-1 flex flex-col items-center justify-center w-full gap-4">
            <span className="font-accent text-base text-rose-300/80">
              {locale === "vi" ? "gửi yêu thương ♡" : "send your love ♡"}
            </span>
            <ThinkingButtons who="masuri" locale={locale} />
          </div>
        </>
      ) : (
        <>
          {/* ── Welcome state: no countdown ── */}
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

          {/* ── Love bar at bottom ── */}
          <div className="w-full pb-8 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-rose-200/70" />
              <span className="font-accent text-sm text-rose-300/90">
                {locale === "vi" ? "gửi thêm ♡" : "send more ♡"}
              </span>
              <div className="flex-1 h-px bg-rose-200/70" />
            </div>
            <ThinkingButtons who="masuri" locale={locale} />
          </div>
        </>
      )}

    </div>
  );
}

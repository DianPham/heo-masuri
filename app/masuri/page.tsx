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
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-96px)] px-8 gap-8">
      {reunion ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <Countdown
            daysLeft={daysUntil(reunion.target_date)}
            label={reunion.label}
            labelEn={reunion.label_en}
            progressPercent={progressPercent(reunion.created_at, reunion.target_date)}
            who="masuri"
          />
          <Link
            href="/masuri/reunion"
            className="font-body text-xs text-ink-soft/40 hover:text-ink-soft transition-colors mt-1"
          >
            {locale === "vi" ? "Chỉnh sửa" : "Edit"}
          </Link>
        </div>
      ) : (
        <>
          <Pig pose="sparkle" size={120} />
          <div className="space-y-2 text-center">
            <h1
              className="font-display text-4xl text-ink italic"
              style={{ fontVariationSettings: "'opsz' 72" }}
            >
              Chào Masuri 💕
            </h1>
            <p className="font-body text-ink-soft text-sm">
              {locale === "vi" ? "Gửi yêu thương đến Heo nào" : "Send your love to Heo"}
            </p>
            <Link
              href="/masuri/reunion"
              className="block font-body text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors mt-1"
            >
              + {locale === "vi" ? "Tạo countdown" : "Create countdown"}
            </Link>
          </div>
        </>
      )}

      <ThinkingButtons who="masuri" locale={locale} />
    </div>
  );
}

import { createServerClient } from "@/lib/supabase/server";
import { startOfDayVN, endOfDayVN, daysUntil, progressPercent } from "@/lib/tz";
import { getLocale } from "next-intl/server";
import { MissingButton } from "@/components/buttons/MissingButton";
import { ThinkingButtons } from "@/components/buttons/ThinkingButtons";
import { Countdown } from "@/components/countdown/Countdown";

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

  return (
    <div className="flex flex-col items-center px-8 min-h-[calc(100dvh-96px)]">
      {reunion && (
        <div className="pt-10 pb-2 w-full flex justify-center">
          <Countdown
            daysLeft={daysUntil(reunion.target_date)}
            label={reunion.label}
            labelEn={reunion.label_en}
            progressPercent={progressPercent(reunion.created_at, reunion.target_date)}
            who="heo"
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center w-full">
        <MissingButton initialCountToday={countToday} />
      </div>

      <div className="pb-10 w-full flex flex-col items-center gap-3">
        <p className="font-body text-xs text-ink-soft/60 uppercase tracking-widest">
          {locale === "vi" ? "Gửi nhanh" : "Quick send"}
        </p>
        <ThinkingButtons who="heo" locale={locale} />
      </div>
    </div>
  );
}

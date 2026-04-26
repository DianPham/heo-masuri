import { createServerClient } from "@/lib/supabase/server";
import { startOfDayVN, endOfDayVN } from "@/lib/tz";
import { getLocale } from "next-intl/server";
import { MissingButton } from "@/components/buttons/MissingButton";
import { ThinkingButtons } from "@/components/buttons/ThinkingButtons";

export default async function HeoHome() {
  const locale = await getLocale();
  let countToday = 0;

  try {
    const supabase = createServerClient();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();

    if (user) {
      const { count } = await supabase
        .from("missing_signals")
        .select("id", { count: "exact", head: true })
        .eq("from_user", user.id)
        .gte("created_at", startOfDayVN().toISOString())
        .lte("created_at", endOfDayVN().toISOString());
      countToday = count ?? 0;
    }
  } catch {
    // Env vars not set — start at 0
  }

  return (
    <div className="flex flex-col items-center px-8 min-h-[calc(100dvh-96px)]">
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

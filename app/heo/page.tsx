import { createServerClient } from "@/lib/supabase/server";
import { startOfDayVN, endOfDayVN } from "@/lib/tz";
import { MissingButton } from "@/components/buttons/MissingButton";

export default async function HeoHome() {
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-96px)] px-8">
      <MissingButton initialCountToday={countToday} />
    </div>
  );
}

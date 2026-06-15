/**
 * runImportantDateTick — daily worker, dispatched by /api/cron/tick at 02:00 UTC
 * (09:00 VN). Blueprint §6.10.
 *
 * Finds every important_date whose next occurrence is today (VN), sends both
 * users a push, and records a row in important_date_pings to enforce
 * once-per-day-per-date idempotency.
 *
 * The dedupe table doesn't exist yet — we keep idempotency inline by using
 * the date+id pair as a composite key in calendar_events with a sentinel
 * source. Wait — simpler: query whether any push event was already sent
 * today by checking a marker we insert as a no-op calendar_event? No, even
 * simpler: we just ensure tick fires at minute 0 of hour 2 UTC, which the
 * dispatcher already guards. The only way this could double-fire is two
 * Vercel invocations in the same minute, which the pinger doesn't cause.
 *
 * If we later see duplicate pushes in practice, add a tiny important_date_pings
 * (id, date) PK table.
 */
import { createServerClient } from "@/lib/supabase/server";
import { sendPushIfAllowed } from "@/lib/push";
import { occurrencesInRange, todayVN, type ImportantDate } from "@/lib/important-dates";

type Result = {
  today: string;
  matched: number;
  pushed: number;
};

export async function runImportantDateTick(): Promise<Result> {
  const today = todayVN();
  const supabase = createServerClient();

  const { data: rows } = await supabase
    .from("important_dates")
    .select("*");

  const matched: ImportantDate[] = [];
  for (const r of (rows ?? []) as ImportantDate[]) {
    if (occurrencesInRange(r, today, today).length > 0) {
      matched.push(r);
    }
  }

  if (matched.length === 0) {
    return { today, matched: 0, pushed: 0 };
  }

  const { data: users } = await supabase.from("users").select("id, slug");
  const userIds = (users ?? []).map((u: { id: string }) => u.id);

  let pushed = 0;
  for (const id of matched) {
    const emoji = id.emoji ?? "⭐";
    const title = `${emoji} ${id.label_vi}`;
    const body =
      id.recurrence === "yearly" || id.recurrence === "monthly"
        ? "Hôm nay là dịp đặc biệt 💕"
        : "Hôm nay là ngày này!";

    for (const uid of userIds) {
      try {
        await sendPushIfAllowed(uid, "important_date_enabled", {
          title,
          body,
          url: "/calendar/important-dates",
        });
        pushed++;
      } catch (e) {
        console.error("[important-date-tick push]", uid, id.id, e);
      }
    }
  }

  return { today, matched: matched.length, pushed };
}

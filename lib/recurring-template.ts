/**
 * Recurring template apply logic. Blueprint §6.6.
 *
 * Shared by /api/calendar/recurring-template/apply and apply-forward.
 *
 * Apply semantics (idempotent per week):
 *   1. Delete all `calendar_events` for this user in [mondayUtc, mondayUtc+7d)
 *      with source='recurring_template' AND source_ref=user_id.
 *   2. Insert one row per range per day per the current template jsonb.
 *
 * source_ref is the user_id (the template is keyed by user_id, so its "id"
 * is just the user's id).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/types/database";

type Range = { start_minute: number; end_minute: number };
type TemplateShape = Range[][];

/** Convert "YYYY-MM-DD" VN to the UTC ms of that VN midnight. */
export function mondayVnMsFromIso(monday: string): number {
  return (
    Date.UTC(
      Number(monday.slice(0, 4)),
      Number(monday.slice(5, 7)) - 1,
      Number(monday.slice(8, 10))
    ) - 7 * 3_600_000
  );
}

/**
 * Apply the template to a single week.
 * Returns the inserted row count.
 */
export async function applyTemplateToWeek(
  supabase: SupabaseClient<Database>,
  userId: string,
  template: TemplateShape,
  monday: string
): Promise<{ inserted: number; deleted: number }> {
  const mondayVnMs = mondayVnMsFromIso(monday);
  const fromIso = new Date(mondayVnMs).toISOString();
  const toIso = new Date(mondayVnMs + 7 * 86_400_000).toISOString();

  // 1) purge prior template events for this week
  const { data: doomed } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("owner", userId)
    .eq("source", "recurring_template")
    .eq("source_ref", userId)
    .gte("start_at", fromIso)
    .lt("start_at", toIso);
  const deleted = doomed?.length ?? 0;
  if (deleted > 0) {
    await supabase
      .from("calendar_events")
      .delete()
      .in("id", doomed!.map((d) => d.id));
  }

  // 2) build inserts
  const rows: TablesInsert<"calendar_events">[] = [];
  for (let day = 0; day < 7; day++) {
    const dayStartMs = mondayVnMs + day * 86_400_000;
    for (const r of template[day] ?? []) {
      rows.push({
        owner: userId,
        start_at: new Date(dayStartMs + r.start_minute * 60_000).toISOString(),
        end_at: new Date(dayStartMs + r.end_minute * 60_000).toISOString(),
        source: "recurring_template",
        source_ref: userId,
        share_details: false,
      });
    }
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(rows)
      .select("id");
    if (error) throw error;
    inserted = data?.length ?? 0;
  }
  return { inserted, deleted };
}

/** Does any template-sourced event already exist for this user in this week? */
export async function weekIsTemplated(
  supabase: SupabaseClient<Database>,
  userId: string,
  monday: string
): Promise<boolean> {
  const mondayVnMs = mondayVnMsFromIso(monday);
  const fromIso = new Date(mondayVnMs).toISOString();
  const toIso = new Date(mondayVnMs + 7 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("owner", userId)
    .eq("source", "recurring_template")
    .eq("source_ref", userId)
    .gte("start_at", fromIso)
    .lt("start_at", toIso)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Add N weeks to a YYYY-MM-DD VN monday. */
export function addWeeksVn(monday: string, weeks: number): string {
  const ms = Date.UTC(
    Number(monday.slice(0, 4)),
    Number(monday.slice(5, 7)) - 1,
    Number(monday.slice(8, 10))
  );
  return new Date(ms + weeks * 7 * 86_400_000).toISOString().slice(0, 10);
}

/**
 * POST /api/calendar/recurring-template/apply-forward
 *
 * Body: { weeks?: number }  — default 4. Applies the template forward N weeks
 * starting from this week, SKIPPING weeks that already have any
 * recurring_template events for this user.
 *
 * "Won't recreate the next 4 weeks of busy if they already exist" — blueprint
 * §6.6 ("creates events for the next 4 weeks for any week not yet templated").
 *
 * Returns { processed: Array<{ monday, applied }> }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import {
  applyTemplateToWeek,
  addWeeksVn,
  weekIsTemplated,
} from "@/lib/recurring-template";

export const dynamic = "force-dynamic";

function thisWeekMondayVN(): string {
  const nowVn = new Date(Date.now() + 7 * 3_600_000);
  const dow = nowVn.getUTCDay() || 7;
  const m = new Date(nowVn);
  m.setUTCDate(nowVn.getUTCDate() - (dow - 1));
  return m.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const weeks = Number.isInteger(body.weeks) && body.weeks > 0 && body.weeks <= 12 ? body.weeks : 4;

  const supabase = createTypedServerClient();
  const { data: tpl } = await supabase
    .from("recurring_schedule_template")
    .select("template")
    .eq("user_id", viewerId)
    .maybeSingle();

  if (!tpl) {
    return NextResponse.json({ error: "no template saved yet" }, { status: 404 });
  }

  const template = tpl.template as { start_minute: number; end_minute: number }[][];
  const processed: Array<{ monday: string; applied: boolean; inserted?: number }> = [];
  let monday = thisWeekMondayVN();
  for (let i = 0; i < weeks; i++) {
    const already = await weekIsTemplated(supabase, viewerId, monday);
    if (already) {
      processed.push({ monday, applied: false });
    } else {
      try {
        const { inserted } = await applyTemplateToWeek(supabase, viewerId, template, monday);
        processed.push({ monday, applied: true, inserted });
      } catch (e) {
        console.error("[apply-forward week]", monday, e);
        processed.push({ monday, applied: false });
      }
    }
    monday = addWeeksVn(monday, 1);
  }

  return NextResponse.json({ processed });
}

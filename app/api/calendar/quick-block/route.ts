/**
 * POST /api/calendar/quick-block
 *
 * Implements the Quick-block FAB (blueprint §6.4): block off a [span × period]
 * combination for the viewer in one call.
 *
 * Body:
 *   {
 *     span:   'today' | 'tomorrow' | 'this_week',
 *     period: 'morning' | 'afternoon' | 'evening' | 'late' | 'all_day' | 'custom',
 *     custom?: { start_minute: number, end_minute: number }   // when period='custom'
 *   }
 *
 * Returns: { events: VisibleEvent[] }  — all events created.
 *
 * Notes:
 *  - Times interpreted in Asia/Ho_Chi_Minh (UTC+7 fixed).
 *  - this_week = today + remaining days until Sunday (so it never recreates
 *    yesterday). If today is Sunday, span = just today.
 *  - All events get source='quick_block' so the recurring template (CP5) can
 *    skip them when reapplying.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { getViewerUserId, transformForViewer } from "@/lib/calendar";
import type { TablesInsert } from "@/types/database";

export const dynamic = "force-dynamic";

const PERIOD_MINUTES: Record<string, { start: number; end: number }> = {
  morning:   { start: 8  * 60, end: 12 * 60 },
  afternoon: { start: 12 * 60, end: 17 * 60 },
  evening:   { start: 17 * 60, end: 21 * 60 },
  late:      { start: 21 * 60, end: 24 * 60 },
  all_day:   { start: 8  * 60, end: 24 * 60 },
};

/** Compute the VN-local midnight ISO for an absolute day offset from "today VN". */
function vnDayStartIso(dayOffset: number): string {
  // "Now in VN" → strip to YYYY-MM-DD → add offset days → reinterpret as VN midnight
  const nowVn = new Date(Date.now() + 7 * 3_600_000);
  const dayStartVnMs = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate() + dayOffset);
  // Convert VN midnight back to UTC (subtract 7h)
  return new Date(dayStartVnMs - 7 * 3_600_000).toISOString();
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const span = body.span;
  const period = body.period;

  if (!["today", "tomorrow", "this_week"].includes(span)) {
    return NextResponse.json({ error: "invalid span" }, { status: 400 });
  }

  // Resolve period to [startMin, endMin] in local minutes-from-midnight.
  let startMin: number;
  let endMin: number;
  if (period === "custom") {
    const sm = body.custom?.start_minute;
    const em = body.custom?.end_minute;
    if (typeof sm !== "number" || typeof em !== "number" || sm < 0 || em > 1440 || em <= sm) {
      return NextResponse.json({ error: "invalid custom range" }, { status: 400 });
    }
    startMin = sm;
    endMin = em;
  } else if (PERIOD_MINUTES[period]) {
    startMin = PERIOD_MINUTES[period].start;
    endMin = PERIOD_MINUTES[period].end;
  } else {
    return NextResponse.json({ error: "invalid period" }, { status: 400 });
  }

  // Day offsets to apply.
  const offsets: number[] = [];
  if (span === "today") {
    offsets.push(0);
  } else if (span === "tomorrow") {
    offsets.push(1);
  } else {
    // this_week: today through next Sunday inclusive.
    const nowVn = new Date(Date.now() + 7 * 3_600_000);
    const dow = nowVn.getUTCDay(); // 0=Sun, 1=Mon, … 6=Sat
    const daysUntilSunday = dow === 0 ? 0 : 7 - dow;
    for (let i = 0; i <= daysUntilSunday; i++) offsets.push(i);
  }

  // Build inserts.
  const rows: TablesInsert<"calendar_events">[] = offsets.map((off) => {
    const dayStart = vnDayStartIso(off);
    return {
      owner: viewerId,
      start_at: addMinutesIso(dayStart, startMin),
      end_at:   addMinutesIso(dayStart, endMin),
      source: "quick_block",
      share_details: false,
    };
  });

  const supabase = createTypedServerClient();
  const { data: inserted, error } = await supabase
    .from("calendar_events")
    .insert(rows)
    .select("*");

  if (error || !inserted) {
    console.error("[calendar/quick-block]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    events: inserted.map((e) => transformForViewer(e, viewerId)),
  });
}

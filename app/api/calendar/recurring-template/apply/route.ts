/**
 * POST /api/calendar/recurring-template/apply
 *
 * Body: { monday: "YYYY-MM-DD" }  — VN-anchored Monday of the target week.
 * Idempotent: deletes prior recurring_template events for this user in that
 * week, then inserts fresh ones per the current template jsonb.
 *
 * Returns { inserted, deleted }.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { applyTemplateToWeek } from "@/lib/recurring-template";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const monday = body.monday;
  if (typeof monday !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(monday)) {
    return NextResponse.json({ error: "monday must be YYYY-MM-DD" }, { status: 400 });
  }

  const supabase = createTypedServerClient();
  const { data: tpl } = await supabase
    .from("recurring_schedule_template")
    .select("template")
    .eq("user_id", viewerId)
    .maybeSingle();

  if (!tpl) {
    return NextResponse.json({ error: "no template saved yet" }, { status: 404 });
  }

  try {
    const result = await applyTemplateToWeek(
      supabase,
      viewerId,
      tpl.template as { start_minute: number; end_minute: number }[][],
      monday
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error("[recurring-template/apply]", e);
    return NextResponse.json({ error: "apply failed" }, { status: 500 });
  }
}

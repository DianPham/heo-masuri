/**
 * /api/calendar/recurring-template
 *
 * Blueprint §6.6. Per-user recurring schedule template.
 *
 * GET → { template: TemplateShape, enabled: boolean }
 *       template is a 7-element array (Mon=0 … Sun=6), each element an array
 *       of { start_minute, end_minute } ranges in [0, 1440].
 *       If the user has no row yet, returns a default empty template.
 *
 * PUT body { template, enabled? }
 *       Upserts the row. Validates bounds and end>start per range.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

type Range = { start_minute: number; end_minute: number };
type TemplateShape = Range[][];

const EMPTY_TEMPLATE: TemplateShape = [[], [], [], [], [], [], []];

function isValidTemplate(t: unknown): t is TemplateShape {
  if (!Array.isArray(t) || t.length !== 7) return false;
  for (const day of t) {
    if (!Array.isArray(day)) return false;
    for (const r of day) {
      if (
        !r ||
        typeof r !== "object" ||
        typeof (r as Range).start_minute !== "number" ||
        typeof (r as Range).end_minute !== "number"
      ) return false;
      const { start_minute, end_minute } = r as Range;
      if (start_minute < 0 || start_minute >= 1440) return false;
      if (end_minute <= start_minute || end_minute > 1440) return false;
    }
  }
  return true;
}

export async function GET() {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createTypedServerClient();
  const { data } = await supabase
    .from("recurring_schedule_template")
    .select("template, enabled")
    .eq("user_id", viewerId)
    .maybeSingle();

  return NextResponse.json({
    template: (data?.template as TemplateShape | null) ?? EMPTY_TEMPLATE,
    enabled: data?.enabled ?? false,
  });
}

export async function PUT(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!isValidTemplate(body.template)) {
    return NextResponse.json({ error: "invalid template" }, { status: 400 });
  }
  const enabled = body.enabled === true;

  const supabase = createTypedServerClient();
  const { error } = await supabase
    .from("recurring_schedule_template")
    .upsert(
      {
        user_id: viewerId,
        template: body.template,
        enabled,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[recurring-template PUT]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

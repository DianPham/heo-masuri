/**
 * /api/calendar/events
 *
 * GET  ?from=<iso>&to=<iso>  → all events in [from, to) for BOTH users in the
 *                              pair, filtered by transformForViewer so the
 *                              partner's private details are stripped.
 * POST { start_at, end_at, title?, note?, emoji?, share_details?, source? }
 *                              → create a single event owned by the viewer.
 *
 * Auth: requires soft-gate cookie. Read endpoint allows either user; write
 * endpoint only creates events owned by the viewer.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import {
  getViewerUserId,
  transformForViewer,
  type CalendarEventRow,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

const SOURCE_VALUES = ["manual", "recurring_template", "date", "quick_block"] as const;
type Source = (typeof SOURCE_VALUES)[number];

function validIso(s: unknown): s is string {
  return typeof s === "string" && !isNaN(new Date(s).getTime());
}

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!validIso(from) || !validIso(to)) {
    return NextResponse.json({ error: "from and to must be valid ISO timestamps" }, { status: 400 });
  }

  const supabase = createTypedServerClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("start_at", from)
    .lt("start_at", to)
    .order("start_at", { ascending: true });

  if (error) {
    console.error("[calendar/events GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []).map((e: CalendarEventRow) => transformForViewer(e, viewerId));
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Validate
  if (!validIso(body.start_at) || !validIso(body.end_at)) {
    return NextResponse.json({ error: "start_at and end_at required ISO" }, { status: 400 });
  }
  if (new Date(body.end_at) <= new Date(body.start_at)) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  const source: Source = SOURCE_VALUES.includes(body.source as Source)
    ? (body.source as Source)
    : "manual";

  const supabase = createTypedServerClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      owner: viewerId,
      start_at: body.start_at,
      end_at: body.end_at,
      title: typeof body.title === "string" ? body.title.slice(0, 200) : null,
      note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      emoji: typeof body.emoji === "string" ? body.emoji.slice(0, 16) : null,
      share_details: body.share_details === true,
      source,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[calendar/events POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: transformForViewer(data, viewerId) });
}

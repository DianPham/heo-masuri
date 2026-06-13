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

  const insertTitle = typeof body.title === "string" ? body.title.slice(0, 200) : null;
  const insertNote = typeof body.note === "string" ? body.note.slice(0, 1000) : null;
  const insertEmoji = typeof body.emoji === "string" ? body.emoji.slice(0, 16) : null;
  const insertShare = body.share_details === false ? false : true;

  const supabase = createTypedServerClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      owner: viewerId,
      start_at: body.start_at,
      end_at: body.end_at,
      title: insertTitle,
      note: insertNote,
      emoji: insertEmoji,
      // share_details default flipped to true (see migration 019).
      // Explicit false still wins so users who turn it off keep privacy.
      share_details: insertShare,
      source,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[calendar/events POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-merge adjacent fragments owned by the viewer that share identical
  // title/note/emoji/source. Lets a "click to split then drag to refill"
  // sequence reconcile into a single event instead of leaving 2–3 fragments.
  const merged = await maybeMergeAdjacent(supabase, data, viewerId);

  return NextResponse.json({ event: transformForViewer(merged, viewerId) });
}

async function maybeMergeAdjacent(
  supabase: ReturnType<typeof createTypedServerClient>,
  inserted: CalendarEventRow,
  viewerId: string
): Promise<CalendarEventRow> {
  // Candidates: same owner, identical content, end_at == inserted.start_at OR
  // start_at == inserted.end_at. We treat title/note/emoji NULL as matching NULL.
  const { data: neighbours } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("owner", viewerId)
    .eq("source", inserted.source)
    .or(`end_at.eq.${inserted.start_at},start_at.eq.${inserted.end_at}`);

  const sameContent = (e: CalendarEventRow) =>
    e.id !== inserted.id &&
    (e.title ?? null) === (inserted.title ?? null) &&
    (e.note ?? null) === (inserted.note ?? null) &&
    (e.emoji ?? null) === (inserted.emoji ?? null) &&
    e.share_details === inserted.share_details;

  const matches = (neighbours ?? []).filter(sameContent);
  if (matches.length === 0) return inserted;

  // Expand the inserted row to swallow the matches; delete them after.
  let start = new Date(inserted.start_at).getTime();
  let end = new Date(inserted.end_at).getTime();
  for (const m of matches) {
    start = Math.min(start, new Date(m.start_at).getTime());
    end = Math.max(end, new Date(m.end_at).getTime());
  }

  const { data: updated, error: updErr } = await supabase
    .from("calendar_events")
    .update({
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
    })
    .eq("id", inserted.id)
    .select("*")
    .single();
  if (updErr || !updated) {
    console.error("[calendar/events merge-update]", updErr);
    return inserted;
  }

  await supabase
    .from("calendar_events")
    .delete()
    .in("id", matches.map((m) => m.id));

  return updated;
}

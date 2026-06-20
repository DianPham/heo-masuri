/**
 * /api/dates/scheduled/[id]
 *
 * GET   → fetch one scheduled_dates row (both users may read)
 * PATCH → update outline_snapshot / itinerary / status / title / dress_code* /
 *         start_at / end_at. Mirrors title + time to the linked calendar_events
 *         rows (source='date', source_ref=id) so the calendar block stays
 *         accurate. Broadcasts a realtime event so the partner's plan view
 *         updates without refresh.
 * DELETE→ remove (creator only) + clean up paired calendar_events.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

const STATUSES = ["planning", "ready", "done", "cancelled"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scheduled_dates").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ date: data });
}

function validIso(s: unknown): s is string {
  return typeof s === "string" && !isNaN(new Date(s).getTime());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.outline_template !== undefined) update.outline_template = body.outline_template;
  if (body.outline_snapshot !== undefined) update.outline_snapshot = body.outline_snapshot;
  if (body.itinerary !== undefined) update.itinerary = body.itinerary;
  if (body.title !== undefined) update.title = body.title === null ? null : String(body.title).slice(0, 200);
  if (body.dress_code !== undefined) {
    update.dress_code = body.dress_code === null ? null : String(body.dress_code).slice(0, 200);
  }
  if (body.dress_code_emoji !== undefined) {
    update.dress_code_emoji = body.dress_code_emoji === null ? null : String(body.dress_code_emoji).slice(0, 16);
  }
  if (body.start_at !== undefined) {
    if (!validIso(body.start_at)) {
      return NextResponse.json({ error: "invalid start_at" }, { status: 400 });
    }
    update.start_at = body.start_at;
  }
  if (body.end_at !== undefined) {
    if (!validIso(body.end_at)) {
      return NextResponse.json({ error: "invalid end_at" }, { status: 400 });
    }
    update.end_at = body.end_at;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scheduled_dates").update(update).eq("id", id).select("*").single();
  if (error || !data) {
    console.error("[scheduled PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }

  // Mirror title + time + emoji onto paired calendar_events rows when those
  // fields change so the calendar block stays in sync.
  const mirror: Record<string, unknown> = {};
  if (update.title !== undefined) mirror.title = update.title ?? "Hẹn hò 💕";
  if (update.dress_code_emoji !== undefined) {
    mirror.emoji = update.dress_code_emoji ?? "💕";
  }
  if (update.start_at !== undefined) mirror.start_at = update.start_at;
  if (update.end_at !== undefined) mirror.end_at = update.end_at;
  if (Object.keys(mirror).length > 0) {
    await supabase
      .from("calendar_events")
      .update(mirror)
      .eq("source", "date")
      .eq("source_ref", id);
  }

  // Realtime broadcast — partner's PlanShell subscribes to scheduled_date:{id}.
  try {
    const channel = supabase.channel(`scheduled_date:${id}`);
    await channel.send({
      type: "broadcast",
      event: "update",
      payload: { id, by: viewerId, fields: Object.keys(update) },
    });
    await supabase.removeChannel(channel);
  } catch (e) {
    console.error("[scheduled PATCH realtime]", e);
  }

  // Notify partner only on meaningful changes — NOT on collaborative outline /
  // itinerary edits (those are already live-synced via the channel above and
  // would spam on every keystroke-level candidate add).
  const meaningful =
    update.status !== undefined ||
    update.title !== undefined ||
    update.start_at !== undefined ||
    update.end_at !== undefined ||
    update.dress_code !== undefined ||
    update.dress_code_emoji !== undefined;
  if (meaningful) {
    const planTitle = (data.title as string | null) ?? "buổi hẹn";
    const statusChanged = update.status !== undefined;
    await notifyPartner({
      actorId: viewerId,
      prefKey: "date_planning_enabled",
      build: (name) => ({
        push: {
          title: statusChanged && update.status === "cancelled"
            ? `${name} huỷ một buổi hẹn`
            : `${name} cập nhật kế hoạch hẹn ✏️`,
          body: planTitle,
          url: `/dates/plan/${id}`,
          tag: "date-plan",
        },
        activity: {
          icon: statusChanged && update.status === "cancelled" ? "❌" : "✏️",
          message:
            statusChanged && update.status === "cancelled"
              ? `${name} huỷ buổi hẹn: ${planTitle}`
              : `${name} sửa kế hoạch: ${planTitle}`,
          url: `/dates/plan/${id}`,
        },
      }),
    });
  }

  return NextResponse.json({ date: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { data: row } = await supabase
    .from("scheduled_dates").select("created_by, title").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.created_by !== viewerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Drop paired calendar events first (FK on scheduled_dates.calendar_event_id
  // is SET NULL, so this is safe in either order — we just don't want orphans).
  await supabase
    .from("calendar_events")
    .delete()
    .eq("source", "date")
    .eq("source_ref", id);

  const { error } = await supabase.from("scheduled_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const planTitle = (row.title as string | null) ?? "buổi hẹn";
  await notifyPartner({
    actorId: viewerId,
    prefKey: "date_planning_enabled",
    build: (name) => ({
      push: { title: `${name} xoá một buổi hẹn`, body: planTitle, url: "/dates/plan", tag: "date-plan" },
      activity: { icon: "🗑️", message: `${name} xoá buổi hẹn: ${planTitle}`, url: "/dates/plan" },
    }),
  });

  return NextResponse.json({ ok: true });
}

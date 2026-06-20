/**
 * /api/dates/scheduled
 *
 * GET → list (default: all statuses; ?status= filters)
 * POST → create a planning session. Body:
 *        { start_at, end_at, title?, dress_code?, dress_code_emoji? }
 *
 * On POST we also:
 *   1) Insert a paired calendar_events row per user (source='date',
 *      source_ref=scheduled_date.id), so the time blocks out for both.
 *   2) Link scheduled_dates.calendar_event_id to the creator's row.
 *   3) Push a celebratory note to the partner (date_planning_enabled).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

const STATUSES = ["planning", "ready", "done", "cancelled"] as const;

function validIso(s: unknown): s is string {
  return typeof s === "string" && !isNaN(new Date(s).getTime());
}

function vnDayLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(new Date(iso));
  } catch {
    return "hôm sau";
  }
}

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const upcomingOnly = req.nextUrl.searchParams.get("upcoming") === "1";
  const supabase = createServerClient();
  let q = supabase
    .from("scheduled_dates")
    .select("*")
    .order("start_at", { ascending: true });
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  if (upcomingOnly) q = q.gte("end_at", new Date().toISOString());
  const { data, error } = await q;
  if (error) {
    console.error("[scheduled GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ dates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!validIso(body.start_at) || !validIso(body.end_at)) {
    return NextResponse.json({ error: "start_at and end_at required ISO" }, { status: 400 });
  }
  if (new Date(body.end_at) <= new Date(body.start_at)) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) || null : null;
  const dressCode =
    typeof body.dress_code === "string" ? body.dress_code.trim().slice(0, 200) || null : null;
  const dressCodeEmoji =
    typeof body.dress_code_emoji === "string"
      ? body.dress_code_emoji.trim().slice(0, 16) || null
      : null;

  const supabase = createServerClient();

  // 1) Insert the scheduled_dates row.
  const { data: dateRow, error: dateErr } = await supabase
    .from("scheduled_dates")
    .insert({
      created_by: viewerId,
      start_at: body.start_at,
      end_at: body.end_at,
      title,
      dress_code: dressCode,
      dress_code_emoji: dressCodeEmoji,
      status: "planning",
    })
    .select("*")
    .single();
  if (dateErr || !dateRow) {
    console.error("[scheduled POST]", dateErr);
    return NextResponse.json({ error: dateErr?.message ?? "insert failed" }, { status: 500 });
  }

  // 2) Fetch both users so we can mirror onto each calendar.
  const { data: users } = await supabase.from("users").select("id, slug");
  const all = (users ?? []) as { id: string; slug: string }[];
  const viewer = all.find((u) => u.id === viewerId);
  const partner = all.find((u) => u.id !== viewerId);

  const calendarTitle = title ?? "Hẹn hò 💕";
  const calendarEmoji = dressCodeEmoji ?? "💕";

  const eventRowsToInsert = all.map((u) => ({
    owner: u.id,
    start_at: body.start_at,
    end_at: body.end_at,
    title: calendarTitle,
    note: null,
    emoji: calendarEmoji,
    source: "date" as const,
    source_ref: dateRow.id,
    share_details: true,
  }));

  let creatorEventId: string | null = null;
  if (eventRowsToInsert.length > 0) {
    const { data: eventsInserted, error: eventsErr } = await supabase
      .from("calendar_events")
      .insert(eventRowsToInsert)
      .select("id, owner");
    if (eventsErr) {
      console.error("[scheduled POST calendar mirror]", eventsErr);
      // Non-fatal: scheduled date still exists, partner will see it on /dates/plan.
    } else if (eventsInserted) {
      const mine = (eventsInserted as { id: string; owner: string }[]).find(
        (e) => e.owner === viewerId
      );
      if (mine) {
        creatorEventId = mine.id;
        await supabase
          .from("scheduled_dates")
          .update({ calendar_event_id: mine.id })
          .eq("id", dateRow.id);
      }
    }
  }

  // 3) Notify partner (push + in-app) with celebratory copy.
  if (partner) {
    const dayLabel = vnDayLabel(body.start_at);
    void viewer; // partner naming handled by notifyPartner
    await notifyPartner({
      actorId: viewerId,
      prefKey: "date_planning_enabled",
      build: (name) => ({
        push: {
          title: `${name} lên kế hoạch cho ${dayLabel} 💕`,
          body: title ?? "Mở app để cùng lên kế hoạch nha 💕",
          url: `/dates/plan/${dateRow.id}`,
          tag: "date-plan",
        },
        activity: {
          icon: "📅",
          message: `${name} lên kế hoạch hẹn ${dayLabel}`,
          url: `/dates/plan/${dateRow.id}`,
        },
      }),
    });
  }

  return NextResponse.json({
    date: { ...dateRow, calendar_event_id: creatorEventId },
  });
}

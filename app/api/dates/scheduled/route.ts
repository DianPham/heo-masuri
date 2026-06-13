/**
 * /api/dates/scheduled
 *
 * GET → list (default: status='planning' OR 'ready' for either user)
 * POST → create a planning session. Body: { start_at, end_at, title? }
 *
 * CP10 will add dress_code, dress_code_emoji, outline_template, and the
 * calendar_event_id wiring.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const STATUSES = ["planning","ready","done","cancelled"] as const;

function validIso(s: unknown): s is string {
  return typeof s === "string" && !isNaN(new Date(s).getTime());
}

export async function GET(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  const supabase = createServerClient();
  let q = supabase
    .from("scheduled_dates")
    .select("*")
    .order("start_at", { ascending: true });
  if (status && (STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
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

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("scheduled_dates")
    .insert({
      created_by: viewerId,
      start_at: body.start_at,
      end_at: body.end_at,
      title,
      status: "planning",
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[scheduled POST]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }
  return NextResponse.json({ date: data });
}

/**
 * /api/dates/scheduled/[id]
 *
 * GET   → fetch one scheduled_dates row (both users may read)
 * PATCH → update outline_snapshot / itinerary / status / title (any user)
 * DELETE→ remove (creator only)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const STATUSES = ["planning","ready","done","cancelled"] as const;

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
    .from("scheduled_dates").select("created_by").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.created_by !== viewerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { error } = await supabase.from("scheduled_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

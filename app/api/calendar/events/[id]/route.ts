/**
 * /api/calendar/events/[id]
 *
 * PATCH  → update fields. Only the owner can update.
 * DELETE → hard delete. Only the owner can delete.
 *
 * Body for PATCH: any subset of
 *   { start_at, end_at, title, note, emoji, share_details }
 * Pass explicit null to clear a nullable field.
 */
import { NextRequest, NextResponse } from "next/server";
import { createTypedServerClient } from "@/lib/supabase/server";
import { getViewerUserId, transformForViewer } from "@/lib/calendar";
import type { TablesUpdate } from "@/types/database";

export const dynamic = "force-dynamic";

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

  // Verify ownership first.
  const supabase = createTypedServerClient();
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("owner, start_at, end_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.owner !== viewerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Build update
  const update: TablesUpdate<"calendar_events"> = {};

  if (body.start_at !== undefined) {
    if (!validIso(body.start_at)) return NextResponse.json({ error: "invalid start_at" }, { status: 400 });
    update.start_at = body.start_at;
  }
  if (body.end_at !== undefined) {
    if (!validIso(body.end_at)) return NextResponse.json({ error: "invalid end_at" }, { status: 400 });
    update.end_at = body.end_at;
  }
  // Cross-validate when one or both timestamps changed.
  const newStart = (update.start_at ?? existing.start_at) as string;
  const newEnd = (update.end_at ?? existing.end_at) as string;
  if (new Date(newEnd) <= new Date(newStart)) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  if (body.title !== undefined) {
    update.title = body.title === null ? null : String(body.title).slice(0, 200);
  }
  if (body.note !== undefined) {
    update.note = body.note === null ? null : String(body.note).slice(0, 1000);
  }
  if (body.emoji !== undefined) {
    update.emoji = body.emoji === null ? null : String(body.emoji).slice(0, 16);
  }
  if (body.share_details !== undefined) {
    update.share_details = body.share_details === true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("calendar_events")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !updated) {
    console.error("[calendar/events PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }

  return NextResponse.json({ event: transformForViewer(updated, viewerId) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createTypedServerClient();

  // Owner check
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("owner")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.owner !== viewerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) {
    console.error("[calendar/events DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

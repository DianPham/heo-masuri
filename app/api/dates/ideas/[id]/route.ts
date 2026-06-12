/**
 * /api/dates/ideas/[id]
 * PATCH  → update any subset of fields (including `archived=true` to soft-archive)
 * DELETE → hard delete (rarely used; archive is the soft path)
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const SLOT_TYPES = ["eat","drink","activity","walk","movie","drive","home","other"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.url !== undefined) update.url = body.url === null ? null : String(body.url).slice(0, 2000);
  if (body.title !== undefined) update.title = body.title === null ? null : String(body.title).slice(0, 200);
  if (body.description !== undefined) update.description = body.description === null ? null : String(body.description).slice(0, 1000);
  if (body.notes !== undefined) update.notes = body.notes === null ? null : String(body.notes).slice(0, 500);
  if (body.thumbnail_url !== undefined) update.thumbnail_url = body.thumbnail_url === null ? null : String(body.thumbnail_url).slice(0, 2000);
  if (body.slot_type !== undefined) {
    if (body.slot_type !== null && !SLOT_TYPES.includes(body.slot_type)) {
      return NextResponse.json({ error: "invalid slot_type" }, { status: 400 });
    }
    update.slot_type = body.slot_type;
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return NextResponse.json({ error: "tags must be array" }, { status: 400 });
    update.tags = body.tags
      .filter((x: unknown): x is string => typeof x === "string")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (body.archived !== undefined) update.archived = body.archived === true;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("date_ideas")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[dates/ideas PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }
  return NextResponse.json({ idea: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createServerClient();
  const { error } = await supabase.from("date_ideas").delete().eq("id", id);
  if (error) {
    console.error("[dates/ideas DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

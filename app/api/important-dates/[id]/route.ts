/**
 * /api/important-dates/[id]
 * PATCH  → update any subset of fields
 * DELETE → remove
 *
 * Both users may edit any row (shared resource per blueprint §6.7).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";
import { notifyPartner } from "@/lib/notify";

export const dynamic = "force-dynamic";

const KINDS = ["reunion", "anniversary", "monthiversary", "birthday_heo", "birthday_masuri", "other"] as const;
const RECURRENCES = ["none", "yearly", "monthly"] as const;

function validDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
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

  if (body.label_vi !== undefined) {
    if (typeof body.label_vi !== "string" || !body.label_vi.trim()) {
      return NextResponse.json({ error: "label_vi blank" }, { status: 400 });
    }
    update.label_vi = body.label_vi.trim().slice(0, 100);
  }
  if (body.label_en !== undefined) {
    if (typeof body.label_en !== "string" || !body.label_en.trim()) {
      return NextResponse.json({ error: "label_en blank" }, { status: 400 });
    }
    update.label_en = body.label_en.trim().slice(0, 100);
  }
  if (body.target_date !== undefined) {
    if (!validDate(body.target_date)) {
      return NextResponse.json({ error: "invalid target_date" }, { status: 400 });
    }
    update.target_date = body.target_date;
  }
  if (body.kind !== undefined) {
    if (!KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "invalid kind" }, { status: 400 });
    }
    update.kind = body.kind;
  }
  if (body.recurrence !== undefined) {
    if (!RECURRENCES.includes(body.recurrence)) {
      return NextResponse.json({ error: "invalid recurrence" }, { status: 400 });
    }
    update.recurrence = body.recurrence;
  }
  if (body.emoji !== undefined) {
    update.emoji = body.emoji === null ? null : String(body.emoji).slice(0, 16);
  }
  if (body.show_on_home !== undefined) {
    update.show_on_home = body.show_on_home === true;
  }
  if (body.is_current !== undefined) {
    update.is_current = body.is_current === true;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("important_dates")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[important-dates PATCH]", error);
    return NextResponse.json({ error: error?.message ?? "update failed" }, { status: 500 });
  }

  const label = (data.label_vi as string | null) ?? "ngày đặc biệt";
  await notifyPartner({
    actorId: viewerId,
    prefKey: "important_date_enabled",
    build: (name) => ({
      push: { title: `${name} chỉnh một ngày đặc biệt ✏️`, body: label, url: "/calendar/important-dates", tag: "important-date" },
      activity: { icon: (data.emoji as string | null) || "⭐", message: `${name} chỉnh ngày: ${label}`, url: "/calendar/important-dates" },
    }),
  });

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
  const { data: existing } = await supabase
    .from("important_dates").select("label_vi, emoji").eq("id", id).maybeSingle();
  const { error } = await supabase.from("important_dates").delete().eq("id", id);
  if (error) {
    console.error("[important-dates DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing) {
    const label = (existing.label_vi as string | null) ?? "ngày đặc biệt";
    await notifyPartner({
      actorId: viewerId,
      prefKey: "important_date_enabled",
      build: (name) => ({
        push: { title: `${name} xoá một ngày đặc biệt`, body: label, url: "/calendar/important-dates", tag: "important-date" },
        activity: { icon: "🗑️", message: `${name} xoá ngày: ${label}`, url: "/calendar/important-dates" },
      }),
    });
  }

  return NextResponse.json({ ok: true });
}

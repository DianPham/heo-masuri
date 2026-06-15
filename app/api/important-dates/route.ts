/**
 * /api/important-dates
 * GET  → { dates: ImportantDate[] } sorted by created_at desc
 * POST → create a new row (service role; both Heo and Masuri may add)
 *
 * Blueprint §6.7.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getViewerUserId } from "@/lib/calendar";

export const dynamic = "force-dynamic";

const KINDS = ["reunion", "anniversary", "monthiversary", "birthday_heo", "birthday_masuri", "other"] as const;
const RECURRENCES = ["none", "yearly", "monthly"] as const;

function validDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET() {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("important_dates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[important-dates GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ dates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const viewerId = await getViewerUserId();
  if (!viewerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { label_vi, label_en, target_date, kind, recurrence, emoji, show_on_home } = body;

  if (typeof label_vi !== "string" || !label_vi.trim()) {
    return NextResponse.json({ error: "label_vi required" }, { status: 400 });
  }
  if (typeof label_en !== "string" || !label_en.trim()) {
    return NextResponse.json({ error: "label_en required" }, { status: 400 });
  }
  if (!validDate(target_date)) {
    return NextResponse.json({ error: "target_date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  const r = recurrence ?? "none";
  if (!RECURRENCES.includes(r)) {
    return NextResponse.json({ error: "invalid recurrence" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("important_dates")
    .insert({
      label_vi: label_vi.trim().slice(0, 100),
      label_en: label_en.trim().slice(0, 100),
      target_date,
      kind,
      recurrence: r,
      is_current: true,
      emoji: typeof emoji === "string" ? emoji.slice(0, 16) : null,
      show_on_home: show_on_home !== false,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[important-dates POST]", error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }
  return NextResponse.json({ date: data });
}

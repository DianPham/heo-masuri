/**
 * GET /api/notebook/today
 * Returns the active daily page for Heo (UTC+7), or null if none.
 *
 * Priority:
 *   1. Today's published page (normal case)
 *   2. Most recent unfinished published page from before today (carry-over)
 *      — shown when Heo rested / skipped and didn't complete the previous lesson
 *
 * Response: { page: DailyPage | null, completed: boolean, carry_over: boolean }
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { DailyPage } from "@/types/notebook";

export const dynamic = "force-dynamic";

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();

    if (!heo) {
      return NextResponse.json({ page: null, completed: false, carry_over: false });
    }

    const today = todayVN();

    // 1 — today's published page (normal path)
    const { data: todayRow, error: todayErr } = await supabase
      .from("daily_pages")
      .select("*")
      .eq("for_user", heo.id)
      .eq("scheduled_for", today)
      .eq("status", "published")
      .maybeSingle();

    if (todayErr) {
      if (todayErr.code === "42P01") return NextResponse.json({ page: null, completed: false, carry_over: false });
      console.error("[notebook/today]", todayErr);
      return NextResponse.json({ page: null, completed: false, carry_over: false });
    }

    if (todayRow) {
      return NextResponse.json({
        page: toPage(todayRow),
        completed: Boolean(todayRow.completed_at),
        carry_over: false,
      });
    }

    // 2 — carry-over: most recent unfinished published page before today
    const { data: carryRow } = await supabase
      .from("daily_pages")
      .select("*")
      .eq("for_user", heo.id)
      .eq("status", "published")
      .is("completed_at", null)
      .lt("scheduled_for", today)
      .order("scheduled_for", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (carryRow) {
      return NextResponse.json({
        page: toPage(carryRow),
        completed: false,
        carry_over: true,
      });
    }

    return NextResponse.json({ page: null, completed: false, carry_over: false });
  } catch (err) {
    console.error("[notebook/today]", err);
    return NextResponse.json({ page: null, completed: false, carry_over: false });
  }
}

function toPage(row: Record<string, unknown>): DailyPage {
  return {
    id: row.id as string,
    title_vi: row.title_vi as string,
    title_en: row.title_en as string,
    topic: row.topic as string,
    difficulty: row.difficulty as 1 | 2 | 3 | 4 | 5,
    cards: row.cards as DailyPage["cards"],
    scheduled_for: row.scheduled_for as string,
    completed_at: row.completed_at as string | null,
  };
}

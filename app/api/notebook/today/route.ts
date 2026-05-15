/**
 * GET /api/notebook/today
 * Returns today's published daily page for Heo (UTC+7), or null if none.
 * Response: { page: DailyPage | null, completed: boolean }
 *
 * Falls back gracefully if the daily_pages table doesn't exist yet (CP3 phase).
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

    // Get heo's user id
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();

    if (!heo) {
      return NextResponse.json({ page: null, completed: false });
    }

    const today = todayVN();

    const { data: row, error } = await supabase
      .from("daily_pages")
      .select("*")
      .eq("for_user", heo.id)
      .eq("scheduled_for", today)
      .eq("status", "published")
      .maybeSingle();

    // Table may not exist yet (pre-CP3 migration) — return null gracefully
    if (error) {
      if (error.code === "42P01") {
        // table does not exist
        return NextResponse.json({ page: null, completed: false });
      }
      console.error("[notebook/today]", error);
      return NextResponse.json({ page: null, completed: false });
    }

    if (!row) {
      return NextResponse.json({ page: null, completed: false });
    }

    const page: DailyPage = {
      id: row.id,
      title_vi: row.title_vi,
      title_en: row.title_en,
      topic: row.topic,
      difficulty: row.difficulty,
      cards: row.cards,
      scheduled_for: row.scheduled_for,
      completed_at: row.completed_at,
    };

    return NextResponse.json({
      page,
      completed: Boolean(row.completed_at),
    });
  } catch (err) {
    console.error("[notebook/today]", err);
    return NextResponse.json({ page: null, completed: false });
  }
}

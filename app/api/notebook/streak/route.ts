/**
 * GET /api/notebook/streak
 * Returns Heo's streak data. Readable by both heo and masuri.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) {
      return NextResponse.json({ current_streak: 0, longest_streak: 0, last_active_date: null });
    }

    const { data } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining, rest_replenished_at")
      .eq("user_id", heo.id)
      .maybeSingle();

    return NextResponse.json({
      current_streak: data?.current_streak ?? 0,
      longest_streak: data?.longest_streak ?? 0,
      last_active_date: data?.last_active_date ?? null,
      rest_days_remaining: data?.rest_days_remaining ?? 1,
      rest_replenished_at: data?.rest_replenished_at ?? null,
    });
  } catch (err) {
    console.error("[streak GET]", err);
    return NextResponse.json({
      current_streak: 0, longest_streak: 0, last_active_date: null,
      rest_days_remaining: 1, rest_replenished_at: null,
    });
  }
}

/**
 * POST /api/notebook/streak/bump
 * Called when Heo completes a daily page (CompletionCard mounts).
 * Idempotent — if already bumped today returns current streak unchanged.
 *
 * Streak logic (VN timezone, §12):
 *   last_active_date == today        → no-op (already_counted)
 *   last_active_date == yesterday    → streak + 1 (normal continue)
 *   2 days ago + rest_days > 0       → use 1 rest day, streak + 1 (streak_saved)
 *   otherwise                        → reset to 1 (never 0)
 *
 * Weekly replenishment: every 7 days, rest_days_remaining += 1 (up to MAX_REST_DAYS=2).
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_REST_DAYS = 2;
const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function yesterdayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
}

/** Days between two YYYY-MM-DD strings (positive = a is after b). */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "heo") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServerClient();
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const today = todayVN();
    const yesterday = yesterdayVN();

    // Read current row
    const { data: row } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining, rest_replenished_at")
      .eq("user_id", heo.id)
      .maybeSingle();

    // Already bumped today — idempotent
    if (row?.last_active_date === today) {
      return NextResponse.json({
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        rest_days_remaining: row.rest_days_remaining ?? 1,
        already_counted: true,
        streak_saved: false,
      });
    }

    const prev_streak = row?.current_streak ?? 0;
    const prev_longest = row?.longest_streak ?? 0;
    const last_date = row?.last_active_date ?? null;

    // ── Weekly replenishment ────────────────────────────────────────────
    let rest_days = row?.rest_days_remaining ?? 1;
    const lastReplenished = row?.rest_replenished_at
      ? new Date(row.rest_replenished_at).getTime()
      : 0;
    const shouldReplenish = Date.now() - lastReplenished >= SEVEN_DAYS_MS;
    const newReplenishedAt = shouldReplenish
      ? new Date().toISOString()
      : (row?.rest_replenished_at ?? new Date().toISOString());
    if (shouldReplenish) {
      rest_days = Math.min(rest_days + 1, MAX_REST_DAYS);
    }

    // ── Streak calculation ─────────────────────────────────────────────
    let new_streak: number;
    let streak_saved = false;

    if (!last_date) {
      // First ever completion
      new_streak = 1;
    } else if (last_date === yesterday) {
      // Perfect — continued yesterday
      new_streak = prev_streak + 1;
    } else if (daysBetween(today, last_date) === 2 && rest_days > 0) {
      // Missed exactly 1 day — rest day saves the streak
      rest_days -= 1;
      streak_saved = true;
      new_streak = prev_streak + 1;
    } else {
      // Gap too large or no rest days — reset (but never 0)
      new_streak = 1;
    }

    const new_longest = Math.max(prev_longest, new_streak);

    const { error } = await supabase
      .from("streaks")
      .upsert(
        {
          user_id: heo.id,
          current_streak: new_streak,
          longest_streak: new_longest,
          last_active_date: today,
          rest_days_remaining: rest_days,
          rest_replenished_at: newReplenishedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[streak bump]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");

    return NextResponse.json({
      current_streak: new_streak,
      longest_streak: new_longest,
      rest_days_remaining: rest_days,
      already_counted: false,
      streak_saved,
    });
  } catch (err) {
    console.error("[streak bump]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

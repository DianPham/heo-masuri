/**
 * POST /api/notebook/streak/use-rest
 * Heo presses "Heo nghỉ một chút 🌸" — marks today as a planned rest day.
 *
 * Effect:
 *   - Decrements rest_days_remaining by 1 (must have ≥ 1 to use)
 *   - Appends today to rest_days_used_at[]
 *   - Sets last_active_date = today so tomorrow the streak continues
 *   - Does NOT increment current_streak (a rest is not a study day)
 *
 * Idempotent: if last_active_date == today already, returns current state.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
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

    const { data: row } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining, rest_days_used_at")
      .eq("user_id", heo.id)
      .maybeSingle();

    // Idempotent — already rested or studied today
    if (row?.last_active_date === today) {
      return NextResponse.json({
        current_streak: row.current_streak,
        rest_days_remaining: row.rest_days_remaining ?? 0,
        already_used: true,
      });
    }

    const current_rest = row?.rest_days_remaining ?? 1; // default 1 if column not yet populated
    if (current_rest <= 0) {
      return NextResponse.json(
        { error: "Heo không còn ngày nghỉ nào nữa 🥺" },
        { status: 400 }
      );
    }

    const used_at: string[] = Array.isArray(row?.rest_days_used_at)
      ? [...row.rest_days_used_at, today]
      : [today];

    const { error } = await supabase
      .from("streaks")
      .upsert(
        {
          user_id: heo.id,
          current_streak: row?.current_streak ?? 0,
          longest_streak: row?.longest_streak ?? 0,
          last_active_date: today,        // keeps streak alive for tomorrow
          rest_days_remaining: current_rest - 1,
          rest_days_used_at: used_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("[use-rest]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");
    return NextResponse.json({
      current_streak: row?.current_streak ?? 0,
      rest_days_remaining: current_rest - 1,
      already_used: false,
    });
  } catch (err) {
    console.error("[use-rest]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

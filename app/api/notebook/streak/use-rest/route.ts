/**
 * POST /api/notebook/streak/use-rest
 * Heo presses "Heo nghỉ một chút 🌸" — marks today as a planned rest day.
 *
 * Effect:
 *   - Decrements rest_days_remaining by 1 (must have ≥ 1 to use)
 *   - Sets last_active_date = today so tomorrow the streak continues
 *   - Does NOT change current_streak
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

    // Only select the stable core columns — avoids schema-cache errors on newer columns
    const { data: row } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, last_active_date, rest_days_remaining")
      .eq("user_id", heo.id)
      .maybeSingle();

    // Idempotent — already rested or studied today
    if (row?.last_active_date === today) {
      return NextResponse.json({
        current_streak: row.current_streak ?? 0,
        rest_days_remaining: row.rest_days_remaining ?? 1,
        already_used: true,
      });
    }

    const current_streak = row?.current_streak ?? 0;
    const current_rest = row?.rest_days_remaining ?? 1;

    if (current_rest <= 0) {
      return NextResponse.json(
        { error: "Heo không còn ngày nghỉ nào nữa 🥺" },
        { status: 400 }
      );
    }

    const new_rest = current_rest - 1;
    const now = new Date().toISOString();

    let dbError;
    if (row) {
      // Row exists — only update the fields we care about
      const { error } = await supabase
        .from("streaks")
        .update({
          last_active_date: today,
          rest_days_remaining: new_rest,
          updated_at: now,
        })
        .eq("user_id", heo.id);
      dbError = error;
    } else {
      // No streak row yet — create one (keeps streak at 0, just marks today)
      const { error } = await supabase
        .from("streaks")
        .insert({
          user_id: heo.id,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: today,
          rest_days_remaining: new_rest,
          updated_at: now,
        });
      dbError = error;
    }

    if (dbError) {
      console.error("[use-rest]", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    revalidatePath("/heo/notebook");
    return NextResponse.json({
      current_streak,
      rest_days_remaining: new_rest,
      already_used: false,
    });
  } catch (err) {
    console.error("[use-rest]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

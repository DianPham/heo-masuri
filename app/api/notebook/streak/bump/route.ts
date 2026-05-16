/**
 * POST /api/notebook/streak/bump
 * Called when Heo completes a daily page (CompletionCard mounts).
 * Idempotent — if already bumped today returns current streak unchanged.
 *
 * Streak logic (VN timezone):
 *   last_active_date == today   → no-op
 *   last_active_date == yesterday → streak + 1
 *   else                        → reset to 1
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function todayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function yesterdayVN(): string {
  return new Date(Date.now() + 7 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
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
      .select("current_streak, longest_streak, last_active_date")
      .eq("user_id", heo.id)
      .maybeSingle();

    // Already bumped today — idempotent
    if (row?.last_active_date === today) {
      return NextResponse.json({
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        already_counted: true,
      });
    }

    const prev_streak = row?.current_streak ?? 0;
    const prev_longest = row?.longest_streak ?? 0;
    const last_date = row?.last_active_date ?? null;

    const new_streak = last_date === yesterday ? prev_streak + 1 : 1;
    const new_longest = Math.max(prev_longest, new_streak);

    const { error } = await supabase
      .from("streaks")
      .upsert(
        {
          user_id: heo.id,
          current_streak: new_streak,
          longest_streak: new_longest,
          last_active_date: today,
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
      already_counted: false,
    });
  } catch (err) {
    console.error("[streak bump]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

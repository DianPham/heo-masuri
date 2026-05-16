/**
 * POST /api/notebook/streak/grant-rest
 * Masuri gives Heo an extra rest day. Max 5 total.
 * Sends Heo a push notification.
 */
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_REST_DAYS = 5;

export async function POST() {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get("who")?.value !== "masuri") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServerClient();

    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: row } = await supabase
      .from("streaks")
      .select("current_streak, longest_streak, rest_days_remaining")
      .eq("user_id", heo.id)
      .maybeSingle();

    const current_rest = row?.rest_days_remaining ?? 1;

    if (current_rest >= MAX_REST_DAYS) {
      return NextResponse.json(
        { error: `Heo đã có ${current_rest} ngày nghỉ rồi — tối đa ${MAX_REST_DAYS} thôi nha 🌸` },
        { status: 400 }
      );
    }

    const new_rest = current_rest + 1;

    // Only update rest_days_remaining — don't touch last_active_date or streak counts
    let dbError;
    if (row) {
      const { error } = await supabase
        .from("streaks")
        .update({ rest_days_remaining: new_rest, updated_at: new Date().toISOString() })
        .eq("user_id", heo.id);
      dbError = error;
    } else {
      // No streak row yet — create a minimal one
      const { error } = await supabase
        .from("streaks")
        .insert({ user_id: heo.id, rest_days_remaining: new_rest, updated_at: new Date().toISOString() });
      dbError = error;
    }
    const error = dbError;

    if (error) {
      console.error("[grant-rest]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Push notification to Heo
    sendPushToUser(heo.id, {
      title: "Masuri tặng Heo một ngày nghỉ 🌸",
      body: `Heo đang có ${new_rest} ngày nghỉ rồi nha. Nhớ dùng khi cần nè 💕`,
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook`,
      tag: "grant-rest",
    });

    revalidatePath("/heo/notebook");
    revalidatePath("/masuri/notebook");

    return NextResponse.json({ rest_days_remaining: new_rest });
  } catch (err) {
    console.error("[grant-rest]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

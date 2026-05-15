/**
 * GET /api/cron/reminder
 * Vercel cron job — runs every hour.
 * Sends a daily reminder push to Heo if:
 *   - reminder_enabled = true
 *   - current VN hour matches reminder_time hour
 *   - hasn't already studied today (last_active_date != today)
 *
 * Secured by CRON_SECRET header (set in Vercel env).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    // Current VN hour (UTC+7)
    const nowVN = new Date(Date.now() + 7 * 3_600_000);
    const currentHour = nowVN.getUTCHours(); // already shifted to VN
    const todayVN = nowVN.toISOString().slice(0, 10);

    // Get heo user
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ sent: false, reason: "no heo user" });

    // Check prefs
    const { data: prefs } = await supabase
      .from("notebook_prefs")
      .select("reminder_enabled, reminder_time")
      .eq("user_id", heo.id)
      .maybeSingle();

    if (!prefs?.reminder_enabled || !prefs.reminder_time) {
      return NextResponse.json({ sent: false, reason: "reminder disabled" });
    }

    // reminder_time is stored as "HH:MM:SS" — check hour matches
    const reminderHour = parseInt(prefs.reminder_time.slice(0, 2), 10);
    if (reminderHour !== currentHour) {
      return NextResponse.json({ sent: false, reason: "not reminder hour" });
    }

    // Check if already studied today
    const { data: streak } = await supabase
      .from("streaks")
      .select("last_active_date")
      .eq("user_id", heo.id)
      .maybeSingle();

    if (streak?.last_active_date === todayVN) {
      return NextResponse.json({ sent: false, reason: "already studied today" });
    }

    // Send reminder
    await sendPushToUser(heo.id, {
      title: "Heo ơi, học tiếng Anh chưa? 📓",
      body: "Trang hôm nay đang chờ Heo nè! Học một chút thôi là xong 🌸",
      url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/heo/notebook/today`,
      tag: "reminder",
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[cron reminder]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * GET /api/cron/reminder
 * Vercel cron job — fires daily at 13:00 UTC (20:00 VN).
 * Sends a push reminder to Heo if:
 *   - reminder_enabled = true in notebook_prefs
 *   - hasn't already studied today (last_active_date != today)
 *
 * §13 — 3-day silence logic:
 *   Days 1–2 missed  → normal "Học nha!" reminder
 *   Days 3+  missed  → softer "Masuri nhớ Heo" message (lower pressure)
 *
 * Secured by CRON_SECRET header (set in Vercel env).
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const todayVN = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

    // Get heo user
    const { data: heo } = await supabase
      .from("users")
      .select("id")
      .eq("slug", "heo")
      .single();
    if (!heo) return NextResponse.json({ sent: false, reason: "no heo user" });

    // Check if reminder is enabled
    const { data: prefs } = await supabase
      .from("notebook_prefs")
      .select("daily_reminder_enabled")
      .eq("user_id", heo.id)
      .maybeSingle();

    if (!prefs?.daily_reminder_enabled) {
      return NextResponse.json({ sent: false, reason: "reminder disabled" });
    }

    // Skip if already studied today
    const { data: streak } = await supabase
      .from("streaks")
      .select("last_active_date")
      .eq("user_id", heo.id)
      .maybeSingle();

    if (streak?.last_active_date === todayVN) {
      return NextResponse.json({ sent: false, reason: "already studied today" });
    }

    // ── §13: 3-day silence logic ────────────────────────────────────
    const lastActive = streak?.last_active_date ?? null;
    const daysInactive = lastActive ? daysBetween(todayVN, lastActive) : null;

    // After 3+ days of no activity, switch to the softer "Masuri misses Heo" message
    const isLongSilence = daysInactive !== null && daysInactive >= 3;

    // ── §J3: Rotating normal reminder copy (5 variants, picks by weekday) ──
    // Deterministic — same day of the week always gets the same message,
    // so it rotates week-over-week without any randomness or DB state.
    const NORMAL_REMINDERS = [
      {
        title: "Heo ơi, học tiếng Anh chưa? 📓",
        body: "Trang hôm nay đang chờ Heo nè! Học một chút thôi là xong 🌸",
      },
      {
        title: "Đừng quên bài học hôm nay nha Heo ✨",
        body: "Chỉ cần vài phút thôi — Masuri tin Heo làm được 💕",
      },
      {
        title: "Streak của Heo đang chờ được giữ đó 🔥",
        body: "Vào học một chút là xong nha — Heo giỏi lắm 🌸",
      },
      {
        title: "Nhắc Heo nhẹ một cái 📖",
        body: "Bài học hôm nay ngắn lắm — vào xem thử nha Heo 🌷",
      },
      {
        title: "Masuri đang nghĩ đến Heo nè 💕",
        body: "Học một từ mới hôm nay đi Heo — nhỏ thôi cũng được 🌸",
      },
    ] as const;

    // getUTCDay() returns 0 (Sun) – 6 (Sat); mod 5 cycles through all 5 variants
    const dayIndex = new Date().getUTCDay() % NORMAL_REMINDERS.length;
    const normalReminder = NORMAL_REMINDERS[dayIndex];

    const notification = isLongSilence
      ? {
          title: "Masuri nhớ Heo nhiều lắm 💕",
          body: "Không cần học nhiều đâu nha — một từ thôi cũng được. Heo có thể làm được 🌸",
          url: `/heo/notebook/today`,
          tag: "reminder-gentle",
        }
      : {
          title: normalReminder.title,
          body: normalReminder.body,
          url: `/heo/notebook/today`,
          tag: "reminder",
        };

    await sendPushToUser(heo.id, notification);

    return NextResponse.json({ sent: true, isLongSilence, daysInactive });
  } catch (err) {
    console.error("[cron reminder]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
